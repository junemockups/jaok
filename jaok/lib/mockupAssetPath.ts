// Client-safe (no node built-ins) — split out of lib/mockups.ts so
// browser code (renderMockup.ts) doesn't pull in node:fs/node:path.
export function mockupAssetPath(slug: string, file: string): string {
  return `/mockups/${slug}/${file}`;
}
