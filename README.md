# Swim California Mission Control

Local-first PWA for coordinating high-risk endurance swim expeditions, now delivered in two distinct project modes:

- `Live Operational Project` (`/`): fully populated Catherine expedition data, logistics, protocols, and active operations workflows.
- `Reusable Template Project` (`/template`): generalized, client-ready framework with placeholders and onboarding guidance for new swimmers and routes.

## Scripts

- `npm run dev` starts the local Vite server.
- `npm run dev:ensure` starts the dev server only when `5173` is not already in use.
- `npm run test` runs the mission-critical flow tests.
- `npm run build` type-checks and builds the production PWA.
- `npm run share` starts a static preview + Cloudflare tunnel and prints a share URL.
- `npm run status` shows git sync, local ports, tunnel state, and the current share URL.

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
