# Setup-Anleitung

Diese Anleitung deckt die drei Dinge ab, die außerhalb von Code passieren:
Shopify-Anbindung, Hosting/DNS auf Vercel und Einbettung auf junemockups.com.

## 1. Shopify Custom App anlegen

Wird gebraucht, damit die App weiß, wenn eine Bestellung bezahlt wurde
(Webhook), und damit die Signatur des Webhooks geprüft werden kann.
Funktioniert auf jedem Shopify-Plan (Basic/Shopify/Advanced), keine Plus-
Funktionen nötig.

1. Shopify-Admin → **Einstellungen → Apps und Vertriebskanäle → Apps
   entwickeln**. Falls das zum ersten Mal genutzt wird, auf "App-Entwicklung
   aktivieren" klicken und bestätigen.
2. **App erstellen** → Name z. B. `June Mockups Editor`.
3. Tab **Konfiguration** → Admin-API-Zugriffsbereiche bearbeiten → folgende
   Scopes aktivieren:
   - `read_orders`
   - `read_products`
4. Tab **API-Anmeldedaten**:
   - **App installieren** klicken → danach wird der **Admin-API-Zugriffstoken**
     angezeigt (nur einmal sichtbar!) → das ist `SHOPIFY_ADMIN_API_TOKEN`.
   - Der **Client-Secret** (API secret key) auf derselben Seite ist die
     Signatur, mit der Shopify Webhooks unterschreibt → das ist
     `SHOPIFY_WEBHOOK_SECRET`.
5. Trag zusätzlich `SHOPIFY_SHOP_DOMAIN` ein — das ist deine
   `*.myshopify.com`-Domain (nicht junemockups.com), z. B.
   `junemockups.myshopify.com`. Findest du in der Admin-URL oder unter
   Einstellungen → Domains.

Alle Werte kommen in die Vercel-Umgebungsvariablen (Schritt 3), lokal in
eine `.env.local` (siehe `.env.example`).

## 2. Bestell-Webhook registrieren

Der Webhook-Endpunkt der App liegt fest unter `/api/shopify/webhook` und
muss beim `orders/paid`-Event registriert werden, also sobald eine
Bestellung als bezahlt markiert wird — das schaltet in unserem Fall den
HD-Download frei.

Sobald die App deployed ist (Schritt 3) und die echte URL feststeht, den
Webhook per Admin-API registrieren (einmalig, per Terminal/Postman):

```bash
curl -X POST "https://${SHOPIFY_SHOP_DOMAIN}/admin/api/2024-10/webhooks.json" \
  -H "X-Shopify-Access-Token: ${SHOPIFY_ADMIN_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "webhook": {
      "topic": "orders/paid",
      "address": "https://mockups.junemockups.com/api/shopify/webhook",
      "format": "json"
    }
  }'
```

Zum Prüfen, was aktuell registriert ist:

```bash
curl "https://${SHOPIFY_SHOP_DOMAIN}/admin/api/2024-10/webhooks.json" \
  -H "X-Shopify-Access-Token: ${SHOPIFY_ADMIN_API_TOKEN}"
```

Shopifys eigene Webhook-Doku (falls sich an der API mal etwas ändert):
https://shopify.dev/docs/api/admin-rest/latest/resources/webhook

## 3. Mockups mit Shopify-Produkten verknüpfen

Für jedes kostenpflichtige Mockup braucht `public/mockups/<slug>/config.json`
ein `shopify.tiers`-Array mit einem Eintrag pro Lizenzstufe (Standard /
Extended / Commercial) — jeweils mit `productHandle` und `variantId` der
zugehörigen Variante in deinem Shop:

```json
"shopify": {
  "tiers": [
    { "id": "standard", "label": { "de": "Standard", "en": "Standard" }, "productHandle": "urban-poster-mockup-amsterdam", "variantId": "9876543210" },
    { "id": "extended", "label": { "de": "Extended", "en": "Extended" }, "productHandle": "urban-poster-mockup-amsterdam", "variantId": "9876543211" },
    { "id": "commercial", "label": { "de": "Commercial", "en": "Commercial" }, "productHandle": "urban-poster-mockup-amsterdam", "variantId": "9876543212" }
  ]
}
```

Der Kunde wählt eine dieser Stufen im Editor, alle drei schalten denselben
HD-Download für das Mockup frei — sie unterscheiden sich nur im Preis/den
Nutzungsrechten, nicht in der gelieferten Datei. Die Variant-ID findest du im
Produkt-Editor über die URL der Variante, oder über die Admin-API:

```bash
curl "https://${SHOPIFY_SHOP_DOMAIN}/admin/api/2024-10/products.json?handle=<handle>" \
  -H "X-Shopify-Access-Token: ${SHOPIFY_ADMIN_API_TOKEN}"
```

Freebie-Mockups laufen laut deiner Vorgabe trotzdem durch den Checkout
(0 €-Produkt) — leg dafür ebenfalls ein Produkt mit Preis 0 € an und trag
`freebie: true` **und** das `shopify`-Feld ein (siehe
`lib/types.ts`/`MockupConfig`).

## 4. Vercel-Deployment

1. Auf [vercel.com](https://vercel.com) mit dem GitHub-Account einloggen,
   **Add New → Project**, das Repo `junemockups/17aug` auswählen.
2. Framework wird automatisch als Next.js erkannt, Build-Command/Output
   müssen nicht angepasst werden.
3. Unter **Environment Variables** alle Werte aus `.env.example` eintragen
   (siehe Schritt 1 & 5 für Shopify, Schritt 5 unten für Upstash).
4. Deployen. Vercel vergibt automatisch eine `*.vercel.app`-URL zum Testen.
5. Eigene Domain: Projekt → **Settings → Domains** →
   `mockups.junemockups.com` hinzufügen. Vercel zeigt dann einen
   CNAME-Eintrag an, den du bei deinem DNS-Provider (dort, wo
   junemockups.com verwaltet wird) für die Subdomain `mockups` anlegst.
   Sobald DNS propagiert ist (meist Minuten, selten bis 24h), ist die App
   unter `https://mockups.junemockups.com` erreichbar.
6. `NEXT_PUBLIC_APP_URL` und `NEXT_PUBLIC_SHOPIFY_STOREFRONT_DOMAIN` in den
   Vercel-Umgebungsvariablen auf die finalen Domains setzen und neu
   deployen.

## 5. Upstash Redis (Freischalt-Status)

Wird genutzt, um zu speichern, welche Session welches Mockup in HD
freigeschaltet hat (kein Kundenkonto nötig).

1. [upstash.com](https://upstash.com) → kostenlosen Account anlegen →
   **Create Database** → Region möglichst nah an der Vercel-Region wählen.
2. Im Datenbank-Dashboard unter **REST API** die Werte `UPSTASH_REDIS_REST_URL`
   und `UPSTASH_REDIS_REST_TOKEN` kopieren → in Vercel als Umgebungsvariablen
   eintragen.

Der kostenlose Free-Tier reicht für den Start (10 Mockups, moderater
Traffic) locker aus.

## 6. Einbettung auf junemockups.com (iframe + Button)

Da ihr euch für die iframe-Variante entschieden habt, bleibt der Kunde auf
eurer Domain. Zwei Bausteine:

**a) Button/Link auf einer bestehenden Seite**, der zur Mockup-Übersicht
innerhalb eines iframes führt — z. B. als eigene Shopify-Seite
`/pages/mockup-editor` mit folgendem HTML im Seiteninhalt (Theme-Editor →
Seite → "HTML bearbeiten", oder als Custom-Liquid-Block):

```html
<div style="position:relative;width:100%;padding-top:140%;">
  <iframe
    src="https://mockups.junemockups.com"
    title="June Mockups Editor"
    style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;"
    loading="lazy"
    allow="clipboard-write"
  ></iframe>
</div>
```

Das `padding-top:140%` sorgt für ein festes Seitenverhältnis, damit der
iframe nicht auf 0 Höhe zusammenfällt — Wert nach Bedarf anpassen oder auf
eine feste `height` umstellen.

**b) Button** auf der Startseite/Navigation, der auf `/pages/mockup-editor`
verlinkt — ganz normaler Shopify-Button/Menüpunkt, kein Extra-Code nötig.

Die App setzt bereits einen `Content-Security-Policy: frame-ancestors`
Header, der Framing nur von `junemockups.com` und eurer `*.myshopify.com`
erlaubt (siehe `next.config.mjs`) — andere Seiten können die App also nicht
einfach in ein eigenes iframe einbetten.

## 7. Testen vor dem Go-Live

1. Lokal: `npm install && npm run dev`, dann `http://localhost:3000`
   öffnen (Demo-Mockup `demo-poster-duo` ist zum Testen enthalten).
2. Ein echtes Mockup aus einer PSD erzeugen:
   `npm run extract-psd -- pfad/zur/datei.psd mein-mockup-slug --variant=123456789 --handle=mein-mockup`
   (bei Freebies `--freebie` statt `--variant`/`--handle`).
3. `title` (de/en) in der erzeugten `config.json` von Hand eintragen,
   Ergebnis im Browser unter `/mockup/mein-mockup-slug` prüfen —
   insbesondere ob die Flächen (Areas) an der richtigen Stelle/Perspektive
   liegen. Bei Bedarf Eckpunkte in `config.json` von Hand nachjustieren.
4. Bezahlpfad testen: HD-Freischaltung antriggern, im Shopify-Checkout mit
   dem Bogus-Gateway (Testzahlung) bezahlen, prüfen ob nach Rückkehr zur
   App der HD-Download automatisch freigeschaltet wird (Polling läuft alle
   4 Sekunden bzw. beim Zurückwechseln des Browser-Tabs).
5. Falls der Webhook nicht ankommt: in Shopify Admin → die Custom App →
   **Webhook-Zustellungen** prüfen, dort werden Fehler/Antwortcodes der
   letzten Zustellversuche angezeigt.

## Datenschutz-Hinweis

Das Kunden-Design wird ausschließlich im Browser der Kundin/des Kunden
verarbeitet (Canvas-Rendering) — es wird nie an den Server von
junemockups.com/Vercel hochgeladen oder dort gespeichert. Das vereinfacht
DSGVO-Fragen erheblich, sollte aber trotzdem in eurer Datenschutzerklärung
kurz erwähnt werden (nur Session-Token + Bestelldaten laufen über den
Server).
