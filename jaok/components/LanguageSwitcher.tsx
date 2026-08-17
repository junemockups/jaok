"use client";

import { useLocale } from "./LocaleProvider";

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();

  return (
    <div className="flex gap-1 text-sm">
      {(["de", "en"] as const).map((option) => (
        <button
          key={option}
          onClick={() => setLocale(option)}
          className={`rounded px-2 py-1 uppercase tracking-wide ${
            locale === option ? "bg-ink text-paper" : "text-ink/60 hover:text-ink"
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
