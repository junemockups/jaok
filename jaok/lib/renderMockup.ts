import type { MockupConfig } from "./types";
import { coverCropToAspect, quadAspectRatio, warpImageToQuad } from "./compositor";
import { mockupAssetPath } from "./mockupAssetPath";

export interface AreaDesign {
  areaId: string;
  image: HTMLImageElement;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Renders the full mockup (background, warped designs, shadow/highlight
 * overlays) onto `canvas` in the PSD's original layer order. Areas without
 * an assigned design are skipped, so the raw mockup preview and the
 * "some areas filled, some not" partial-edit state both fall out of the
 * same code path.
 */
export async function renderMockup(
  canvas: HTMLCanvasElement,
  config: MockupConfig,
  designs: AreaDesign[]
): Promise<void> {
  canvas.width = config.canvas.width;
  canvas.height = config.canvas.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D context not available");

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const designByArea = new Map(designs.map((d) => [d.areaId, d.image]));

  for (const layer of config.layers) {
    if (layer.type === "image") {
      const img = await loadImage(mockupAssetPath(config.slug, layer.src));
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      continue;
    }

    // layer.type === "area"
    const design = designByArea.get(layer.id);
    if (!design) continue;

    const aspect = quadAspectRatio(layer.corners);
    const crop = coverCropToAspect(design.naturalWidth, design.naturalHeight, aspect);

    // Draw the cropped region of the design onto an offscreen canvas first,
    // since warpImageToQuad expects the *whole* source image to map onto
    // the destination quad.
    const offscreen = document.createElement("canvas");
    offscreen.width = crop.sw;
    offscreen.height = crop.sh;
    const offCtx = offscreen.getContext("2d");
    if (!offCtx) continue;
    offCtx.drawImage(
      design,
      crop.sx,
      crop.sy,
      crop.sw,
      crop.sh,
      0,
      0,
      crop.sw,
      crop.sh
    );

    warpImageToQuad(ctx, offscreen, crop.sw, crop.sh, layer.corners);
  }
}

/** Downscales + watermarks a canvas for the free preview download. */
export function renderWatermarkedPreview(
  source: HTMLCanvasElement,
  maxDimension = 1000
): HTMLCanvasElement {
  const scale = Math.min(1, maxDimension / Math.max(source.width, source.height));
  const out = document.createElement("canvas");
  out.width = Math.round(source.width * scale);
  out.height = Math.round(source.height * scale);
  const ctx = out.getContext("2d");
  if (!ctx) return out;

  ctx.drawImage(source, 0, 0, out.width, out.height);

  const fontSize = Math.max(14, Math.round(out.width / 22));
  ctx.font = `600 ${fontSize}px sans-serif`;
  ctx.textBaseline = "bottom";
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = Math.max(1, fontSize / 12);

  const text = "junemockups.com — Vorschau";
  const padding = fontSize * 0.8;
  ctx.strokeText(text, padding, out.height - padding);
  ctx.fillText(text, padding, out.height - padding);
  ctx.restore();

  // Diagonal repeated watermark so the preview can't be cleanly cropped.
  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = "#ffffff";
  ctx.font = `600 ${Math.round(fontSize * 1.4)}px sans-serif`;
  ctx.translate(out.width / 2, out.height / 2);
  ctx.rotate((-25 * Math.PI) / 180);
  const spacing = fontSize * 6;
  for (let y = -out.height; y < out.height; y += spacing) {
    for (let x = -out.width; x < out.width; x += spacing * 2.5) {
      ctx.fillText("JUNEMOCKUPS", x, y);
    }
  }
  ctx.restore();

  return out;
}

export function canvasToDownload(canvas: HTMLCanvasElement, filename: string): void {
  canvas.toBlob(
    (blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    },
    "image/png",
    1
  );
}
