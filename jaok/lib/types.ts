export type Point = [x: number, y: number];

/** One user-editable surface inside a mockup, taken from a PSD smart object. */
export interface MockupArea {
  type: "area";
  id: string;
  label: string;
  /** Corners in background-canvas pixel space, clockwise from top-left. */
  corners: [Point, Point, Point, Point];
}

/** A static raster layer exported from the PSD (background, shadows, highlights). */
export interface MockupImageLayer {
  type: "image";
  /** File name inside the mockup's asset folder. */
  src: string;
}

export type MockupLayer = MockupImageLayer | MockupArea;

/** One purchasable usage-rights tier for a paid mockup (Standard/Extended/Commercial). */
export interface LicenseTier {
  id: string;
  label: Record<"de" | "en", string>;
  productHandle: string;
  variantId: string;
}

export interface MockupConfig {
  slug: string;
  title: Record<"de" | "en", string>;
  freebie: boolean;
  /** Required unless freebie is true — at least one license tier to buy. */
  shopify?: {
    tiers: LicenseTier[];
  };
  canvas: { width: number; height: number };
  /**
   * Full PSD layer stack, bottom to top, in render order.
   * "area" entries are where the customer's design gets warped in;
   * "image" entries are static exports (background, shadow/highlight overlays).
   */
  layers: MockupLayer[];
}

export interface PendingSession {
  token: string;
  mockupSlug: string;
  createdAt: number;
}

export interface Entitlement {
  token: string;
  mockupSlug: string;
  orderId: string;
  unlockedAt: number;
}
