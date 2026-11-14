# Contributing to Foghorn

Thanks for helping make the web easier to hear.

## Getting started

```bash
cd web
npm install
npm run dev
```

Requires Node 20+ and Google Chrome. Open http://localhost:5173 and run the Driftwood Outfitters demo to confirm everything works. No API keys are needed; integrations fall back to offline heuristics, direct fetch and local Chromium.

## Making a change

1. Fork the repo and create a branch from `main`.
2. Keep changes focused: one persona check, fix recipe or UI improvement per PR.
3. Run `npm run build` in `web/` and make sure it passes.
4. If you add a check or fix, add a matching broken element to `web/server/demo/driftwood.html` and its repaired version to `driftwood-fixed.html`.
5. Describe what changed and how you verified it, ideally with a before/after screen-reader transcript.

## Good first contributions

- New persona checks (with the WCAG success criterion they map to)
- Deterministic fix recipes in `web/server/engine/fixes.ts`
- Better color-vision-deficiency simulation matrices
- Accessibility improvements to Foghorn's own UI (we should pass our own audit)

## Ground rules

- Fixes must stay behind the human approval gate. Never auto-apply changes.
- Don't send page content to an LLM without respecting `NYTE_PRIVACY`.
- Be kind. Feedback from disabled users and accessibility practitioners outranks any automated score.

By contributing, you agree your work is licensed under the [MIT License](LICENSE).
