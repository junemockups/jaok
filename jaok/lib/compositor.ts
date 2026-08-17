import type { Point } from "./types";

/**
 * Warps `image` into the quadrilateral `dstCorners` on `ctx` (clockwise from
 * top-left) and composites it there. Perspective (non-affine) distortion
 * cannot be expressed with a single canvas transform, so the destination
 * quad is subdivided into a fine grid; each cell is small enough that an
 * affine (2-triangle) approximation is visually indistinguishable from a
 * true projective warp. This keeps everything on `drawImage`, so it stays
 * hardware-accelerated and needs no per-pixel JS loop.
 */
export function warpImageToQuad(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  imageWidth: number,
  imageHeight: number,
  dstCorners: [Point, Point, Point, Point],
  subdivisions = 24
): void {
  const [tl, tr, br, bl] = dstCorners;

  const lerp = (a: Point, b: Point, t: number): Point => [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
  ];

  const gridPoint = (u: number, v: number): Point => {
    const top = lerp(tl, tr, u);
    const bottom = lerp(bl, br, u);
    return lerp(top, bottom, v);
  };

  for (let row = 0; row < subdivisions; row++) {
    const v0 = row / subdivisions;
    const v1 = (row + 1) / subdivisions;
    for (let col = 0; col < subdivisions; col++) {
      const u0 = col / subdivisions;
      const u1 = (col + 1) / subdivisions;

      const sx0 = u0 * imageWidth;
      const sx1 = u1 * imageWidth;
      const sy0 = v0 * imageHeight;
      const sy1 = v1 * imageHeight;

      const p00 = gridPoint(u0, v0);
      const p10 = gridPoint(u1, v0);
      const p01 = gridPoint(u0, v1);
      const p11 = gridPoint(u1, v1);

      drawAffineTriangle(
        ctx,
        image,
        [sx0, sy0],
        [sx1, sy0],
        [sx0, sy1],
        p00,
        p10,
        p01
      );
      drawAffineTriangle(
        ctx,
        image,
        [sx1, sy0],
        [sx1, sy1],
        [sx0, sy1],
        p10,
        p11,
        p01
      );
    }
  }
}

/** Draws the source triangle (s0,s1,s2) mapped affinely onto (d0,d1,d2). */
function drawAffineTriangle(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  s0: Point,
  s1: Point,
  s2: Point,
  d0: Point,
  d1: Point,
  d2: Point
): void {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(d0[0], d0[1]);
  ctx.lineTo(d1[0], d1[1]);
  ctx.lineTo(d2[0], d2[1]);
  ctx.closePath();
  ctx.clip();

  // Solve the affine matrix (X = a*x + c*y + e, Y = b*x + d*y + f) that
  // maps s0->d0, s1->d1, s2->d2, via the 2x2 system obtained by
  // subtracting equation 0 from equations 1 and 2.
  const [x0, y0] = s0;
  const [x1, y1] = s1;
  const [x2, y2] = s2;
  const [X0, Y0] = d0;
  const [X1, Y1] = d1;
  const [X2, Y2] = d2;

  const dx1 = x1 - x0;
  const dy1 = y1 - y0;
  const dx2 = x2 - x0;
  const dy2 = y2 - y0;

  const det = dx1 * dy2 - dx2 * dy1;
  if (det === 0) {
    ctx.restore();
    return;
  }

  const dX1 = X1 - X0;
  const dX2 = X2 - X0;
  const dY1 = Y1 - Y0;
  const dY2 = Y2 - Y0;

  const a = (dX1 * dy2 - dX2 * dy1) / det;
  const c = (dx1 * dX2 - dx2 * dX1) / det;
  const b = (dY1 * dy2 - dY2 * dy1) / det;
  const d = (dx1 * dY2 - dx2 * dY1) / det;
  const e = X0 - a * x0 - c * y0;
  const f = Y0 - b * x0 - d * y0;

  ctx.transform(a, b, c, d, e, f);
  ctx.drawImage(image, 0, 0);
  ctx.restore();
}

/**
 * "Cover"-fits a source image into a destination quad's bounding box before
 * warping, so uploaded designs of any aspect ratio fill the area without
 * letterboxing (matches how the customer expects drag & drop to behave).
 */
export function coverCropToAspect(
  sourceWidth: number,
  sourceHeight: number,
  targetAspect: number
): { sx: number; sy: number; sw: number; sh: number } {
  const sourceAspect = sourceWidth / sourceHeight;
  if (sourceAspect > targetAspect) {
    const sh = sourceHeight;
    const sw = sh * targetAspect;
    return { sx: (sourceWidth - sw) / 2, sy: 0, sw, sh };
  }
  const sw = sourceWidth;
  const sh = sw / targetAspect;
  return { sx: 0, sy: (sourceHeight - sh) / 2, sw, sh };
}

export function quadAspectRatio(corners: [Point, Point, Point, Point]): number {
  const [tl, tr, br, bl] = corners;
  const topWidth = distance(tl, tr);
  const bottomWidth = distance(bl, br);
  const leftHeight = distance(tl, bl);
  const rightHeight = distance(tr, br);
  const width = (topWidth + bottomWidth) / 2;
  const height = (leftHeight + rightHeight) / 2;
  return width / height;
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}
