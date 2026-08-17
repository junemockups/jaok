import fs from "node:fs";
import path from "node:path";
import type { MockupConfig } from "./types";

// Lives under /public so the same files are both readable on the server
// (for config parsing) and directly servable as static assets in the browser.
const MOCKUPS_DIR = path.join(process.cwd(), "public", "mockups");

export function listMockupSlugs(): string[] {
  if (!fs.existsSync(MOCKUPS_DIR)) return [];
  return fs
    .readdirSync(MOCKUPS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

export function getMockupConfig(slug: string): MockupConfig | null {
  const configPath = path.join(MOCKUPS_DIR, slug, "config.json");
  if (!fs.existsSync(configPath)) return null;
  const raw = fs.readFileSync(configPath, "utf-8");
  return JSON.parse(raw) as MockupConfig;
}

export function listMockups(): MockupConfig[] {
  return listMockupSlugs()
    .map((slug) => getMockupConfig(slug))
    .filter((config): config is MockupConfig => config !== null);
}

export { mockupAssetPath } from "./mockupAssetPath";
