# AGENTS.md — Instagram GIF Collector Extension

## Project Type
This is a **Chrome browser extension** (Manifest V3), not a web application. It cannot run as a traditional web server — it relies on `chrome.storage.local`, content script injection, and the browser extension API.

## Files
- `manifest.json` — MV3 extension manifest
- `content.js` — content script; scans page for Giphy images, extracts Giphy page URLs, stores in `chrome.storage.local`
- `popup.html` / `popup.js` / `popup.css` — extension popup UI; reads stored images, fetches titles from Giphy API
- `demo.html` — standalone demo page that polyfills `chrome.storage` with mock data so the popup UI can be previewed in a browser

## Running in Base44 Sandbox
- Served as static files via `docker compose -f docker-compose.base44.yml up -d`
- Python `http.server` on port 3000 (nginx was tried first but failed due to restrictive host directory permissions — the sandbox root is `drwx------`)
- The preview shows `demo.html` with sample GIF data; the actual extension functionality requires loading it into Chrome as an unpacked extension

## Giphy API
- `popup.js` fetches GIF titles from `https://api.giphy.com` with a hardcoded API key
- No secrets required for the demo; the key is embedded in the source
