# Split — Expense Splitter

A web app for splitting shared bills across friends. Upload a receipt photo or
enter items by hand, assign each line to the people who shared it, log who
actually paid, and the app returns the **minimal set of payments** needed to
settle every debt.

The frontend is a static **Vite + React 19 + TypeScript** SPA hosted on
**GitHub Pages**. Receipt parsing is handled by a tiny **Cloudflare Worker**
(free tier) that gates a call to the **Anthropic Claude API** behind Google
Sign-In and a server-side email allowlist. There is no database — share links
are entirely URL-encoded.

## Features

- Multi-receipt sessions with a shared people roster
- Per-item assignment with even-split rounding-safe math
- Tax & tip proration (manual override + zero-out shortcuts)
- Payment logging with running unallocated total
- Greedy minimal-payment settlement algorithm
- Shareable read-only links (state encoded in the URL + QR code)
- CSV and PDF export from the settlement panel
- In-browser OCR with [Tesseract.js](https://tesseract.projectnaptha.com),
  parsed by [Claude](https://www.anthropic.com/claude) via the Worker
- Google Sign-In gate on OCR + email allowlist (so only you spend tokens)
- Manual entry fallback when OCR fails or auth is unavailable
- Drafts persisted in `localStorage` (debounced)

## Architecture

```
Browser (GitHub Pages)
  ├─ Tesseract runs locally → raw OCR text
  ├─ Sign in with Google → ID token (JWT)
  └─ POST /ocr  Authorization: Bearer <jwt>
                       │
                       ▼
       Cloudflare Worker (free tier)
       ├─ Verify JWT against Google JWKS (jose)
       ├─ Check email is in ALLOWED_EMAILS
       ├─ Call Anthropic Claude with API key (Worker secret)
       └─ Return parsed JSON
```

- **Frontend cost**: $0 (GitHub Pages, public repo).
- **Worker cost**: $0 up to 100k requests/day on Cloudflare Workers free plan.
- **Only ongoing cost**: Anthropic tokens (cents per receipt).

## Local development

```bash
# 1) Install frontend deps
npm install

# 2) Install Worker deps
(cd worker && npm install)

# 3) Configure environment
cp .env.example .env.local            # fill in VITE_GOOGLE_CLIENT_ID
cp worker/.dev.vars.example worker/.dev.vars  # fill in ANTHROPIC_API_KEY

# 4) Edit worker/wrangler.toml and set
#    GOOGLE_CLIENT_ID, ALLOWED_EMAILS (your address), and ALLOWED_ORIGINS

# 5) Run both processes side by side
(cd worker && npm run dev)            # Cloudflare Worker on :8787
npm run dev                           # Vite app on :5173
```

Then open <http://localhost:5173>.

> Manual entry works without any setup. OCR additionally requires the Worker,
> a Google Client ID, and your email in `ALLOWED_EMAILS`.

## Deployment

This project deploys via two GitHub Actions workflows:

- `.github/workflows/deploy-pages.yml` — builds the Vite app and publishes it
  to GitHub Pages on every push to `main`.
- `.github/workflows/deploy-worker.yml` — deploys the Cloudflare Worker (and
  pushes the Anthropic secret) when files under `worker/**` change.

### One-time setup

#### 1. Google Cloud Console

1. Create or pick a project.
2. APIs & Services → Credentials → **Create Credentials → OAuth client ID**.
3. Type: **Web application**. Authorized JavaScript origins:
   - `https://<your-username>.github.io`
   - `http://localhost:5173`
4. Copy the **Client ID** (looks like `xxxxx.apps.googleusercontent.com`).

#### 2. Cloudflare account

1. Sign up at <https://dash.cloudflare.com>.
2. Note your **Account ID** (right sidebar of the dashboard).
3. Create an **API Token** with the “Edit Cloudflare Workers” template.

#### 3. Edit `worker/wrangler.toml`

Set `GOOGLE_CLIENT_ID`, `ALLOWED_EMAILS`, and `ALLOWED_ORIGINS` to match your
deployment. To add a friend later, append their email to `ALLOWED_EMAILS` and
push — the worker workflow re-deploys automatically.

#### 4. GitHub repository configuration

Settings → Pages → **Source: GitHub Actions**.

Settings → Secrets and variables → Actions → **New repository secret**:

| Secret name             | Value                                                     |
| ----------------------- | --------------------------------------------------------- |
| `VITE_GOOGLE_CLIENT_ID` | The OAuth Client ID from step 1                           |
| `VITE_OCR_ENDPOINT`     | `https://expense-splitter-ocr.<sub>.workers.dev/ocr`      |
| `CLOUDFLARE_API_TOKEN`  | The API token from step 2                                 |
| `CLOUDFLARE_ACCOUNT_ID` | The account ID from step 2                                |
| `ANTHROPIC_API_KEY`     | Your Anthropic key — pushed to the Worker on every deploy |

> `VITE_*` values are baked into the public bundle — they are not secrets in
> the cryptographic sense. `ANTHROPIC_API_KEY` is the only true secret here
> and it never leaves the Worker runtime.

#### 5. Push

The first push to `main` will:

- run lint + tests, build the SPA with `VITE_BASE_PATH=/Expense-Splitter/`,
  publish `dist/` to GitHub Pages, and
- deploy the Worker (if the push touches `worker/**`).

Visit `https://<your-username>.github.io/Expense-Splitter/` and sign in.

## Scripts

| Command                 | Description                                          |
| ----------------------- | ---------------------------------------------------- |
| `npm run dev`           | Vite dev server with HMR                             |
| `npm run build`         | Type-check and produce a production build in `dist/` |
| `npm run preview`       | Preview the production build                         |
| `npm run lint`          | ESLint                                               |
| `npm run format`        | Prettier write                                       |
| `npm run test`          | Vitest unit + component tests                        |
| `npm run test:coverage` | Vitest with coverage                                 |
| `npm run check`         | Lint + format check + test + build                   |

Worker-side, from `worker/`:

| Command             | Description                              |
| ------------------- | ---------------------------------------- |
| `npm run dev`       | `wrangler dev` — local Worker on `:8787` |
| `npm run typecheck` | TypeScript type-check                    |
| `npm run deploy`    | `wrangler deploy` (CI does this for you) |

## Project layout

This project follows **feature-first** organization (see
[`.cursor/rules/react-foundations.mdc`](.cursor/rules/react-foundations.mdc)).
Each feature owns its components, types, hooks, services, and tests:

```
src/
  app/                 # router, providers, top-level pages
  features/
    auth/              # Google Sign-In context, decoded JWT, header UI
    session/           # data model, reducer, storage, useSession
    people/            # roster + colored avatar pills
    receipts/          # receipt card, item rows, tax/tip, manual entry, OCR scan flow
    payments/          # who-paid logger
    settlement/        # balance + greedy settlement algorithm + panel
    sharing/           # base64 URL encoding + share modal with QR
    export/            # CSV + PDF generation + dropdown menu
    ocr/               # Tesseract runner + /ocr client + zod schema
  shared/              # cross-feature primitives, hooks, utilities
worker/                # Cloudflare Worker — Google JWT verify + Claude proxy
.github/workflows/     # GitHub Pages + Cloudflare Worker deploy
```

## Money handling

All monetary values are stored as **integer cents**. Conversions happen only at
the UI boundary in `src/shared/utils/money.ts`. The `splitEvenly` helper
guarantees that any split sums to exactly the input total — rounding remainders
are distributed to the first elements rather than dropped.

## Sharing model

`buildShareUrl` encodes the entire session state (minus heavy image data URLs)
into a base64 URL parameter and uses **hash routing** so GitHub Pages serves a
single static `index.html` for every URL. The shared route at
`#/session/:id?data=…` decodes the payload and renders read-only views. There
is no backend; the URL warns above ~1800 characters and suggests a screenshot
fallback.

## Testing

- Unit tests for all settlement primitives (`splitEvenly`, `prorateExtras`,
  `computeBalances`, `computeSettlements`) plus the spec's example session
- Reducer tests across the full action set
- Share encode/decode round-trip + corruption cases
- ID-token decoding edge cases
- React Testing Library tests for the people roster
- An end-to-end manual-entry → settlement integration test in
  `src/app/pages/HomePage.test.tsx`

External dependencies (Tesseract, the Worker, Google Sign-In) are mocked at
their boundaries; internal modules are not mocked.
