# creative-dashboard — working notes for Claude

**What this is:** Creative Request Ops (formerly "Relay"), Brick&Bolt's creative-ops flow (Requested → Brief & assign by the coordinator → In production by design/video → QC → Final approval by requester-or-admin → Approved) with per-task TAT set by the coordinator, per-stage SLAs, breach flags, and the assignee's TAT stored on approval. Plain HTML/CSS/JS, no build step. See README.md for the full description.

## Deployment rules (set by Pawan)

- **Every change gets committed and pushed to `main` on `pawankumar-bnb/creative-dashboard` directly** — the GitHub Pages workflow (`.github/workflows/deploy.yml`) redeploys the live site on push: https://pawankumar-bnb.github.io/creative-dashboard/
- Keep the claude.ai Artifact in step when app files change: `node scripts/build-artifact.mjs`, then publish `dist/artifact.html` + `app.css` + `app.js` + `samples.js` to https://claude.ai/code/artifact/cdd21a37-4c21-4689-b76f-5eecd33bbad2 (capabilities `db` + `downloads`; omit `capabilities` on a redeploy to keep them).

## Auth & storage

- Website: Clerk (publishable key in `config.js`, ClerkJS loaded from the instance domain encoded in the key) + Supabase `docs` table via `SupabaseStore`. Artifact: roster gate + artifact db. Local/static: roster gate + localStorage.
- Supabase RLS needs the Clerk session token to carry `role: authenticated` (Clerk Supabase integration) and an `email` claim (session token customization). `supabase/schema.sql` is the source of truth for policies; `supabase/seed.sql` is generated from the app defaults + samples (regenerate with the node snippet in git history if defaults change).
- Clerk can't run inside the artifact (CSP), so `scripts/build-artifact.mjs` strips the `<!-- site:start -->…<!-- site:end -->` block.

## Domains & Clerk instances

- Production site: https://creative.bricknbolt.com (GitHub Pages custom domain, `CNAME` file in repo). Clerk production instance `ins_3JKZ5DCCAuXLjxtWVaEF1RU91hU` is bound to it (Frontend API `clerk.creative.bricknbolt.com`, key `pk_live_…` chosen by hostname in `config.js`); the dev instance (`pk_test_…`) serves github.io/localhost.
- Supabase third-party auth must list BOTH Clerk domains (dev `famous-weasel-9594.clerk.accounts.dev` and prod `clerk.creative.bricknbolt.com`).
- Production Google sign-in needs custom OAuth credentials in Clerk (redirect URI `https://clerk.creative.bricknbolt.com/v1/oauth_callback`).

## Email notifications

- `supabase/notifications.sql` → trigger `docs_notify` on `public.docs` posts events via `pg_net` to the Apps Script mailer (`mailer/Code.gs`) — token in Vault (`mailer_token`), URL + app_url in `public.mailer_config` (RLS, no policies). Master switch = `config/settings.notifications.enabled` (Settings page).
- Events: raised, assigned, reassigned, submitted, rework, qc_passed, approved, reopened, cancelled. Actor excluded from recipients.

## Data model reminders

- Artifact viewer → `DbStore` (shared realtime `db`). Static hosting → `LocalStore` (per-browser demo mode) until a real backend adapter exists.
- `pawankumar@bricknbolt.com` is the always-admin owner (`APP.ownerEmail` in app.js). Sign-in is a roster check, not auth; allowed domains self-register as Requester.
- Flow/settings live in the `config` collection (`flow`, `settings`, `counter`); people in `members` (doc id = lower-cased email); requests in `requests` (doc id = task id like `BB-0001`). Stage timing = `visits[]`; the work stage uses `slaFrom:'task'` → the request's `tatHours`; `result{}` is written by `finalizeResult()` when a request enters the end stage. Stage kinds: start / triage / work / review / end; review stages carry `reviewers` (`requester`, `role:<id>`).
- Stage colours (aqua #1baf7a, violet #4a3aa7, orange #eb6834, blue #2a78d6, with dark steps in `DARK_COLORS`) were validated for colour-vision safety with the dataviz palette validator — re-validate before changing.
