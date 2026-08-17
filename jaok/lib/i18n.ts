export type Locale = "de" | "en";

export const dictionaries: Record<Locale, Record<string, string>> = {
  de: {
    "gallery.title": "Wähle dein Mockup",
    "gallery.subtitle":
      "Lade dein Design hoch, platziere es live im Mockup und lade es als PNG herunter.",
    "gallery.free": "Kostenlos",
    "gallery.paid": "Kostenpflichtig",
    "editor.upload": "Design hierher ziehen oder klicken",
    "editor.uploadHint": "PNG oder JPG, mindestens 2000 px empfohlen",
    "editor.areaLabel": "Fläche",
    "editor.download.free": "Vorschau herunterladen (kostenlos)",
    "editor.download.hd": "In HD herunterladen",
    "editor.download.hdLocked": "In HD freischalten",
    "editor.download.hdHint": "300 dpi, ohne Wasserzeichen",
    "editor.checkoutRedirect": "Du wirst zur Kasse weitergeleitet …",
    "editor.unlocked": "HD-Download freigeschaltet",
    "editor.back": "Zurück zur Übersicht",
  },
  en: {
    "gallery.title": "Choose your mockup",
    "gallery.subtitle":
      "Upload your design, place it live in the mockup and download it as a PNG.",
    "gallery.free": "Free",
    "gallery.paid": "Paid",
    "editor.upload": "Drag your design here or click to upload",
    "editor.uploadHint": "PNG or JPG, 2000 px or larger recommended",
    "editor.areaLabel": "Area",
    "editor.download.free": "Download preview (free)",
    "editor.download.hd": "Download in HD",
    "editor.download.hdLocked": "Unlock HD download",
    "editor.download.hdHint": "300 dpi, no watermark",
    "editor.checkoutRedirect": "Redirecting you to checkout …",
    "editor.unlocked": "HD download unlocked",
    "editor.back": "Back to overview",
  },
};

export function t(locale: Locale, key: string): string {
  return dictionaries[locale][key] ?? key;
}
