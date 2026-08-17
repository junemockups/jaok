#!/usr/bin/env node
// Creates a synthetic demo mockup (no real PSD needed) purely so the editor
// UI and warp compositor can be exercised end-to-end before the first real
// June Mockups PSD is available. Two areas + a soft shadow overlay, to
// mirror a "multiple surfaces" mockup.

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const slug = "demo-poster-duo";
const outDir = path.join(process.cwd(), "public", "mockups", slug);
mkdirSync(outDir, { recursive: true });

const W = 1600;
const H = 2000;

// Left frame: straight-on. Right frame: perspective-skewed, to demonstrate
// the corner-pin warp handling a non-rectangular placement.
const leftCorners = [
  [180, 260],
  [700, 260],
  [700, 1500],
  [180, 1500],
];
const rightCorners = [
  [920, 340],
  [1420, 300],
  [1450, 1440],
  [960, 1520],
];

const quad = (pts) => pts.map((p) => p.join(",")).join(" ");

const backgroundSvg = `
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${W}" height="${H}" fill="#e9e3da"/>
  <rect x="0" y="${H - 260}" width="${W}" height="260" fill="#cbbfa9"/>
  <polygon points="${quad(leftCorners)}" fill="#3a3733"/>
  <polygon points="${quad(rightCorners)}" fill="#3a3733"/>
</svg>`;

const shadowSvg = `
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="black" stop-opacity="0.35"/>
      <stop offset="35%" stop-color="black" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="g2" x1="1" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="black" stop-opacity="0.4"/>
      <stop offset="30%" stop-color="black" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <polygon points="${quad(leftCorners)}" fill="url(#g1)"/>
  <polygon points="${quad(rightCorners)}" fill="url(#g2)"/>
</svg>`;

await sharp(Buffer.from(backgroundSvg)).png().toFile(path.join(outDir, "layer-01.png"));
await sharp(Buffer.from(shadowSvg)).png().toFile(path.join(outDir, "layer-02.png"));
await sharp(Buffer.from(backgroundSvg))
  .resize(800, 800, { fit: "cover" })
  .jpeg({ quality: 85 })
  .toFile(path.join(outDir, "thumbnail.jpg"));

const config = {
  slug,
  title: { de: "Demo: Zwei Poster-Rahmen", en: "Demo: Two Poster Frames" },
  freebie: true,
  canvas: { width: W, height: H },
  layers: [
    { type: "image", src: "layer-01.png" },
    { type: "area", id: "area-1", label: "Linker Rahmen", corners: leftCorners },
    { type: "area", id: "area-2", label: "Rechter Rahmen (perspektivisch)", corners: rightCorners },
    { type: "image", src: "layer-02.png" },
  ],
};

writeFileSync(path.join(outDir, "config.json"), JSON.stringify(config, null, 2));
console.log(`✅ Demo-Mockup erzeugt: ${outDir}`);
