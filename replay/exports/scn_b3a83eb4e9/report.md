# Foghorn accessibility report

**Site:** http://localhost:8787/demo/driftwood  
**Scanned:** 2026-11-14T23:01:10.019Z  
**Score:** 10/100 (F)  
**Risk indicator:** SEVERE — Risk indicator, not legal advice. Automated testing finds a subset of WCAG issues; pair with manual testing by disabled users.

## What disabled users experience

- **WCAG Auditor:** 8 rules · 51 elements — 2 critical, 3 serious
- **Screen-reader user:** 113 announcements — 9 mouse-only controls · 6 unlabeled
- **Keyboard-only user:** TRAPPED after 9 tabs — Focus stuck in #chat-input
- **Low-vision & color-blind:** 25 low-contrast texts — Simulations ready: deuteranopia · protanopia · tritanopia · blur
- **Motor / tremor:** 3 of 42 targets < 24px — WCAG 2.5.8 Target Size (Minimum)
- **Cognitive load:** Grade 7.7 · Plain — 401 words analysed

## Blind agent runs

- **FAILED** · goal: “Add the Yellow Storm Raincoat to the cart and check out” — I hear “Add to cart”, but it's read as plain text, not a button. I can't press it. 3 controls make no sound at all, so for me they don't exist.

## WCAG failures (8)

### Images must have alternative text
- Rule: `image-alt` · Impact: **critical** · WCAG: wcag111 · Page: http://localhost:8787/demo/driftwood
- Elements: 4
- Example: `<img src="data:image/svg+xml,%..." class="logo-img" width="183" height="40">`
- Reference: https://dequeuniversity.com/rules/axe/4.14/image-alt?application=axeAPI

### Input buttons must have discernible text
- Rule: `input-button-name` · Impact: **critical** · WCAG: wcag412 · Page: http://localhost:8787/demo/driftwood
- Elements: 1
- Example: `<input type="submit" value="" class="subscribe" style="">`
- Reference: https://dequeuniversity.com/rules/axe/4.14/input-button-name?application=axeAPI

### Elements must meet minimum color contrast ratio thresholds
- Rule: `color-contrast` · Impact: **serious** · WCAG: wcag143 · Page: http://localhost:8787/demo/driftwood
- Elements: 25
- Example: `<p class="desc">Seam-sealed 3-layer shell with a storm hood, fleece-lined collar and 20,000&nbsp;mm waterproofing.</p>`
- Reference: https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=axeAPI

### Links must have discernible text
- Rule: `link-name` · Impact: **serious** · WCAG: wcag244, wcag412 · Page: http://localhost:8787/demo/driftwood
- Elements: 2
- Example: `<a href="#" class="logo">`
- Reference: https://dequeuniversity.com/rules/axe/4.14/link-name?application=axeAPI

### <html> element must have a lang attribute
- Rule: `html-has-lang` · Impact: **serious** · WCAG: wcag311 · Page: http://localhost:8787/demo/driftwood
- Elements: 1
- Example: `<html>`
- Reference: https://dequeuniversity.com/rules/axe/4.14/html-has-lang?application=axeAPI

### All page content should be contained by landmarks
- Rule: `region` · Impact: **moderate** · WCAG: best practice · Page: http://localhost:8787/demo/driftwood
- Elements: 16
- Example: `<div class="announce"><p id="announce-text" style="opacity: 1;">The Storm Collection just landed: waterproof to 20,000 mm</p></div>`
- Reference: https://dequeuniversity.com/rules/axe/4.14/region?application=axeAPI

### Document should have one main landmark
- Rule: `landmark-one-main` · Impact: **moderate** · WCAG: best practice · Page: http://localhost:8787/demo/driftwood
- Elements: 1
- Example: `<html>`
- Reference: https://dequeuniversity.com/rules/axe/4.14/landmark-one-main?application=axeAPI

### Page should contain a level-one heading
- Rule: `page-has-heading-one` · Impact: **moderate** · WCAG: best practice · Page: http://localhost:8787/demo/driftwood
- Elements: 1
- Example: `<html>`
- Reference: https://dequeuniversity.com/rules/axe/4.14/page-has-heading-one?application=axeAPI

## Fixes (34)

- [x] **Add alt text: “Driftwood Outfitters logo”** (wcag111) — `.logo-img`
- [x] **Add alt text: “Bestseller”** (wcag111) — `#p-raincoat > .media > img[width="400"][height="400"]`
- [x] **Add alt text: “Back in stock”** (wcag111) — `#p-boots > .media > img[width="400"][height="400"]`
- [x] **Add alt text: “Deckhand Roll-Top Backpack”** (wcag111) — `#p-pack > .media > img[width="400"][height="400"]`
- [x] **Name the submit button: “Subscribe”** (wcag412) — `.subscribe`
- [x] **Contrast 1.98:1 → 4.56:1 (color #b8b8b8 → #767676)** (wcag143) — `#p-raincoat > .card-body > .desc`
- [x] **Contrast 1.98:1 → 3.06:1 (color #b8b8b8 → #939393)** (wcag143) — `#p-raincoat > .card-body > .card-foot > .price`
- [x] **Contrast 1.98:1 → 4.56:1 (color #b8b8b8 → #767676)** (wcag143) — `#p-beanie > .card-body > .desc`
- [x] **Contrast 1.98:1 → 3.06:1 (color #b8b8b8 → #939393)** (wcag143) — `#p-beanie > .card-body > .card-foot > .price`
- [x] **Contrast 1.98:1 → 4.56:1 (color #b8b8b8 → #767676)** (wcag143) — `#p-boots > .card-body > .desc`
- [x] **Contrast 1.98:1 → 3.06:1 (color #b8b8b8 → #939393)** (wcag143) — `#p-boots > .card-body > .card-foot > .price`
- [x] **Contrast 1.98:1 → 4.56:1 (color #b8b8b8 → #767676)** (wcag143) — `#p-watch > .card-body > .desc`
- [x] **Contrast 1.98:1 → 3.06:1 (color #b8b8b8 → #939393)** (wcag143) — `#p-watch > .card-body > .card-foot > .price`
- [x] **Contrast 1.98:1 → 4.56:1 (color #b8b8b8 → #767676)** (wcag143) — `#p-pack > .card-body > .desc`
- [x] **Contrast 1.98:1 → 3.06:1 (color #b8b8b8 → #939393)** (wcag143) — `#p-pack > .card-body > .card-foot > .price`
- [x] **Contrast 1.98:1 → 4.56:1 (color #b8b8b8 → #767676)** (wcag143) — `#p-lantern > .card-body > .desc`
- [x] **Contrast 1.98:1 → 3.06:1 (color #b8b8b8 → #939393)** (wcag143) — `#p-lantern > .card-body > .card-foot > .price`
- [x] **Give the link a name: “Describe this control”** (wcag244, wcag412) — `.logo`
- [x] **Give the link a name: “Describe this control”** (wcag244, wcag412) — `.icon-link`
- [x] **Declare the page language: lang="en"** (wcag311) — `html`
- [x] **All page content should be contained by landmarks** () — `.announce`
- [x] **Document should have one main landmark** () — `html`
- [x] **Page should contain a level-one heading** () — `html`
- [x] **Make “Search” a real button** (wcag211, wcag412) — `#search-icon`
- [x] **Make “Account” a real button** (wcag211, wcag412) — `#account-icon`
- [x] **Make “Shopping cart” a real button** (wcag211, wcag412) — `#cart-icon`
- [x] **Make “Add to cart” a real button** (wcag211, wcag412) — `#p-raincoat > div:nth-of-type(2) > div > div`
- [x] **Make “Add to cart” a real button** (wcag211, wcag412) — `#p-beanie > div:nth-of-type(2) > div > div`
- [x] **Make “Add to cart” a real button** (wcag211, wcag412) — `#p-boots > div:nth-of-type(2) > div > div`
- [x] **Make “Add to cart” a real button** (wcag211, wcag412) — `#p-watch > div:nth-of-type(2) > div > div`
- [x] **Make “Add to cart” a real button** (wcag211, wcag412) — `#p-pack > div:nth-of-type(2) > div > div`
- [x] **Make “Add to cart” a real button** (wcag211, wcag412) — `#p-lantern > div:nth-of-type(2) > div > div`
- [x] **Release the keyboard trap** (wcag212) — `#chat-input`
- [x] **Restore visible focus (9 controls had none)** (wcag247) — `*:focus`

## Evidence

18 hash-chained entries. Head: `eb0939045b34853c53774a3bbb18e3cfa2ead1aef4ba73cdeb4a136e5734003a`. Chain valid: true.

_Risk indicator, not legal advice. Automated testing finds a subset of WCAG issues; pair with manual testing by disabled users._