"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MockupArea, MockupConfig } from "@/lib/types";
import { renderMockup, renderWatermarkedPreview, canvasToDownload, type AreaDesign } from "@/lib/renderMockup";
import { buildCartPermalink } from "@/lib/cart";
import { useLocale } from "@/components/LocaleProvider";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Logo } from "@/components/Logo";

function getOrCreateSessionToken(slug: string): string {
  const key = `jm_token_${slug}`;
  let token = window.sessionStorage.getItem(key);
  if (!token) {
    token = crypto.randomUUID();
    window.sessionStorage.setItem(key, token);
  }
  return token;
}

export function Editor({ config }: { config: MockupConfig }) {
  const { locale, t } = useLocale();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const areas = useMemo(
    () => config.layers.filter((l): l is MockupArea => l.type === "area"),
    [config]
  );

  const [images, setImages] = useState<Record<string, HTMLImageElement>>({});
  const [activeAreaId, setActiveAreaId] = useState<string>(areas[0]?.id ?? "");
  const [unlocked, setUnlocked] = useState(config.freebie);
  const [checkingOutTierId, setCheckingOutTierId] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  useEffect(() => {
    setSessionToken(getOrCreateSessionToken(config.slug));
  }, [config.slug]);

  // Poll entitlement status after the customer comes back from checkout
  // (there is no account/login, so we can't rely on a redirect callback
  // alone — the tab may resume via history back, not a fresh navigation).
  useEffect(() => {
    if (config.freebie || unlocked || !sessionToken) return;
    let cancelled = false;

    const check = async () => {
      try {
        const res = await fetch(
          `/api/entitlement?token=${encodeURIComponent(sessionToken)}&mockup=${encodeURIComponent(config.slug)}`
        );
        const data = await res.json();
        if (!cancelled && data.unlocked) setUnlocked(true);
      } catch {
        // network hiccup — next poll or focus event will retry
      }
    };

    check();
    const onFocus = () => check();
    window.addEventListener("focus", onFocus);
    const interval = window.setInterval(check, 4000);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
      window.clearInterval(interval);
    };
  }, [config.freebie, config.slug, sessionToken, unlocked]);

  const designs: AreaDesign[] = useMemo(
    () =>
      Object.entries(images).map(([areaId, image]) => ({ areaId, image })),
    [images]
  );

  useEffect(() => {
    if (!canvasRef.current) return;
    renderMockup(canvasRef.current, config, designs).catch(console.error);
  }, [config, designs]);

  const handleFile = useCallback(
    (areaId: string, file: File) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        setImages((prev) => ({ ...prev, [areaId]: img }));
        URL.revokeObjectURL(url);
      };
      img.src = url;
    },
    []
  );

  const onDropArea = (areaId: string) => (e: React.DragEvent) => {
    e.preventDefault();
    setActiveAreaId(areaId);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(areaId, file);
  };

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && activeAreaId) handleFile(activeAreaId, file);
    e.target.value = "";
  };

  const hasAnyDesign = designs.length > 0;

  const downloadFreePreview = () => {
    if (!canvasRef.current) return;
    const preview = renderWatermarkedPreview(canvasRef.current);
    canvasToDownload(preview, `${config.slug}-preview.png`);
  };

  const downloadHd = () => {
    if (!canvasRef.current) return;
    canvasToDownload(canvasRef.current, `${config.slug}-hd.png`);
  };

  const startCheckout = (variantId: string, tierId: string) => {
    if (!sessionToken) return;
    setCheckingOutTierId(tierId);
    const url = buildCartPermalink({
      storefrontDomain: process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_DOMAIN ?? "junemockups.com",
      variantId,
      sessionToken,
      mockupSlug: config.slug,
      returnUrl: window.location.href,
    });
    window.location.href = url;
  };

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Logo size={28} />
          <Link href="/" className="text-sm text-ink/60 hover:text-ink">
            ← {t("editor.back")}
          </Link>
        </div>
        <LanguageSwitcher />
      </div>

      <div className="grid gap-8 md:grid-cols-[1.4fr_1fr]">
        <div className="overflow-hidden rounded-xl border border-ink/10 bg-surface">
          <canvas ref={canvasRef} data-testid="preview-canvas" className="h-auto w-full" />
        </div>

        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-xl font-semibold">{config.title[locale]}</h1>
          </div>

          <div className="flex flex-col gap-3">
            {areas.map((area) => (
              <button
                key={area.id}
                data-testid="area-button"
                data-area-id={area.id}
                onClick={() => {
                  setActiveAreaId(area.id);
                  fileInputRef.current?.click();
                }}
                onDrop={onDropArea(area.id)}
                onDragOver={(e) => e.preventDefault()}
                className={`flex items-center justify-between rounded-lg border-2 border-dashed p-4 text-left transition ${
                  activeAreaId === area.id
                    ? "border-accent bg-accent/5"
                    : "border-ink/15 hover:border-ink/30"
                }`}
              >
                <span>
                  <span className="block text-sm text-ink/50">
                    {t("editor.areaLabel")}
                  </span>
                  <span className="font-medium">{area.label}</span>
                </span>
                <span className="text-xs text-ink/50">
                  {images[area.id] ? "✓" : t("editor.upload")}
                </span>
              </button>
            ))}
            <p className="text-xs text-ink/50">{t("editor.uploadHint")}</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={onPickFile}
            />
          </div>

          <div className="mt-auto flex flex-col gap-2">
            <button
              onClick={downloadFreePreview}
              disabled={!hasAnyDesign}
              className="rounded-lg border border-ink/20 px-4 py-2.5 text-sm font-medium disabled:opacity-40"
            >
              {t("editor.download.free")}
            </button>

            {config.freebie || unlocked ? (
              <button
                onClick={downloadHd}
                disabled={!hasAnyDesign}
                className="rounded-lg bg-brand-gradient px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40"
              >
                {t("editor.download.hd")}
                <span className="ml-1 text-white/70">— {t("editor.download.hdHint")}</span>
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-ink/50">{t("editor.download.hdLocked")}</p>
                {config.shopify?.tiers.map((tier) => (
                  <button
                    key={tier.id}
                    onClick={() => startCheckout(tier.variantId, tier.id)}
                    disabled={!hasAnyDesign || checkingOutTierId !== null}
                    className="rounded-lg bg-brand-gradient px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40"
                  >
                    {checkingOutTierId === tier.id
                      ? t("editor.checkoutRedirect")
                      : tier.label[locale]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
