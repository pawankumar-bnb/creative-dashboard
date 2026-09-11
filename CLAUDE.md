# creative-dashboard — working notes for Claude

**What this is:** Relay, Brick&Bolt's creative-ops relay (Marketing → Content → Creative → Review → Approved) with per-stage TAT and SLA breach flags. Plain HTML/CSS/JS, no build step. See README.md for the full description.

## Deployment rules (set by Pawan)

- **Every change gets committed and pushed to `main` on `pawankumar-bnb/creative-dashboard` directly** — the GitHub Pages workflow (`.github/workflows/deploy.yml`) redeploys the live site on push: https://pawankumar-bnb.github.io/creative-dashboard/
- Keep the claude.ai Artifact in step when app files change: `node scripts/build-artifact.mjs`, then publish `dist/artifact.html` + `app.css` + `app.js` + `samples.js` to https://claude.ai/code/artifact/cdd21a37-4c21-4689-b76f-5eecd33bbad2 (capabilities `db` + `downloads`; omit `capabilities` on a redeploy to keep them).

## Data model reminders

- Artifact viewer → `DbStore` (shared realtime `db`). Static hosting → `LocalStore` (per-browser demo mode) until a real backend adapter exists.
- `pawankumar@bricknbolt.com` is the always-admin owner (`APP.ownerEmail` in app.js). Sign-in is a roster check, not auth.
- Flow/settings live in the `config` collection (`flow`, `settings`, `counter`); people in `members` (doc id = lower-cased email); requests in `requests` (doc id = display id like `BB-0001`). Stage timing = `visits[]` on each request; TAT is computed from timestamps at read time (respects the working-hours setting).
- Stage colours were validated for colour-vision safety with the dataviz palette validator — keep the aqua/violet/orange set unless re-validated.
