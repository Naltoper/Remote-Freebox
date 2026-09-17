# Deploy to GitHub Pages (HTTP)

Static Expo Web export (`expo export -p web` → `dist/`), published with `gh-pages`.

Project pages URL shape:

```text
http://<GITHUB_USER>.github.io/RemoteTVMamie/
```

`app.json` sets `experiments.baseUrl` to `/RemoteTVMamie`. If your repository name differs, change that value to `/<exact-repo-name>` before deploying.

---

## STOP — read before you continue

### 1. No GitHub remote yet

This project currently has **no `git remote`**. You must create a GitHub repository and connect it (steps below). I cannot do that without your account.

### 2. `*.github.io` often stays HTTPS in browsers

Even if you uncheck **Enforce HTTPS** in GitHub Pages settings:

- Modern browsers treat `github.io` as an **HSTS preload** host.
- Typing `http://…github.io/…` is frequently **upgraded to HTTPS** by the browser itself.
- An HTTPS page **cannot** call `http://192.168.1.49` (Mixed Content).

So GitHub Pages on the default `github.io` domain is **unlikely** to give you reliable HTTP→HTTP Freebox control.

| Hosting | Plain HTTP to Freebox? |
| --- | --- |
| `https://*.github.io/...` (typical) | No — Mixed Content |
| `http://*.github.io/...` after disabling Enforce HTTPS | Often still forced to HTTPS by browser HSTS |
| Custom domain + Enforce HTTPS **off** + no HSTS on that domain | Possible |
| LAN/NAS/Pi HTTP server (`http://192.168.x.x`) | Yes (recommended for this remote) |
| Android TWA / Expo native | Yes |

If Freebox control is the goal, prefer a **LAN HTTP host** or **native/TWA**. Use GitHub Pages mainly if you accept HTTPS UI + a different control path, or you have a **non-HSTS custom domain** served over HTTP.

---

## Manual checklist

### A. Create the GitHub repository (you)

1. Open [https://github.com/new](https://github.com/new).
2. Repository name: **`RemoteTVMamie`** (must match `experiments.baseUrl` unless you change it).
3. Visibility: Public (required for free GitHub Pages on user/org accounts) or Private if your plan allows Pages.
4. Do **not** add a README/license (this repo already has files).
5. Click **Create repository**.

### B. Connect `origin` and push (you — in a terminal)

Replace `<YOUR_USER>` with your GitHub username:

```bash
cd /home/roblof/RemoteTVMamie
git remote add origin https://github.com/<YOUR_USER>/RemoteTVMamie.git
git branch -M master
git push -u origin master
```

If GitHub asks you to authenticate, complete login (browser / PAT / SSH). Prefer SSH if you already use it:

```bash
git remote add origin git@github.com:<YOUR_USER>/RemoteTVMamie.git
git push -u origin master
```

### C. Install deps and deploy Pages branch (you)

```bash
npm install
npm run deploy
```

This runs `expo export -p web` then publishes `dist/` to the `gh-pages` branch with `.nojekyll`.

First run may open a GitHub auth prompt for `gh-pages`; complete it.

### D. Enable GitHub Pages (you — GitHub UI)

1. Open the repo on GitHub → **Settings** → **Pages** (left sidebar).
2. Under **Build and deployment** → **Source**, choose **Deploy from a branch**.
3. Branch: **`gh-pages`** / folder: **/ (root)** → **Save**.
4. Wait 1–2 minutes for the site URL to appear.

### E. Disable “Enforce HTTPS” (you — GitHub UI)

1. Stay on **Settings** → **Pages**.
2. Find the checkbox **Enforce HTTPS**.
3. **Uncheck** it and save if prompted.
4. Test in a private/incognito window:

```text
http://<YOUR_USER>.github.io/RemoteTVMamie/
```

5. Confirm the address bar stays on **`http://`** (not upgraded to `https://`).
   - If it upgrades: browser HSTS — GitHub Pages on `github.io` will not solve Mixed Content for you.
   - Fallback: host `dist/` on a LAN HTTP server, or use native/TWA (see below).

### F. Smoke-test the remote (you)

1. Connect to home Wi‑Fi or WireGuard VPN.
2. Open the Pages URL over **HTTP** (if available).
3. Press **Power** / **OK** and confirm the Freebox reacts.

---

## Optional: LAN HTTP hosting (most reliable for Freebox)

```bash
npm run build:web
# copy dist/ to any local HTTP server, e.g. on a Pi:
npx --yes serve -l 8080 dist
```

Then open `http://<lan-ip>:8080/` while on VPN/LAN.

---

## Scripts reference

| Script | Purpose |
| --- | --- |
| `npm run build:web` | `expo export -p web` → `dist/` |
| `npm run deploy` | build + `gh-pages --nojekyll -d dist` |
| `npm run serve:web` | serve an existing export locally |

## Config reference

- `app.json` → `experiments.baseUrl`: `/RemoteTVMamie`
- `package.json` → `predeploy` / `deploy`
- Mixed Content pre-check removed from `src/services/freeboxRemote.ts` (HTTP hosting assumed)
