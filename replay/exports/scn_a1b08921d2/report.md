# Foghorn accessibility report

**Site:** https://example.com/  
**Scanned:** 2026-11-14T22:54:34.561Z  
**Score:** 73/100 (C)  
**Risk indicator:** ELEVATED — Risk indicator, not legal advice. Automated testing finds a subset of WCAG issues; pair with manual testing by disabled users.

## What disabled users experience

- **WCAG Auditor:** 3 rules · 9 elements — 0 critical, 0 serious
- **Screen-reader user:** 7 announcements — 0 mouse-only controls · 0 unlabeled
- **Keyboard-only user:** TRAPPED after 3 tabs — Focus stuck in html > body > a
- **Low-vision & color-blind:** Contrast OK — Simulations ready: deuteranopia · protanopia · tritanopia · blur
- **Motor / tremor:** 0 of 1 targets < 24px — WCAG 2.5.8 Target Size (Minimum)
- **Cognitive load:** Grade 10 · Hard — 83 words analysed

## WCAG failures (3)

### All page content should be contained by landmarks
- Rule: `region` · Impact: **moderate** · WCAG: best practice · Page: https://example.com/
- Elements: 7
- Example: `<p lang="en">This domain is for use in documentation examples without needing permission. This is not a service; avoid relying on it for testing and monitoring `
- Reference: https://dequeuniversity.com/rules/axe/4.14/region?application=axeAPI

### Document should have one main landmark
- Rule: `landmark-one-main` · Impact: **moderate** · WCAG: best practice · Page: https://example.com/
- Elements: 1
- Example: `<html lang="en">`
- Reference: https://dequeuniversity.com/rules/axe/4.14/landmark-one-main?application=axeAPI

### Page should contain a level-one heading
- Rule: `page-has-heading-one` · Impact: **moderate** · WCAG: best practice · Page: https://example.com/
- Elements: 1
- Example: `<html lang="en">`
- Reference: https://dequeuniversity.com/rules/axe/4.14/page-has-heading-one?application=axeAPI

## Fixes (4)

- [ ] **All page content should be contained by landmarks** () — `p[lang="en"]`
- [ ] **Document should have one main landmark** () — `html`
- [ ] **Page should contain a level-one heading** () — `html`
- [ ] **Release the keyboard trap** (wcag212) — `html > body > a`

## Evidence

6 hash-chained entries. Head: `e0d5456c44315a8e2f38c1c87fe82e985685e5d83e26e1b4afef059019d35d6b`. Chain valid: true.

_Risk indicator, not legal advice. Automated testing finds a subset of WCAG issues; pair with manual testing by disabled users._