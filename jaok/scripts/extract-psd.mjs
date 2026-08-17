#!/usr/bin/env node
// Reads a June Mockups PSD file and generates a ready-to-use mockup folder
// under public/mockups/<slug>/: one PNG per static layer (background,
// shadow/highlight overlays) plus config.json describing the full layer
// stack in PSD order, with smart-object layers turned into corner-pinned
// "area" entries the editor can warp customer designs into.
//
// Usage:
//   npm run extract-psd -- <path-to-file.psd> <slug> [--freebie] [--variant=<shopify_variant_id>] [--handle=<shopify_product_handle>]
//
// Notes on what this script infers vs. what still needs a human:
// - Layer names become area labels ("Vorderseite", "Rückseite", ...) —
//   rename layers in Photoshop for nicer labels, or edit config.json after.
// - Smart Object corner points come straight from the PSD's placed-layer
//   transform, so perspective/rotation already matches the photo.
// - Everything that isn't a smart object is exported as a flat PNG in its
//   original stacking position (background AND shadow/highlight layers
//   alike) — this only works because the mockups use no blend modes.
// - Price/product mapping (--variant/--handle) has to come from you; the
//   script can't guess which Shopify product a mockup belongs to.

import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { readPsd, initializeCanvas } from "ag-psd";
import { PNG } from "pngjs";
import sharp from "sharp";

// ag-psd always routes pixel-buffer allocation through a "canvas" even when
// useImageData is set (it just changes where the *result* is stored), so a
// minimal non-native stand-in is enough to keep everything on plain typed
// arrays — no need for the native 'canvas' package in this Node script.
class FakeCanvas {
  constructor(width, height) {
    this.width = width;
    this.height = height;
  }
  getContext() {
    return {
      createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
      putImageData: () => {},
      drawImage: () => {},
      getImageData: (_x, _y, w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
    };
  }
}

initializeCanvas(
  (width, height) => new FakeCanvas(width, height),
  () => new FakeCanvas(1, 1),
  (width, height) => ({ width, height, data: new Uint8ClampedArray(width * height * 4) })
);

const [, , inputPath, slugArg, ...flags] = process.argv;

if (!inputPath || !slugArg) {
  console.error("Usage: npm run extract-psd -- <path-to-file.psd> <slug> [--freebie]");
  process.exit(1);
}

const freebie = flags.includes("--freebie");

// License-tier variant IDs/handles differ per mockup and have to come from
// Shopify Admin, so this just scaffolds the 3 tiers with TODOs to fill in.
const defaultTiers = [
  { id: "standard", label: { de: "Standard", en: "Standard" }, productHandle: "TODO", variantId: "TODO" },
  { id: "extended", label: { de: "Extended", en: "Extended" }, productHandle: "TODO", variantId: "TODO" },
  { id: "commercial", label: { de: "Commercial", en: "Commercial" }, productHandle: "TODO", variantId: "TODO" },
];

const outDir = path.join(process.cwd(), "public", "mockups", slugArg);
mkdirSync(outDir, { recursive: true });

const buffer = readFileSync(inputPath);
const psd = readPsd(buffer, {
  useImageData: true,
  skipCompositeImageData: false,
  skipThumbnail: true,
  skipLinkedFilesData: true,
});

const canvasWidth = psd.width;
const canvasHeight = psd.height;

/** Flattens groups into a single stacking-order list, preserving ag-psd's order. */
function flatten(layers) {
  const out = [];
  for (const layer of layers ?? []) {
    if (layer.children) {
      out.push(...flatten(layer.children));
    } else {
      out.push(layer);
    }
  }
  return out;
}

// ag-psd's psd.children is already bottom-to-top (matches PSD's on-disk
// layer record order), which is exactly the order canvas compositing needs
// — confirmed empirically: reversing it here painted the opaque background
// layer last, hiding the customer's design entirely.
const bottomFirst = flatten(psd.children).filter((l) => !l.hidden);

/** Writes a layer's pixel data onto a full-canvas-sized transparent PNG. */
function writeLayerPng(layer, filename) {
  const png = new PNG({ width: canvasWidth, height: canvasHeight });
  png.data.fill(0);

  const imageData = layer.imageData;
  if (imageData) {
    const left = Math.max(0, Math.round(layer.left ?? 0));
    const top = Math.max(0, Math.round(layer.top ?? 0));
    for (let y = 0; y < imageData.height; y++) {
      const destY = top + y;
      if (destY < 0 || destY >= canvasHeight) continue;
      for (let x = 0; x < imageData.width; x++) {
        const destX = left + x;
        if (destX < 0 || destX >= canvasWidth) continue;
        const srcIdx = (y * imageData.width + x) * 4;
        const dstIdx = (destY * canvasWidth + destX) * 4;
        png.data[dstIdx] = imageData.data[srcIdx];
        png.data[dstIdx + 1] = imageData.data[srcIdx + 1];
        png.data[dstIdx + 2] = imageData.data[srcIdx + 2];
        png.data[dstIdx + 3] = imageData.data[srcIdx + 3];
      }
    }
  }

  writeFileSync(path.join(outDir, filename), PNG.sync.write(png));
}

let imageLayerCount = 0;
let areaCount = 0;
const configLayers = [];

for (const layer of bottomFirst) {
  const placed = layer.placedLayer;

  if (placed) {
    areaCount += 1;
    const id = `area-${areaCount}`;
    const corners = transformToCorners(placed.transform, layer);
    configLayers.push({
      type: "area",
      id,
      label: layer.name?.trim() || `Fläche ${areaCount}`,
      corners,
    });
    continue;
  }

  imageLayerCount += 1;
  const filename = `layer-${String(imageLayerCount).padStart(2, "0")}.png`;
  writeLayerPng(layer, filename);
  configLayers.push({ type: "image", src: filename });
}

/** `transform` is 8 numbers: 4 corner points (x,y) in document pixel space. */
function transformToCorners(transform, layer) {
  if (Array.isArray(transform) && transform.length >= 8) {
    const pts = [];
    for (let i = 0; i < 8; i += 2) pts.push([transform[i], transform[i + 1]]);
    return orderCornersClockwise(pts);
  }
  // Fallback: axis-aligned rectangle from the layer's bounding box.
  const { left = 0, top = 0, right = canvasWidth, bottom = canvasHeight } = layer;
  return [
    [left, top],
    [right, top],
    [right, bottom],
    [left, bottom],
  ];
}

/** Sorts 4 points into [top-left, top-right, bottom-right, bottom-left]. */
function orderCornersClockwise(points) {
  const cx = points.reduce((s, p) => s + p[0], 0) / points.length;
  const cy = points.reduce((s, p) => s + p[1], 0) / points.length;
  const withAngle = points.map((p) => ({
    p,
    angle: Math.atan2(p[1] - cy, p[0] - cx),
  }));
  withAngle.sort((a, b) => a.angle - b.angle);
  // atan2 sort starts at the point left of center on the top half (~-135°),
  // which is our top-left corner for a roughly rectangular quad.
  const ordered = withAngle.map((w) => w.p);
  const startIdx = ordered.reduce(
    (best, p, i, arr) => (p[0] + p[1] < arr[best][0] + arr[best][1] ? i : best),
    0
  );
  return [
    ordered[startIdx],
    ordered[(startIdx + 1) % 4],
    ordered[(startIdx + 2) % 4],
    ordered[(startIdx + 3) % 4],
  ];
}

// Thumbnail for the gallery: the full composite, downscaled + cropped to a square.
if (psd.imageData) {
  const compositePng = new PNG({ width: canvasWidth, height: canvasHeight });
  compositePng.data.set(psd.imageData.data);
  const compositeBuffer = PNG.sync.write(compositePng);
  await sharp(compositeBuffer)
    .resize(800, 800, { fit: "cover" })
    .jpeg({ quality: 85 })
    .toFile(path.join(outDir, "thumbnail.jpg"));
} else {
  console.warn("⚠️  Kein Composite-Bild in der PSD gefunden — thumbnail.jpg fehlt, bitte manuell ergänzen.");
}

const config = {
  slug: slugArg,
  title: { de: slugArg, en: slugArg },
  freebie,
  ...(freebie ? {} : { shopify: { tiers: defaultTiers } }),
  canvas: { width: canvasWidth, height: canvasHeight },
  layers: configLayers,
};

writeFileSync(path.join(outDir, "config.json"), JSON.stringify(config, null, 2));

console.log(`✅ ${slugArg}: ${imageLayerCount} Bild-Ebenen, ${areaCount} Fläche(n) → ${outDir}`);
console.log(`   Bitte "title" (de/en) in config.json noch von Hand eintragen.`);
if (!freebie) {
  console.log(`   Bitte "shopify.tiers[].productHandle" / "variantId" für Standard/Extended/Commercial noch eintragen.`);
}
