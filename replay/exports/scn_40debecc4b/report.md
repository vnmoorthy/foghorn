# Foghorn accessibility report

**Site:** http://localhost:8787/demo/driftwood  
**Scanned:** 2026-11-14T23:10:28.915Z  
**Score:** 73/100 (C)  
**Risk indicator:** ELEVATED — Risk indicator, not legal advice. Automated testing finds a subset of WCAG issues; pair with manual testing by disabled users.

## What disabled users experience

- **WCAG Auditor:** 2 rules · 19 elements — 0 critical, 1 serious
- **Screen-reader user:** 115 announcements — 0 mouse-only controls · 0 unlabeled
- **Keyboard-only user:** 42 of 42 controls reachable — 0 focus stops had no visible ring
- **Low-vision & color-blind:** 18 low-contrast texts — Simulations ready: deuteranopia · protanopia · tritanopia · blur
- **Motor / tremor:** 3 of 42 targets < 24px — WCAG 2.5.8 Target Size (Minimum)
- **Cognitive load:** Grade 7.4 · Plain — 392 words analysed

## Blind agent runs

- **SUCCESS** · goal: “Add the Yellow Storm Raincoat to the cart and check out” (with fixes) — I hear: “Order placed!” I bought the raincoat, without seeing the screen.

## WCAG failures (2)

### Elements must meet minimum color contrast ratio thresholds
- Rule: `color-contrast` · Impact: **serious** · WCAG: wcag143 · Page: http://localhost:8787/demo/driftwood
- Elements: 18
- Example: `<p>Gear for the wet side of the map. Designed in Astoria, Oregon and field-tested from Tofino to Big Sur.</p>`
- Reference: https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=axeAPI

### Heading levels should only increase by one
- Rule: `heading-order` · Impact: **moderate** · WCAG: best practice · Page: http://localhost:8787/demo/driftwood
- Elements: 1
- Example: `<h5 class="section-title">The Storm Collection</h5>`
- Reference: https://dequeuniversity.com/rules/axe/4.14/heading-order?application=axeAPI

## Fixes (13)

- [ ] **Contrast 2.29:1 → 4.58:1 (color #9aa5b1 → #697078)** (wcag143) — `.foot-grid > div:nth-child(1) > p`
- [ ] **Contrast 2.29:1 → 4.58:1 (color #9aa5b1 → #697078)** (wcag143) — `li:nth-child(1) > a[href$="#shop"]`
- [ ] **Contrast 2.29:1 → 4.58:1 (color #9aa5b1 → #697078)** (wcag143) — `li:nth-child(2) > a[href$="#shop"]`
- [ ] **Contrast 2.29:1 → 4.58:1 (color #9aa5b1 → #697078)** (wcag143) — `li:nth-child(3) > a[href$="#shop"]`
- [ ] **Contrast 2.29:1 → 4.58:1 (color #9aa5b1 → #697078)** (wcag143) — `li:nth-child(4) > a[href$="#shop"]`
- [ ] **Contrast 2.29:1 → 4.58:1 (color #9aa5b1 → #697078)** (wcag143) — `li:nth-child(5) > a[href="#"]`
- [ ] **Contrast 2.29:1 → 4.58:1 (color #9aa5b1 → #697078)** (wcag143) — `li:nth-child(1) > a[href="#"]`
- [ ] **Contrast 2.29:1 → 4.58:1 (color #9aa5b1 → #697078)** (wcag143) — `li:nth-child(2) > a[href="#"]`
- [ ] **Contrast 2.29:1 → 4.58:1 (color #9aa5b1 → #697078)** (wcag143) — `div:nth-child(3) > .foot-links > li:nth-child(3) > a[href="#"]`
- [ ] **Contrast 2.29:1 → 4.58:1 (color #9aa5b1 → #697078)** (wcag143) — `div:nth-child(3) > .foot-links > li:nth-child(4) > a[href="#"]`
- [ ] **Contrast 2.29:1 → 4.58:1 (color #9aa5b1 → #697078)** (wcag143) — `li:nth-child(1) > a[href$="#about"]`
- [ ] **Contrast 2.29:1 → 4.58:1 (color #9aa5b1 → #697078)** (wcag143) — `li:nth-child(2) > a[href$="#journal"]`
- [ ] **Heading levels should only increase by one** () — `#shop > .wrap > .section-head > div > .section-title`

## Evidence

19 hash-chained entries. Head: `c750f022e982f2228be5934f36bc2270b4509d42ad071acc29f70a508146d883`. Chain valid: true.

_Risk indicator, not legal advice. Automated testing finds a subset of WCAG issues; pair with manual testing by disabled users._