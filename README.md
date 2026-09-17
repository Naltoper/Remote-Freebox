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

## Deploy (Vercel)

See **[DEPLOY.md](./DEPLOY.md)** for Vercel Dashboard / CLI steps and the HTTPS Mixed Content constraints.

```bash
npm run build:web
# then connect the GitHub repo in Vercel, or: npx vercel
```

## Project layout

```text
App.tsx
vercel.json                     # Vercel static export + headers
src/
  config/defaults.ts            # default host / code / timeout
  context/SettingsContext.tsx   # AsyncStorage-backed settings
  services/freeboxRemote.ts     # fetch + timeout / no-cors / mixed-content guard
  components/
    RemoteButton.tsx
    ControlPad.tsx
    Header.tsx
    NumberPad.tsx
    VolumeChannelPad.tsx
  screens/
    RemoteScreen.tsx
    SettingsScreen.tsx
  theme/colors.ts
public/
  manifest.json                 # PWA manifest
  index.html
```

## Notes

- **Mixed Content (Vercel HTTPS)**: browsers block `https://…vercel.app` from calling `http://192.168…`. Use native/TWA, local HTTP hosting, or an HTTPS LAN proxy — details in `DEPLOY.md`.
- **Web / CORS**: Freebox replies without CORS headers. On web the client uses `fetch(..., { mode: 'no-cors' })` so the request is still sent (opaque response) when Mixed Content does not apply.
- **Native / TWA**: cleartext HTTP is allowed (`usesCleartextTraffic` / ATS local networking).
- **Feedback**: `expo-haptics` on press + brief status banner on success/failure.
- **Config**: gear icon → Settings to change IP, remote code, and timeout.
