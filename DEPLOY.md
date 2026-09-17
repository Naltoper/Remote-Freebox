# Deploy to Vercel

Static Expo Web export (`expo export -p web` → `dist/`). Config lives in `vercel.json`.

## Critical: HTTPS → HTTP Mixed Content

Vercel serves the PWA on **HTTPS**. The Freebox API is **HTTP** (`http://192.168.1.49/...`).

Browsers **block** active Mixed Content (HTTPS page calling HTTP). A service worker **cannot** bypass this. Vercel serverless functions also **cannot** reach your home LAN/VPN IP.

| Approach | Works from Vercel HTTPS PWA? | Notes |
| --- | --- | --- |
| Direct `fetch` to `http://192.168.1.49` | **No** | Blocked as Mixed Content |
| Service worker proxy | **No** | Still Mixed Content |
| Vercel serverless proxy | **No** | Cannot reach private LAN |
| **Android TWA / Expo native** | **Yes** | Cleartext HTTP allowed in app config |
| **Host static files on LAN HTTP** | **Yes** | Same-origin or HTTP→HTTP is fine |
| **HTTPS reverse proxy on LAN/VPN** | **Yes** | Set Settings → Host to `https://…` |

The app detects this case and shows a warning instead of a silent failure.

---

## 1. One-time: push the repo to GitHub

If the project is not on GitHub yet:

1. Create an empty GitHub repository (e.g. `RemoteTVMamie`).
2. From this project:

```bash
git remote add origin https://github.com/<YOUR_USER>/RemoteTVMamie.git
git push -u origin master
```

---

## 2. Deploy with the Vercel Dashboard (recommended)

1. Open [https://vercel.com](https://vercel.com) and sign in (GitHub account is easiest).
2. **Add New… → Project**.
3. **Import** the `RemoteTVMamie` GitHub repository (authorize Vercel if prompted).
4. Framework Preset: leave as **Other** (or unset). `vercel.json` already sets:
   - Build Command: `npm run build:web`
   - Output Directory: `dist`
5. **Environment variables**: none required for v1 (host/code are in-app Settings / defaults).
6. Click **Deploy**.
7. When finished, open the deployment URL (e.g. `https://remotetvmamie.vercel.app`).

Later pushes to the connected branch redeploy automatically.

### Install as PWA (optional)

On a phone browser: open the Vercel URL → browser menu → **Add to Home Screen** / **Install app**.  
This installs the UI shell only; it does **not** fix Mixed Content against the Freebox HTTP API.

---

## 3. Deploy with Vercel CLI (alternative)

```bash
npm install -g vercel@latest
# from the project root:
vercel login
vercel          # preview deployment
vercel --prod   # production
```

Accept the defaults; `vercel.json` supplies build/output settings.

---

## 4. Verify the build locally before deploying

```bash
npm install
npm run build:web
npx serve dist   # or: npm run serve:web after export
```

Open the local URL and confirm the remote UI loads.

---

## 5. Making the remote actually control the Freebox

Pick **one** of these for day-to-day use (especially over WireGuard):

### A. Native / TWA (best for a phone on VPN)

Build an Android app / Trusted Web Activity that loads this UI (or use Expo native). Cleartext HTTP to `192.168.1.49` is already enabled in `app.json` (`usesCleartextTraffic`).

### B. Host the static export on the LAN over HTTP

Copy `dist/` to a NAS, Raspberry Pi, or Freebox-local web server and open `http://192.168.x.x/...` while on Wi‑Fi or VPN. HTTP page → HTTP Freebox is allowed.

### C. HTTPS reverse proxy on the LAN (keeps using the Vercel UI)

On a machine reachable via VPN, terminate TLS and proxy to the Freebox, e.g. Caddy:

```caddy
freebox.lan {
  reverse_proxy http://192.168.1.49
}
```

Then in the app **Settings → Host**, set:

```text
https://freebox.lan
```

(You still need a trusted or device-trusted certificate; CORS may still force `no-cors` opaque mode.)

---

## Files involved

- `vercel.json` — build, SPA rewrites, cache headers for PWA assets
- `package.json` → `build:web`: `expo export -p web`
- `app.json` → `web.output: "single"`
- `src/services/freeboxRemote.ts` — Mixed Content guard + optional `https://` host
