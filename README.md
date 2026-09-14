# Relay — Creative Ops for Brick&Bolt

A workflow app that moves the branding team's requests through a relay:

```
Requested → Brief & assign → In production → QC → Final approval → Approved
 (anyone)    (coordinator)   (design/video)  (coord.)  (requester or admin)
```

1. **Anyone with a @bricknbolt.com email** signs in and raises a request (type, priority, needed-by, details).
2. **Every request goes to the coordinator (Sakshi)**, who confirms the details with the requester, writes the creative brief, picks the graphic-design or video person, and **sets the TAT** for that task. The task ID (e.g. `BB-0012`) is minted at submission.
3. **The assignee** sees the task in *My queue* with its TAT deadline, attaches the final file link and submits it.
4. **QC by the coordinator** — approve, or send back for rework (a new round).
5. **Final approval** — the requester *or* an admin (Pawan), whichever acts first. Changes go back to production.
6. On final approval the **assignee's production TAT** (actual vs target, rounds, on-time) is stored on the task and rolls up into the *Team turnaround* table.

Every stage is timed against its limit (coordinator SLA 24h, QC 24h, final approval 24h, production = per-task TAT); breaches are flagged on cards, columns, the queue and the dashboard. Request types and their default TATs come from the team's tracker and are editable in Settings; the flow itself is editable by admins.

**Live site:** https://pawankumar-bnb.github.io/creative-dashboard/ — every push to `main` redeploys it (see `.github/workflows/deploy.yml`).

## Files

| File | What it is |
|---|---|
| `index.html` | Page shell (fonts, GSAP from cdnjs, app scripts) |
| `app.css` | Design tokens (light + dark), layout, components, motion |
| `app.js` | All application logic: stores, permissions, actions, metrics, views, charts, routing |
| `samples.js` | Sample requests (marked `sample`) and the team roster for demo mode and first-run seeding |
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

Sign-in is a roster check: any email on an allowed domain (Settings → Who can sign in) self-registers as a Requester; admins give people the Coordinator / Graphic design / Video editing / Admin roles under **Team**. It is not a password. On the artifact, the real access gate is the artifact's share list; on a public host it needs real authentication (see above).

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
