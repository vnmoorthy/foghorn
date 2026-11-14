# Security Policy

## Reporting a vulnerability

Please **do not** open a public issue for security problems.

Report vulnerabilities privately through GitHub Security Advisories:
https://github.com/vnmoorthy/foghorn/security/advisories/new

Include what you found, how to reproduce it, and the impact you expect. We will acknowledge the report, work with you on a fix, and credit you in the advisory unless you prefer to stay anonymous.

## Supported versions

Foghorn is early-stage software. Security fixes are applied to the latest release on `main` only.

| Version | Supported |
| ------- | --------- |
| 0.1.x   | Yes       |
| < 0.1   | No        |

## Running Foghorn safely

Foghorn drives a **real browser** against **user-supplied URLs**. It loads arbitrary third-party pages, executes their JavaScript, takes screenshots, and (when the blind agent runs) clicks buttons and types into forms. Treat it like any other tool that browses untrusted content.

- **Isolate the browser in production.** Run scans inside a disposable, isolated VM such as a [boat.dev](https://boat.dev) sandbox (set `BOAT_API_KEY`), not on a machine that holds credentials, internal network access or other sensitive data. The local Chromium fallback is intended for development and demos.
- **Only test sites you have permission to test.** Never point Foghorn at websites you do not own or are not authorized to audit. The blind agent submits forms with sample data, which can create real side effects on a live site.
- **Do not expose the API publicly without protection.** The Express server has no authentication. Anyone who can reach it can start scans against any URL, including internal addresses reachable from the host. Put it behind authentication and network controls if you deploy it.
- **Keep secrets out of the repo.** API keys (`NYTE_API_KEY`, `CONTEXT_DEV_API_KEY`, `BOAT_API_KEY`, and others) belong in `.env`, which is git-ignored.
- **Respect the privacy floor.** Audits can contain private page content. When routed through NY Token Exchange, Foghorn requests a zero-data-retention (`zdr`) privacy floor by default via `NYTE_PRIVACY`. Do not weaken it for sensitive sites.
- **Scan data stays local.** Scan results and screenshots are written to `web/data/`. Delete that directory to remove them.
