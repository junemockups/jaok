import { NextRequest, NextResponse } from "next/server";
import { verifyShopifyWebhook, extractSessionAttributes, type ShopifyOrderWebhookPayload } from "@/lib/shopify";
import { grantEntitlement } from "@/lib/entitlement";
import { listMockups } from "@/lib/mockups";

// Shopify "orders/paid" webhook. Configure this URL in Shopify Admin
// (Settings -> Notifications -> Webhooks) or via the Custom App's
// webhook subscriptions — see docs/SETUP.md.
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const hmacHeader = request.headers.get("x-shopify-hmac-sha256");
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;

  if (!secret || !verifyShopifyWebhook(rawBody, hmacHeader, secret)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(rawBody) as ShopifyOrderWebhookPayload;
  const { sessionToken } = extractSessionAttributes(payload);

  if (!sessionToken) {
    // Order wasn't placed through the mockup editor's cart permalink.
    return NextResponse.json({ ok: true, skipped: true });
  }

  const mockups = listMockups();
  const purchasedVariantIds = new Set(
    (payload.line_items ?? []).map((item) => String(item.variant_id))
  );

  const matchedMockups = mockups.filter((mockup) =>
    mockup.shopify?.tiers.some((tier) => purchasedVariantIds.has(tier.variantId))
  );

  await Promise.all(
    matchedMockups.map((mockup) =>
      grantEntitlement({
        token: sessionToken,
        mockupSlug: mockup.slug,
        orderId: String(payload.id),
        unlockedAt: Date.now(),
      })
    )
  );

  return NextResponse.json({ ok: true, unlocked: matchedMockups.map((m) => m.slug) });
}
