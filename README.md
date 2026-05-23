# Swim California Mission Control

Local-first PWA for coordinating high-risk endurance swim expeditions, now delivered in two distinct project modes:

- `Live Operational Project` (`/`): fully populated Catherine expedition data, logistics, protocols, and active operations workflows.
- `Reusable Template Project` (`/template`): generalized, client-ready framework with placeholders and onboarding guidance for new swimmers and routes.

## Scripts

- `npm run dev` starts the local Vite server.
- `npm run test` runs the mission-critical flow tests.
- `npm run build` type-checks and builds the production PWA.

## Codespaces

- `.devcontainer/devcontainer.json` forwards `5173` (Vite dev) and `4173` (static preview) by default.
- On attach, `.devcontainer/post-attach.sh` starts `npm run dev` automatically if nothing is listening on `5173`.
- Dev-server logs are written to `.codespaces/logs/vite-dev.log`.
- `npm run dev` serves the app at port `5173` with hostnames allowed for Codespaces and common tunnel domains.
- `npm run preview` serves the built app at port `4173`.
