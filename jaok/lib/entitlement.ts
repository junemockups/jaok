import { Redis } from "@upstash/redis";
import type { Entitlement } from "./types";

let redis: Redis | null = null;

function client(): Redis {
  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return redis;
}

// Keyed by token+mockup so a single checkout that unlocks several mockups
// at once (multiple line items in one cart) doesn't overwrite entitlements.
const key = (token: string, mockupSlug: string) => `entitlement:${token}:${mockupSlug}`;

export async function grantEntitlement(entitlement: Entitlement): Promise<void> {
  // Unlocked downloads stay valid for 30 days, matching typical Shopify
  // return-window expectations without keeping the store growing forever.
  await client().set(key(entitlement.token, entitlement.mockupSlug), entitlement, {
    ex: 60 * 60 * 24 * 30,
  });
}

export async function getEntitlement(token: string, mockupSlug: string): Promise<Entitlement | null> {
  return (await client().get<Entitlement>(key(token, mockupSlug))) ?? null;
}

export async function isUnlocked(token: string, mockupSlug: string): Promise<boolean> {
  const entitlement = await getEntitlement(token, mockupSlug);
  return entitlement !== null;
}
