# Swim California Mission Control

Local-first PWA for coordinating high-risk endurance swim expeditions, now delivered in two distinct project modes:

- `Operational Swim Source of Truth` (`/`): fully populated swim data, logistics, protocols, and active operations workflows.
- `Reusable Template Project` (`/template`): generalized, client-ready framework with placeholders and onboarding guidance for new swimmers and routes.

## Multi-Phone Sync

The app still works locally with no backend. For Catherine's test swim, set up Supabase so multiple phones share the live mission:

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL editor.
3. Copy `.env.example` to `.env.local`.
4. Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
5. Use the same `VITE_SYNC_MISSION_ID` on every phone.
6. Restart `npm run dev`.

When configured, Postgres stores the shared mission snapshot, Supabase Storage stores WOWSA image files, and the app keeps local storage as a fallback.

Security note: `supabase/schema.sql` is a controlled test-swim schema with permissive anon policies so phones can sync quickly. Before using it as the durable medical-record system of record, replace those policies with authenticated, mission-scoped Row Level Security and private Storage rules.

## Access Protection

The app includes a client-side access gate. Set `VITE_SITE_ACCESS_SHA256` to the SHA-256 hash of the access code before deploying. Generate a hash locally with:

```bash
node -e "crypto.subtle.digest('SHA-256', new TextEncoder().encode('replace-with-access-code')).then((hash) => console.log([...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join('')))"
```

For Vercel, add `VITE_SITE_ACCESS_SHA256` in Project Settings > Environment Variables for Production and Preview. Also enable Vercel Deployment Protection / Password Protection when available on the project plan, so access is blocked before the app bundle loads.

## Scripts

- `npm run dev` starts the local Vite server.
- `npm run dev:ensure` starts the dev server only when `5173` is not already in use.
- `npm run test` runs the mission-critical flow tests.
- `npm run build` type-checks and builds the production PWA.
- `npm run share` starts a static preview + Cloudflare tunnel and prints a share URL.
- `npm run status` shows git sync, local ports, tunnel state, and the current share URL.
- `npm run session:up` runs dev auto-ensure, attempts share setup, then prints session status.

## Codespaces

- `.devcontainer/devcontainer.json` forwards `5173` (Vite dev) and `4173` (static preview) by default.
- On attach, `.devcontainer/post-attach.sh` starts `npm run dev` automatically if nothing is listening on `5173`.
- Dev-server logs are written to `.codespaces/logs/vite-dev.log`.
- Share preview logs are written to `.codespaces/logs/preview-serve.log` and `.codespaces/logs/preview-tunnel.log`.
- `npm run dev` serves the app at port `5173` with hostnames allowed for Codespaces and common tunnel domains.
- `npm run preview` serves the built app at port `4173`.

## Automation

- `.github/workflows/ci-pages.yml` runs tests and build on pull requests and on `main`.
- Pushes to `main` also deploy the current `dist/` output to `gh-pages` with an SPA fallback `404.html`.
