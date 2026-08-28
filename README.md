# Erstattungslotse – Wahlarzt & PKV

Offline-PWA zum Erfassen und Nachverfolgen von Wahlarzt- und Apothekenrechnungen
inklusive Kostenerstattung. OCR (Tesseract, deutsches Sprachmodell) und
PDF-Parsing (pdf.js) laufen vollständig im Browser.

## Datenschutz

Alle Rechnungsdaten liegen ausschließlich in der IndexedDB des Geräts. Es gibt
keinen Server, keinen Upload, keine Analytics. Der Code dieses Repos ist
öffentlich – die Daten sind es nicht.

**Wichtig:** „Browserdaten löschen“ mit aktivierten Websitedaten kann die
IndexedDB mitlöschen. Regelmäßig den Export-Button nutzen.

## Deployment auf GitHub Pages

```bash
git remote add origin https://github.com/<DEIN-NAME>/rechnungs-tracker.git
git branch -M main
git push -u origin main
```

Dann im Repo: **Settings → Pages → Source: „Deploy from a branch“ →
Branch `main`, Ordner `/ (root)` → Save.**

Nach ein bis zwei Minuten ist die App erreichbar unter:

    https://<DEIN-NAME>.github.io/rechnungs-tracker/

GitHub Pages funktioniert nur mit einem **öffentlichen** Repo (auf Free-Konten).

## Installation auf Android

1. Die Pages-URL in Chrome öffnen
2. Chrome-Menü → **App installieren** bzw. **Zum Startbildschirm hinzufügen**
3. Die App startet danach mit eigenem Icon, ohne Adressleiste, offline nutzbar

Beim ersten OCR-Lauf lädt die App einmalig ~17 MB Tesseract-Daten nach und
cached sie dauerhaft. Am besten einmal im WLAN auslösen.

## Lokal testen

```bash
python3 -m http.server 8765
```

Dann `http://127.0.0.1:8765/` öffnen. Nur `localhost`/`127.0.0.1` und `https://`
erlauben einen Service Worker – über die LAN-IP (`http://192.168.x.x`) bleibt
der Offline-Cache aus.

## Struktur

```
index.html                     komplette App (UI + Logik)
manifest.json                  PWA-Manifest, alle Pfade relativ
sw.js                          Service Worker, Shell eager / vendor lazy
icons/                         192, 512, 512-maskable
vendor/tesseract/              OCR-Engine + deu.traineddata
vendor/pdfjs/                  PDF-Textextraktion
.nojekyll                      verhindert Jekyll-Verarbeitung auf Pages
```
