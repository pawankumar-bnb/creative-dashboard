# Creative Request Ops — Brick&Bolt

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
| `config.js` | Publishable keys for Clerk and Supabase (website only) |
| `supabase/schema.sql`, `supabase/seed.sql` | Database schema + RLS, and the first-run seed |
| `scripts/build-artifact.mjs` | Builds `dist/artifact.html` for the claude.ai Artifact viewer |
| `.github/workflows/deploy.yml` | GitHub Pages deployment on push to `main` |

No build step, no framework, no dependencies to install.

## Sign-in and where the data lives

The app picks its identity and storage at start-up:

| Where it runs | Identity | Storage | Shared? |
|---|---|---|---|
| **Website** (GitHub Pages / custom domain) with `config.js` filled in | **Clerk** — Google sign-in, only allow-listed domains | **Supabase** `docs` table, realtime, row-level security keyed on the Clerk token | **Yes** |
| Website with Clerk but no Supabase URL yet | Clerk | `localStorage` (per browser) — admin sees a setup banner | No |
| claude.ai Artifact | roster check (typed email) | Artifact `db` | Yes |
| Anything else (local file, plain static host) | roster check | `localStorage` ("Demo mode") | No |

`config.js` holds only **publishable** keys (safe in git). `supabase/schema.sql` creates the table, helper functions, realtime publication, RLS policies and a guard trigger (nobody can give themselves a role); `supabase/seed.sql` loads the flow, settings, roster and sample tasks. Run both once in the Supabase SQL editor.

Clerk must be configured with: Google enabled, the `bricknbolt.com` allow-list, the **Supabase integration** activated (adds `role: authenticated` to session tokens), and a session-token claim `"email": "{{user.primary_email_address}}"` (the RLS policies and the roster are keyed on it).

Roles still live in the app's roster (Team page): a first-time sign-in on an allowed domain becomes a Requester; admins grant Coordinator / Graphic design / Video editing / Admin. `pawankumar@bricknbolt.com` is always an admin.

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
