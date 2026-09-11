# Relay — Creative Ops for Brick&Bolt

A workflow app that moves marketing requirements through the team as a relay:

```
Requirement → Content → Creative → Review → Approved
   (Marketing)   (Content)  (Creative)  (Marketing)
```

- **Roles** — Marketing raises and approves, Content and Creative own their stages, Admin manages the team, the flow and settings.
- **Handoffs** — claim or assign a stage, mark it done, Creative must attach the final file link, the requester approves or requests edits (which loops back as a new round).
- **TAT & SLA** — every stage visit is timed; SLA meters go amber at 75% and red when breached, with breach flags on cards, columns, the queue and the dashboard. Optional working-hours clock.
- **Dashboard** — open requests, waiting-on-you, SLA breaches, average end-to-end TAT, on-time %, WIP by stage, turnaround vs SLA per stage, weekly throughput, activity feed, CSV export.
- **Configurable flow** — admins can rename, reorder, add and remove stages, set owner roles, SLA hours and edit-loop targets without touching code.

**Live site:** https://pawankumar-bnb.github.io/creative-dashboard/ — every push to `main` redeploys it (see `.github/workflows/deploy.yml`).

## Files

| File | What it is |
|---|---|
| `index.html` | Page shell (fonts, GSAP from cdnjs, app scripts) |
| `app.css` | Design tokens (light + dark), layout, components, motion |
| `app.js` | All application logic: stores, permissions, actions, metrics, views, charts, routing |
| `samples.js` | Sample requests (marked `sample`) for demo mode and first-run seeding |
| `scripts/build-artifact.mjs` | Builds `dist/artifact.html` for the claude.ai Artifact viewer |
| `.github/workflows/deploy.yml` | GitHub Pages deployment on push to `main` |

No build step, no framework, no dependencies to install.

## Where the data lives

The app has a small storage adapter (`LocalStore` / `DbStore` in `app.js`) and picks one at start-up:

| Deployment | Storage | Shared across the team? |
|---|---|---|
| claude.ai Artifact (`window.claude` present) | Artifact `db` — realtime document store | **Yes** — every viewer sees the same data live |
| GitHub Pages / any static host | `localStorage` ("Demo mode") | **No** — each browser has its own copy |

To make the public site multi-user, add a third adapter with the same five methods (`subscribe`, `get`, `set`, `update`, `del`, `add`, `nextNumber`) backed by a real database — Firebase Firestore maps almost one-to-one — and real sign-in (e.g. Google sign-in restricted to `@bricknbolt.com`).

## Sign-in model

Sign-in is a roster check: an admin adds a teammate's work email under **Team**, and that person signs in with it. It is not a password. On the artifact, the real access gate is the artifact's share list; on a public host it needs real authentication (see above).

The workspace owner, `pawankumar@bricknbolt.com`, is always treated as an admin so the team can never lock itself out.

## Run locally

Any static server works, for example:

```bash
python3 -m http.server 8765
```

then open http://localhost:8765/ — it runs in demo mode with the sample data.

## Publish to the claude.ai Artifact

```bash
node scripts/build-artifact.mjs
```

Publish `dist/artifact.html` together with `app.css`, `app.js` and `samples.js`, declaring the `db` and `downloads` capabilities.
