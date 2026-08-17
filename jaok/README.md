# June Mockups — Live Mockup Editor

Web-App, mit der Kund:innen ohne Photoshop eigene Designs live in echten
Foto-Mockups platzieren und als PNG herunterladen können — Vorschau in
niedriger Auflösung kostenlos (mit Wasserzeichen), HD-Download (300 dpi,
ab 2000 px, ohne Wasserzeichen) nach Kauf über den bestehenden
Shopify-Checkout von [junemockups.com](https://www.junemockups.com).

## Wie es funktioniert

1. **PSD → Mockup-Daten** (einmalig pro Mockup, `npm run extract-psd`):
   liest die PSD-Datei, exportiert alle nicht-Smart-Object-Ebenen
   (Hintergrund, Schatten/Licht) als PNGs in Original-Stapelreihenfolge und
   liest für jedes Smart Object die vier Eckpunkte aus, an denen später das
   Kundendesign platziert wird — direkt aus der PSD-Transform, inklusive
   Perspektive/Rotation.
2. **Editor im Browser**: Kund:in lädt ein PNG/JPG hoch, das Design wird
   per Eckpunkt-Verzerrung (Corner-Pin, siehe `lib/compositor.ts`) exakt in
   die Fläche eingepasst und mit den Schatten-/Licht-Ebenen der PSD
   überlagert — alles auf einem `<canvas>`, ohne Server-Rendering. Bei
   mehreren Flächen pro Mockup ist jede einzeln anklickbar und individuell
   gestaltbar.
3. **Download**: Vorschau (klein, Wasserzeichen) ist immer sofort möglich.
   HD-Download ist bei Freebies sofort verfügbar, sonst nur nach Kauf —
   Klick auf "HD freischalten" legt die passende Shopify-Variante in den
   Warenkorb und leitet zum gewohnten Checkout weiter; ein Webhook
   (`/api/shopify/webhook`) schaltet nach Zahlungseingang den Download für
   die jeweilige Browser-Session frei (kein Kundenkonto nötig).

Das Kunden-Design verlässt dabei nie den Browser — es wird nirgendwo
hochgeladen oder gespeichert.

## Lokal starten

```bash
npm install
cp .env.example .env.local   # Werte eintragen, siehe docs/SETUP.md
node scripts/generate-demo-mockup.mjs   # erzeugt das Demo-Mockup lokal
npm run dev
```

Das generierte Demo-Mockup (`demo-poster-duo`, synthetisch, zwei Flächen,
eine davon perspektivisch) dient nur zum Ausprobieren des Editors ohne
echte PSD: `http://localhost:3000/mockup/demo-poster-duo`. Die generierten
Bild-Dateien liegen unter `public/mockups/demo-poster-duo/` und sind
aktuell nicht im Repo — `generate-demo-mockup.mjs` erzeugt sie
deterministisch neu.

## Ein echtes Mockup aus einer PSD anlegen

```bash
npm run extract-psd -- pfad/zur/datei.psd mockup-slug \
  --variant=<shopify_variant_id> --handle=<shopify_product_handle>
# oder für Freebies:
npm run extract-psd -- pfad/zur/datei.psd mockup-slug --freebie
```

Erzeugt `public/mockups/<slug>/` mit `config.json` + den exportierten
PNGs/Thumbnail. Danach `title` (de/en) in der `config.json` ergänzen und
die Fläche(n) im Browser auf korrekte Position/Perspektive prüfen.

Details, Grenzen des Skripts (z. B. Ebenengruppen werden flach
zusammengeführt) und Fallback-Verhalten stehen als Kommentare im Skript
selbst: `scripts/extract-psd.mjs`.

## Projektstruktur

```
app/                    Next.js App Router (Seiten + API-Routen)
components/Editor/       Editor-UI (Upload, Flächenauswahl, Vorschau)
lib/compositor.ts        Eckpunkt-Verzerrung (Corner-Pin-Warp)
lib/renderMockup.ts       Setzt Layer-Stack + Design zu einem Bild zusammen
lib/shopify.ts / cart.ts  Cart-Permalink, Webhook-HMAC-Prüfung
lib/entitlement.ts        Freischalt-Status (Upstash Redis)
scripts/extract-psd.mjs   PSD → Mockup-Daten
public/mockups/<slug>/    Ein Ordner pro Mockup (config.json + PNGs)
docs/SETUP.md             Schritt-für-Schritt: Shopify, Vercel, Einbettung
```

## Was noch fehlt, bevor es live gehen kann

- [ ] Echte PSD-Dateien für die 10 Mockups durch `extract-psd` laufen lassen
- [ ] Shopify Custom App anlegen + Webhook registrieren (`docs/SETUP.md`)
- [ ] Produkte/Varianten in Shopify den `config.json`-Dateien zuordnen
- [ ] Upstash Redis + Vercel-Projekt + Domain `mockups.junemockups.com`
      einrichten
- [ ] iframe + Button auf junemockups.com einbauen
- [ ] `package-lock.json` committen (`npm install` lokal ausführen und
      einchecken — in dieser Session konnte nur Textcode gepusht werden)
