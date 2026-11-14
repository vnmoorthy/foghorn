# Foghorn architecture

Foghorn is a React (Vite) frontend in `web/src` and an Express API in `web/server` (`tsx server/index.ts`, port `8787` by default). The server drives Chromium with Playwright, runs six accessibility personas and a blind agent, builds source-level fixes, verifies them in a sandbox, and records every action in a SHA-256 hash chain.

Every external integration is optional and has a fallback, so the full pipeline runs with no API keys.

| Layer | With a key | Fallback |
|---|---|---|
| Compute (`lib/boat.ts`) | boat.dev cloud VM with a live desktop (`BOAT_API_KEY`) | Local headless Chromium |
| Web context (`lib/context.ts`) | Context.dev scrape, map, search and monitors (`CONTEXT_DEV_API_KEY`) | Direct `fetch`, same-origin link crawl, local 15 s watcher |
| LLM (`lib/llm.ts`) | NY Token Exchange (`NYTE_API_KEY`), else OpenAI, else Anthropic | Deterministic heuristics |

## Pipeline

```
POST /api/scans {url, goal?}
  ├─ attachVm()             boat.dev sandbox + live desktop (if BOAT_API_KEY)
  └─ runScan()              engine/scan.ts
       ├─ load page, screenshot, page discovery (Context.dev map or link crawl, up to 3 pages)
       ├─ 6 personas         axe · screen reader · motor · cognitive · vision · keyboard
       ├─ secondary pages    axe only
       ├─ computeScore()     0–100 + grade
       ├─ computeRisk()      risk indicator
       └─ buildFixes()       engine/fixes.ts
  └─ runBlindAgent(goal)    engine/agent.ts (if a goal was given)

Human approves fixes ─► POST /verify ─► new scan + agent run with sandbox patch ─► before/after score
Every step ─► evidence() ─► SHA-256 chain ─► evidence.json / report.md
```

Progress streams to the UI over Server-Sent Events (`GET /api/scans/:id/events`), which replays past events and then pushes live ones.

## HTTP API (`web/server/index.ts`)

| Route | Purpose |
|---|---|
| `GET /api/status` | Active providers, which keys are set, LLM calls/tokens/cost and privacy floor |
| `GET /api/scans`, `GET /api/scans/:id` | List scans (summary) / full scan |
| `POST /api/scans` | Start a scan: `{ url, label?, goal?, maxPages? }` (default `maxPages` 3) |
| `GET /api/scans/:id/events` | SSE stream of scan events |
| `POST /api/scans/:id/agent` | Run the blind agent: `{ goal, patched? }` |
| `POST /api/scans/:id/fixes/:fixId/approve` | Approve or reject one fix (`{ approved }`) |
| `POST /api/scans/:id/fixes/approve-all` | Approve all fixes |
| `POST /api/scans/:id/fixes/:fixId/ai` | Rewrite one fix with the LLM (returns per-call cost) |
| `POST /api/scans/:id/verify` | Re-audit with approved fixes applied in the sandbox |
| `GET /api/scans/:id/patch.js` | Download the sandbox verification patch |
| `GET /api/scans/:id/fixes.diff` | Download before/after source diffs |
| `GET /api/scans/:id/evidence.json` | Download the evidence chain with its verification result |
| `GET /api/scans/:id/evidence/verify` | Verify the evidence chain |
| `GET /api/scans/:id/report.md` | Markdown report |
| `POST/GET /api/monitors`, `DELETE /api/monitors/:id`, `POST /api/monitors/:id/check` | Change monitors |
| `POST /api/webhooks/context` | Context.dev change webhook, triggers re-scan |
| `GET /api/monitors/events` | SSE stream of monitor alerts |
| `POST /api/scans/:id/vm/stop` | Stop the boat.dev VM |
| `GET /demo/driftwood`, `/demo/driftwood-fixed` | Built-in broken / repaired demo shop |
| `GET/POST /api/demo/regress` | Toggle a demo regression (drops one alt, unlabels the cart button, hides focus rings) |

In production, the server also serves the built frontend from `web/dist`.

## Scanning and personas (`engine/scan.ts`)

The browser is Chrome (or `CHROME_PATH`), falling back to bundled Chromium. Each context is 1280×800 with CSP bypassed, and injects `engine/inpage.js` (the `window.__fh` helpers that walk the accessibility tree, report focus, measure targets and extract text). Cookie banners are dismissed with privacy-preserving choices first ("Reject all", "Only necessary", "Decline").

| Persona | What it does |
|---|---|
| **WCAG Auditor** | Injects axe-core with tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`, `best-practice`. Keeps up to 25 nodes per rule with their on-page rectangles. |
| **Screen-reader user** | Walks the accessibility tree (`__fh.walk`, up to 320 announcements). Counts mouse-only controls (`generic-clickable`) and unlabeled elements. |
| **Motor / tremor** | Counts targets smaller than 24 px (WCAG 2.5.8). |
| **Cognitive load** | Flesch-Kincaid grade level of the page text: ≤ 6 Easy, ≤ 9 Plain, ≤ 12 Hard, else Very hard. |
| **Low-vision & color-blind** | Reports axe `color-contrast` failures; the UI provides deuteranopia, protanopia, tritanopia and blur simulations. |
| **Keyboard-only user** | Presses Tab up to 45 times. Records each focus stop, whether it has a visible focus ring, and a screenshot every third stop. A trap is detected when focus stays on the same element for 2+ repeats while Tab is being prevented. |

Secondary pages get the axe audit only, and their violations are weighted at 0.35 in the score.

### Score

Starts at 100; penalties are subtracted, then clamped to 0–100 and rounded.

| Component | Penalty |
|---|---|
| WCAG violations (axe-core) | For each violation: `impactWeight × min(1 + log2(nodes), 4) × pageWeight`, where `impactWeight` is critical 11, serious 6, moderate 2.5, minor 0.8, and `pageWeight` is 1 for the home page and 0.35 for others. Capped at **55**. |
| Screen-reader barriers | `mouseOnlyControls × 1.5 + unnamedElements × 1.2`, capped at **14** |
| Keyboard access | `+12` if trapped; `+ min(6, noRingStops × 0.4)`; if not capped by the 45-tab limit, `+ max(0, 1 − reachable / clickables) × 8`. Capped at **20**. |
| Small touch targets | `smallTargets × 0.3`, capped at **4** |

Grade: A ≥ 90, B ≥ 80, C ≥ 65, D ≥ 50, otherwise F.

### Risk indicator

Sum of five factor weights, capped at 100. It is labeled "Risk indicator, not legal advice."

| Factor | Weight |
|---|---|
| Severity | `min(35, criticalRules × 7 + seriousRules × 3)` |
| Blocked key flow (any failed agent run, or a keyboard trap) | 25 if yes, else 0 |
| Most-litigated barriers present (out of 6) | `count × 5` |
| Public accommodation (e-commerce: transcript mentions cart, checkout, shop, buy, price or a `$` amount) | 10 if yes, else 3 |
| Jurisdictions (host ends in `.eu .de .fr .it .es .nl .ie .be .at .pt .se .fi .dk .pl`) | 10 if EU (US ADA + EU Accessibility Act), else 5 |

The six barrier categories are: images without text alternatives (`image-alt`, `role-img-alt`), form fields without labels (`label`, `select-name`), unlabeled buttons and links (`button-name`, `link-name`, `input-button-name`, or any mouse-only control), low-contrast text (`color-contrast`), keyboard-inaccessible controls or traps (a trap or any mouse-only control), and missing page language (`html-has-lang`).

Level: **SEVERE** ≥ 70, **HIGH** ≥ 45, **ELEVATED** ≥ 20, otherwise **LOW**.

Score and risk are recomputed after every blind agent run, so a failed run raises the risk.

## Blind agent (`engine/agent.ts`)

The agent tries to complete a goal (default: "Add the Yellow Storm Raincoat to the cart and check out") using only what a screen-reader user perceives, for up to 14 steps.

**Observation model.** Each step it walks the accessibility tree (up to 260 items) and drains live-region announcements. The observation contains:

- `[id] speech` for operable controls, which the agent may activate or type into
- `(text) ...` for plain text, **including mouse-only clickable divs**, which are heard but cannot be activated
- landmark and list boundaries
- nothing at all for silent controls with no name
- an `ANNOUNCED SINCE LAST ACTION` line for live-region output

**Decision.** If an LLM is configured, it receives a system prompt telling it that it is completely blind and must return JSON `{ thought, speak, action: activate | type | done | give_up, id, text }`. If no LLM is available, or the call fails, a deterministic **heuristic policy** decides instead:

- It stops with `done` when a confirmation ("order placed", "thank you for your order", "order confirmed", "thanks for subscribing") is announced or appears after pressing an order button.
- For shopping goals it follows add to cart, then checkout (opening the cart first if needed), then fills recognizable fields with sample data (name, email, address, city, ZIP, phone, the 4242 test card; skipping newsletter, search and chat fields), then presses place order / pay / complete.
- For other goals it activates the button or link whose name best overlaps the goal words, and finishes when a heading matches.
- Otherwise it gives up and explains the barrier: a control it can hear only as text, controls that make no sound, buttons that only say "button", or no announcement after its last action.

**Acting.** Controls are activated like a screen reader would: focus, then **Enter**. A mouse click is used only if focus fails. Each step is screenshotted, streamed and added to the evidence chain.

## Fixes (`engine/fixes.ts`)

### Deterministic fixes

`buildFixes()` creates source-level before/after snippets for home-page violations (up to 12 nodes per rule), then dedupes by rule and selector.

| Rule | Fix |
|---|---|
| `image-alt`, `role-img-alt`, `input-image-alt` | Add `alt`: "*Site* logo" for logos and header/nav images, otherwise the nearest heading or text below the image, otherwise the file name |
| `button-name`, `link-name` | Add `aria-label` inferred from icon words in the HTML (cart, search, account, menu, close, social networks, etc.) or the link's last path segment |
| `input-button-name` | Add a name (default "Subscribe") |
| `label`, `select-name` | Add a label from the placeholder or `name` attribute |
| `html-has-lang` | `<html lang="en">` |
| `document-title` | Add a descriptive `<title>` |
| `color-contrast`, `color-contrast-enhanced` | Compute a passing color (see below) |
| `heading-order`, `page-has-heading-one`, `landmark-one-main`, `region` | Structural fix (one per rule) |
| Mouse-only controls from the screen-reader persona (`fh-mouse-only-control`) | Replace the clickable `<div>` with `<button type="button">`, adding `aria-label` if it has no text |
| Keyboard trap (`fh-keyboard-trap`) | Remove the Tab interception |
| Missing focus rings (`fh-focus-visible`) | `:focus-visible { outline: 3px solid #1a5fff; outline-offset: 2px; }` |

Any fix can be rewritten by the LLM (`aiFix`), which returns a plain-language explanation, corrected HTML, a React/JSX version and who is affected. Its system prompt says to never recommend overlays.

### WCAG contrast math

Relative luminance uses the WCAG formula: each sRGB channel `v/255` is linearized as `v/12.92` if `≤ 0.03928`, otherwise `((v + 0.055) / 1.055)^2.4`, then `L = 0.2126 R + 0.7152 G + 0.0722 B`. Contrast is `(L_lighter + 0.05) / (L_darker + 0.05)`.

`fixContrast(fg, bg, target = 4.5)` keeps the hue and moves the foreground toward black (if the background luminance is above 0.4) or toward white, in 1% steps, until the ratio reaches `target + 0.05`. The target comes from axe's `expectedContrastRatio` when present.

### Sandbox verification patch

`buildPatchScript()` turns the approved fixes into a script that is injected with `addInitScript` **only in Foghorn's own sandboxed browser** to verify that the fixes work. It is never meant to ship as an overlay; the downloadable `patch.js` says so in its header. It sets attributes, `lang`, titles and inline styles; adds the focus-visible CSS; turns mouse-only controls into `role="button"` with `tabindex="0"` and Enter/Space handlers; stops Tab interception on a trapped element; adds missing landmarks, `<main>` and an `h1`; marks toast-like elements as `role="status"`; and re-applies on DOM mutations.

`POST /api/scans/:id/verify` approves all fixes if none were approved, builds the patch, records its SHA-256 in the evidence chain, creates a new verification scan with the patch applied (1 page), re-runs the last agent goal, and logs the before and after scores.

## Evidence chain (`engine/store.ts`)

Each entry is `{ seq, at, kind, detail, prev, hash }`. The first `prev` is `GENESIS`, and:

```
hash = SHA-256( prev + JSON.stringify({ seq, at, kind, detail }) )
```

`verifyChain()` recomputes every hash and reports the first broken `seq`, or `{ ok: true, length, head }`. Page screenshots are hashed as `screenshotSha256`. Entries are written for scan start and complete, page loads, axe results, persona results, agent start, steps and finish, fix approval and rejection, AI fixes, verification, monitors and VM lifecycle.

Scans are persisted to `web/data/scans.json` (last 60), and screenshots to `web/data/shots/`. Scans that were running when the server stopped are marked as errors on restart.

## Integrations

### LLM: NY Token Exchange (`lib/llm.ts`)

Uses the OpenAI SDK against an OpenAI-compatible endpoint. With `NYTE_API_KEY` (or `TR_API_KEY` / `TRUSTEDROUTER_API_KEY`) it calls `https://api.nytokenexchange.com/v1` (override with `NYTE_BASE_URL`), model `nyte/auto` (override with `NYTE_MODEL`). Because audits can contain private page content, every request carries a **privacy floor**: `provider: { min_privacy: NYTE_PRIVACY || 'zdr' }` (zero data retention). Falls back to `OPENAI_API_KEY` (default `gpt-4o-mini`), then `ANTHROPIC_API_KEY` (default `claude-haiku-4-5`), then offline heuristics. Calls, tokens, models used and cost (`usage.cost_microdollars`) are tracked and shown in `/api/status`.

### Web context: Context.dev (`lib/context.ts`)

With `CONTEXT_DEV_API_KEY`: `/web/urls` maps a domain to discover pages to audit, `/web/scrape` returns page markdown, `/web/search` runs searches, and `/monitors` creates change monitors that post to `/api/webhooks/context` (requires `PUBLIC_URL`). Without a key, page discovery uses same-origin links and monitors use a local watcher that hashes the page HTML every 15 s. Either way, a change triggers a one-page re-scan and a regression alert when the score drops.

### Compute: boat.dev (`lib/boat.ts`)

With `BOAT_API_KEY`, each scan gets an isolated boat.dev sandbox (30-minute TTL). Foghorn waits for it to be ready, gets a public live-desktop URL for the UI, and opens the audited site in Chrome on the VM's desktop so viewers can watch. The VM's rate ($0.036/hour) is tracked for the cost ticker, and `POST /api/scans/:id/vm/stop` stops it. The audit itself is driven by Playwright from the server.
