# Creative Request Ops — Brick&Bolt

A workflow app that moves the branding team's requests through their team's flow.

**Graphic design**

```
Requested → Brief & assign → In production → QC → Final approval → Approved
 (anyone)    (coordinator)     (designer)   (coord.)  (requester or admin)
```

**Video editing**

```
Requested → Brief received → Assigned → Shoot → First cut → Final edit → QC & upload → Delivered
 (anyone)     (video lead)   (editor, who stays on by default through the three edit stages)   (video lead uploads)
```

1. **Anyone with a @bricknbolt.com email** signs in and raises a request. The type decides the team, and the request goes to that team's lead — the coordinator for design, the video lead for video.
2. **The lead** writes the brief and assigns it. The picker shows each person's current workload (open tasks, how many are due soon or already over) so the lead can assign on capacity. For design the lead also sets the task TAT; for video each stage runs on its own SLA.
3. **The editor** moves the task along: *Start shoot* (or **No shoot needed**, which skips straight to First cut) → *Shoot done* + footage link → *First cut ready* → *Ready for QC*. Every stage can have its own person — the lead can change who is on any one stage or all the remaining ones.
4. **QC** — design: the coordinator checks, then the requester or an admin gives final approval. Video: the lead checks, pastes the link to the uploaded file and the task is **Delivered**; the requester is notified. Sending it back starts a new round (R2, R3…).
5. On the final step the assignee's turnaround is stored on the task and rolls up into the *Team turnaround* table.

Every stage is timed against its limit (design: per-task TAT for production, 24h SLAs around it; video: a per-stage SLA the lead sets in Flow); breaches are flagged on cards, columns, the queue and the dashboard. The board shows that team's stage columns when a team filter is on, and five phase columns when it is not. Request types and their default TATs come from the team's tracker and are editable in Settings; the flow itself is editable by admins.

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
| `supabase/notifications.sql`, `mailer/Code.gs` | Stage-change email notifications + weekly-roster sheet sync (database trigger/RPCs + Apps Script) |
| `supabase/migrate-video-flow.sql` | One-off: installs the two-team flow and moves mid-flight video requests onto it |
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

## Email notifications

`supabase/notifications.sql` installs a trigger that watches every request write and queues one event per stage change in `public.mail_outbox`: **raised** → coordinator, **assigned / reassigned** → assignee (+ requester), **submitted for QC** → coordinator (+ requester), **rework** → assignee (+ requester), **QC passed** → requester + admins, **approved** → everyone on the task. The person who performed the action is never emailed.

The mailer is `mailer/Code.gs`, a Google Apps Script that runs on a 1-minute timer, claims queued events through two token-guarded RPCs (`mail_outbox_claim` / `mail_outbox_ack`) and sends from the admin's Brick&Bolt account. Setup: paste the script, set `TOKEN` to the same secret stored in Supabase Vault as `mailer_token`, run `setup()` once. No web-app deployment is needed (Workspace admins often block those). Master switch: Settings → Email notifications.

## Weekly roster

The **Weekly roster** tab mirrors the team's "Social media - Planner" Google Sheet. The mailer script (`mailer/Code.gs`) has an installable *onChange* trigger on the sheet plus the every-minute fallback: on any edit it reads the sheet (display values, blank leading rows/columns dropped) and pushes it through the token-guarded `roster_sync` RPC into `docs` (`roster/weekly`); the dashboard subscribes to it like everything else, so edits appear within seconds. Status columns render as chips; today's row is highlighted. The sheet stays the place to edit — the tab links to it.

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
