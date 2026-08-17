/**
 * Builds a Shopify cart permalink that adds the mockup's variant and stamps
 * our session token as a cart attribute, so the order webhook can later
 * match the paid order back to the browser session that started the
 * checkout (no customer accounts involved). Client-safe (no node built-ins).
 * https://shopify.dev/docs/api/ajax/reference/cart#add-a-variant-to-the-cart-using-a-permalink
 */
export function buildCartPermalink(params: {
  storefrontDomain: string;
  variantId: string;
  sessionToken: string;
  mockupSlug: string;
  returnUrl: string;
}): string {
  const { storefrontDomain, variantId, sessionToken, mockupSlug, returnUrl } = params;
  const attributes = new URLSearchParams({
    "attributes[junemockups_session]": sessionToken,
    "attributes[junemockups_mockup]": mockupSlug,
    "attributes[junemockups_return_url]": returnUrl,
  });
  return `https://${storefrontDomain}/cart/${variantId}:1?${attributes.toString()}`;
}
