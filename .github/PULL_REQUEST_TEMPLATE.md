## What does this change?

<!-- One or two sentences. Link any related issue: "Closes #123". -->

## Why?

<!-- The user-facing problem this solves. Who is affected? -->

## How did you verify it?

<!-- Ideally a before/after screen-reader transcript, score, or screenshot from scanning /demo/driftwood. -->

## Checklist

- [ ] `npm run build` passes in `web/`
- [ ] I tested with keyboard only (Tab, Shift+Tab, Enter, Space, Escape)
- [ ] No overlays: fixes are source-level, and the injected patch is used only for sandbox verification
- [ ] Fixes stay behind the human approval gate (nothing is auto-applied)
- [ ] New checks or fix recipes cite the WCAG success criterion they map to
- [ ] If I added a check or fix, I added a broken example to `web/server/demo/driftwood.html` and its repair to `driftwood-fixed.html`
- [ ] Page content sent to an LLM respects `NYTE_PRIVACY`
- [ ] No secrets, API keys or private URLs are included
