import crypto from "node:crypto";

// Server-only module (uses node:crypto) — for the client-safe cart permalink
// builder, see lib/cart.ts. Keep that split so this file never ends up in
// the browser bundle.

/** Verifies the `X-Shopify-Hmac-Sha256` header on incoming webhook requests. */
export function verifyShopifyWebhook(rawBody: string, hmacHeader: string | null, secret: string): boolean {
  if (!hmacHeader) return false;
  const digest = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");
  const a = Buffer.from(digest);
  const b = Buffer.from(hmacHeader);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export interface ShopifyOrderWebhookPayload {
  id: number;
  name: string;
  note_attributes?: { name: string; value: string }[];
  line_items?: { product_id: number; variant_id: number; title: string }[];
}

export function extractSessionAttributes(payload: ShopifyOrderWebhookPayload): {
  sessionToken: string | null;
  mockupSlug: string | null;
} {
  const attrs = payload.note_attributes ?? [];
  const find = (name: string) => attrs.find((a) => a.name === name)?.value ?? null;
  return {
    sessionToken: find("junemockups_session"),
    mockupSlug: find("junemockups_mockup"),
  };
}
