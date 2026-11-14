# Changelog

All notable changes to Foghorn are documented here. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows [Semantic Versioning](https://semver.org/).

## [0.1.0] - 2026-11-14

First release, built at the Boat Hackathon.

### Added

- **Six accessibility personas** in one scan: WCAG Auditor (axe-core, WCAG 2.2 AA tags), Screen-reader user (accessibility-tree transcript), Keyboard-only user (Tab walk with focus-ring and trap detection), Low-vision & color-blind (contrast plus color-vision and blur simulations), Motor / tremor (24 px target size, WCAG 2.5.8), and Cognitive load (Flesch-Kincaid reading level).
- **Blind agent** that tries to complete a task (for example add to cart and check out) using only screen-reader output, with an LLM policy and an offline heuristic fallback. It explains exactly which barrier stopped it.
- **Accessibility score** (0–100, A–F) with a per-category penalty breakdown.
- **Risk indicator** (LOW / ELEVATED / HIGH / SEVERE) based on severity, blocked flows, most-litigated barrier categories, e-commerce signals and jurisdiction. Clearly labeled as not legal advice.
- **Deterministic source-level fixes** for missing alt text, unnamed buttons and links, unlabeled fields, page language, page title, color contrast (computed with WCAG luminance math), landmarks and headings, mouse-only controls, keyboard traps and missing focus rings.
- **AI-assisted fixes** through NY Token Exchange with a zero-data-retention privacy floor and per-call cost, including a React/JSX version.
- **Human approval gate** for every fix, plus **sandbox verification** that re-runs the audit and the blind agent with approved fixes applied and shows the before/after score. Fixes are never shipped as an overlay.
- **Tamper-evident evidence chain**: every action is SHA-256 hash-chained, with chain verification and JSON export.
- **Exports**: Markdown report, before/after `.diff`, evidence JSON and the sandbox verification patch.
- **Continuous monitoring** with Context.dev change monitors (or a local 15 s watcher), automatic re-audit and regression alerts.
- **boat.dev cloud VMs** with a live desktop stream and VM cost ticker; local headless Chromium fallback.
- **Multi-page audits** using Context.dev page discovery or same-origin link crawling.
- **Live streaming UI** over Server-Sent Events.
- **Driftwood Outfitters demo shop** (broken and repaired versions) with a regression toggle, so the demo works offline.
- **Works with no API keys**: every integration falls back to local, deterministic behavior.
- Repository hygiene: CI workflow, issue and pull request templates, Code of Conduct, security policy, architecture docs and the idea-selection research write-up.

[0.1.0]: https://github.com/vnmoorthy/foghorn/releases/tag/v0.1.0
