# RemoteTVMamie

Expo (React Native Web) remote control for a **Freebox Player**, usable as a PWA or TWA over LAN or WireGuard VPN.

Each button sends:

```text
GET http://{HOST}/pub/remote_control?code={CODE}&key={KEY}
```

Default host `192.168.1.49`, code `97773511` (editable in Settings). Host may also be a full origin such as `https://freebox.lan`.

## Run

```bash
npm install
npm run web       # browser / PWA (dev)
npm run build:web # static export → dist/
npm start         # Expo Dev Tools
```

## Deploy (GitHub Pages)

See **[DEPLOY.md](./DEPLOY.md)** for the full checklist (create repo, push, `npm run deploy`, disable Enforce HTTPS).

```bash
npm run deploy
```

> **Important:** `*.github.io` is often forced to HTTPS by browsers (HSTS), which reintroduces Mixed Content toward the Freebox HTTP API. Prefer LAN HTTP hosting or native/TWA if control fails — details in `DEPLOY.md`.

## Project layout

```text
App.tsx
src/
  config/defaults.ts
  context/SettingsContext.tsx
  services/freeboxRemote.ts
  components/
  screens/
  theme/colors.ts
public/
  manifest.json
  index.html
```

## Notes

- **HTTP hosting**: intended so the UI can call `http://192.168…` without Mixed Content.
- **Web / CORS**: Freebox typically has no CORS headers; web uses `fetch(..., { mode: 'no-cors' })` (opaque response).
- **Native / TWA**: cleartext HTTP allowed (`usesCleartextTraffic` / ATS local networking).
- **Config**: gear icon → Settings for IP, remote code, timeout.
