# Step 14 — React UI

**Framework:** React 18 + Vite  
**Port:** 3000  
**Talks to:** api-gateway only (port 8007)

## What this does

The React UI is the frontend the user sees in the browser. It is a single-page application (SPA) — the browser downloads the app once and React handles navigation client-side without full page reloads.

## How the UI talks to the backend

The Vite dev server has a proxy configured in `vite.config.ts`:

```js
proxy: {
  '/api': {
    target: 'http://localhost:8007',
    changeOrigin: true,
  }
}
```

When the React code calls `/api/v1/users/auth/login`, Vite intercepts that request and forwards it to `http://localhost:8007/api/v1/users/auth/login`. From the browser's perspective, everything goes to `localhost:3000` — it never talks directly to port 8007.

This proxy exists only in local development. In production (and later in EC2 Stage 2), you would point the UI's API calls directly at the gateway's URL or put an Nginx reverse proxy in front of everything. For now, Vite handles it.

## Install dependencies

```bash
cd /path/to/CollabSphereApp/collabsphere-ui
npm install
```

## Run the dev server

Open a new terminal:

```bash
cd /path/to/CollabSphereApp/collabsphere-ui
npm run dev
```

Expected output:

```
  VITE v6.x  ready in Xms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
```

## Open the application

Go to `http://localhost:3000` in your browser.

You should see the CollabSphere login page. Log in with:
```
Email:    admin@example.com
Password: (your SEED_DEFAULT_PASSWORD from .env.local)
```

If login fails with a network error, the api-gateway is not running — go back to Step 13.

If login fails with 401, the credentials are wrong. Check the admin account was seeded — look at the user-service startup logs for lines about seeding demo accounts.

## What the browser session stores

The UI stores the JWT in `sessionStorage` under the key `collabsphere.session`. sessionStorage is cleared when the tab is closed. If you close and reopen the tab, you will need to log in again.

This is intentional for a dev setup. In production, you would use httpOnly cookies or a refresh token mechanism.

---

→ Next: `setup/step-15-seed-and-verify.md`
