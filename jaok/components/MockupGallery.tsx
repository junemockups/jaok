"use client";

import Link from "next/link";
import type { MockupConfig } from "@/lib/types";
import { useLocale } from "./LocaleProvider";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { Logo } from "./Logo";

export function MockupGallery({ mockups }: { mockups: MockupConfig[] }) {
  const { locale, t } = useLocale();

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Logo />
          <div>
            <h1 className="text-2xl font-semibold">{t("gallery.title")}</h1>
            <p className="mt-1 text-ink/70">{t("gallery.subtitle")}</p>
          </div>
        </div>
        <LanguageSwitcher />
      </div>

      {mockups.length === 0 ? (
        <p className="text-ink/60">
          Noch keine Mockups konfiguriert — siehe <code>data/mockups/</code> bzw.{" "}
          <code>npm run extract-psd</code>.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
          {mockups.map((mockup) => (
            <Link
              key={mockup.slug}
              href={`/mockup/${mockup.slug}`}
              className="group overflow-hidden rounded-xl border border-ink/10 bg-surface transition hover:border-accent/60 hover:shadow-lg"
            >
              <div className="aspect-square overflow-hidden bg-ink/5">
                <img
                  src={`/mockups/${mockup.slug}/thumbnail.jpg`}
                  alt={mockup.title[locale]}
                  className="h-full w-full object-cover transition group-hover:scale-105"
                />
              </div>
              <div className="flex items-center justify-between p-3">
                <span className="font-medium">{mockup.title[locale]}</span>
                <span className="text-sm text-ink/60">
                  {mockup.freebie ? t("gallery.free") : t("gallery.paid")}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
