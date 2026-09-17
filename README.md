# RemoteTVMamie

Expo (React Native Web) remote control for a **Freebox Player**, usable as a PWA or TWA over LAN or WireGuard VPN.

Each button sends:

```text
GET http://{HOST}/pub/remote_control?code={CODE}&key={KEY}
```

Default host `192.168.1.49`, code `97773511` (editable in Settings).

## Run

```bash
npm install
npm run web      # browser / PWA
npm start        # Expo Dev Tools
```

## Project layout

```text
App.tsx
src/
  config/defaults.ts          # default host / code / timeout
  context/SettingsContext.tsx # AsyncStorage-backed settings
  services/freeboxRemote.ts   # fetch + timeout / no-cors on web
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
  manifest.json               # PWA manifest
  index.html
```

## Notes

- **Web / CORS**: Freebox replies without CORS headers. On web the client uses `fetch(..., { mode: 'no-cors' })` so the request is still sent (opaque response).
- **Native / TWA**: cleartext HTTP is allowed (`usesCleartextTraffic` / ATS local networking).
- **Feedback**: `expo-haptics` on press + brief status banner on success/failure.
- **Config**: gear icon → Settings to change IP, remote code, and timeout.
