# Foghorn: Pitch Storyboard

Deck: `deck/index.html` (open in Chrome, press **F** for fullscreen, arrows/space to advance, **R** replays the current slide's animation).
Backup: `deck/Foghorn-Pitch.pptx` (same 10 slides, speaker notes included).
Live product: http://localhost:5173 (Driftwood demo store).

---

## Part 1: The 3-minute pitch (timed per slide)

| Time | Slide | On screen | Say (exact words) |
|---|---|---|---|
| 0:00–0:20 | 1 Title | Sonar sweep, "Close your eyes.", waveform pulsing | "Close your eyes. Seriously, everyone, five seconds. *(pause)* Now imagine you're trying to buy a raincoat, and all you hear is: button… button… image… unlabeled image. That's the internet for 1.3 billion people. We built Foghorn: hear your website the way a blind customer does, then fix it." |
| 0:20–0:40 | 2 Problem | 1.3B / 94.8% / 4,000+ count up, EAA banner | "One in six people on Earth lives with a significant disability. 94.8% of the top million home pages have WCAG failures a machine can detect. The European Accessibility Act has been enforced since June 28, 2025, and US companies face more than 4,000 accessibility lawsuits a year. It's a customer problem and a legal problem at once." |
| 0:40–1:00 | 3 Tools fail | Linters vs. overlays, "Overlays" struck through, $1M FTC | "Today you get two options. Linters and manual audits from Deque, Level Access, Siteimprove and UsableNet read your HTML, but nobody actually tries to use your site. Or overlays: a widget painted on top. In January 2025 the FTC ordered accessiBe to pay a million dollars over misleading claims. Nobody tests the experience, fixes the source, and proves it." |
| 1:00–1:20 | 4 Persona fleet | Six persona cards stagger in, blind-agent bar glows | "Foghorn sends a fleet of AI personas into a real browser: a WCAG 2.2 auditor, a screen-reader user that actually speaks the page, a keyboard-only user hunting for traps, low-vision and color-blind simulations, a motor persona checking 24-pixel targets, and a cognitive-load persona. Then the one that matters: a blind agent that perceives the page only through the screen reader and tries a real task." |
| 1:20–1:50 | 5 Demo moment | Transcript types out, dial 10 → 73, steps light up | "Task: buy the yellow raincoat and check out. *(let two lines type)* It hears 'Add to cart', but it's plain text, not a button. It fails. Foghorn writes source-level fixes: real contrast math, alt text, accessible names, a keyboard-trap release. A human approves. We re-run everything in a sandbox, and this time the blind agent checks out. 10 to 73." **→ If you have a 5-minute+ slot, SWITCH TO LIVE DEMO here (see Part 2, steps 3–9), then come back to slide 6.** |
| 1:50–2:10 | 6 How it works | Flow nodes pop in, dashed connectors animate, packet travels | "Paste a URL. Context.dev maps the site. Every audit gets its own boat.dev cloud VM with a live desktop, in parallel in fleet mode. NY Token Exchange is the brain for the agent and the fixes. Human approves, we verify, and every action goes into a SHA-256 hash-chained evidence trail your lawyers can export. Context.dev monitors re-audit on every deploy. We never ship an overlay." |
| 2:10–2:25 | 7 Sponsor stack | Three sponsor cards | "Every sponsor is load-bearing: boat.dev is the body, Context.dev is the map and memory, NY Token Exchange is the brain, with zero data retention and the cost of every call on screen." |
| 2:25–2:40 | 8 Market | $1M ARR counts up, why-now tiles | "Our buyer is general counsel and compliance at e-commerce and SaaS, then governments under ADA Title II. $500 to $2,000 per site per month. A hundred customers is about a million ARR, and agencies and a CI gate take us wider. Why now: the EAA, the lawsuit wave, overlays discredited, and computer-use agents finally cheap." |
| 2:40–2:50 | 9 Moat + validation | Bars fill: 8.6/10, 33/50, 46/50 | "Every audit adds real failures mapped to verified fixes; that dataset, the evidence chain and CI distribution are the moat. Before building, we ran a 50-judge simulated panel over 26 ideas. Foghorn scored 8.6, was number one for 33 judges, top three for 46." |
| 2:50–3:00 | 10 Close | "Every website should be heard.", GitHub | "Overlays paint over the problem. Linters describe it. Foghorn listens, fixes the source and proves it. We want design partners and agencies. Every website should be heard. Thank you." |

**Rules on stage:** never call the risk indicator legal advice ("it's a risk indicator, not legal advice"). Say "simulated panel", not "customers". Keep the audio volume up before slide 1.

---

## Part 2: 10-minute live demo run-of-show

**Pre-flight (T–10 min):** `npm run dev` in `web/`, open http://localhost:5173 in Chrome, second tab with the deck at slide 5. Laptop audio on, volume ~70%, Do Not Disturb on. Do one dry scan so VMs and caches are warm. Have a screen recording of a full successful run open in QuickTime as the last-resort fallback.

| Clock | Step | Click-by-click | Say | If it fails, say this and do this |
|---|---|---|---|---|
| 0:00–1:00 | 1. Frame | Deck slides 1–3 (short versions) | "Close your eyes…" hook, then the problem in one breath. | n/a |
| 1:00–1:30 | 2. Switch | Cmd+Tab to the Foghorn tab at localhost:5173 | "Let's do it live, on a store we deliberately broke: Driftwood." | Tab not loading: "While that wakes up," go back to deck slide 5 and narrate it, retry after. |
| 1:30–2:30 | 3. Scan | Paste the Driftwood demo store URL (or pick **Driftwood** from the presets) → click **Dive** | "Foghorn is spinning up an isolated boat.dev VM with a real browser. Context.dev is mapping the pages. You can watch the live desktop." | VM slow: "Real cloud VMs, real browser. This is the honest version." If over 45s, use the cached/last scan result. |
| 2:30–3:30 | 4. Persona results | Point at the score (10/100, F, SEVERE risk) and the persona cards; open the **Low-vision** card to show a color-blind simulation, then the **Keyboard** card to show the trap | "Six personas, one page. The auditor found WCAG 2.2 failures; the keyboard user got trapped in the chat widget after 9 Tabs; 25 texts fail contrast." | Card empty: "Each persona writes into the evidence trail, here's the raw finding," open the evidence/log panel instead. |
| 3:30–4:30 | 5. Hear it | Click **Play** on the screen-reader transcript | (Stay silent for ~8 seconds and let it speak.) "That's what a blind customer hears. Button. Button. Unlabeled image." | No audio: "The speech is the accessibility tree read aloud; here it is as text," and read 3 lines from the transcript yourself, slowly. |
| 4:30–5:45 | 6. Blind agent | Click **Run blind agent** (task: "buy the yellow raincoat and check out") | "This agent sees nothing. It only gets screen-reader output, reasoned by NY Token Exchange, with the cost per call shown here." Wait for: "I hear 'Add to cart' but it's plain text, not a button." "And it fails. That's a lost sale and a lawsuit exhibit." | Agent stalls: "It's thinking, each step is a real model call." After 30s: go to deck slide 5 and show the recorded run. |
| 5:45–7:00 | 7. Fixes | Open **Fixes** → show the contrast fix (old/new color + ratio), an alt-text fix, the button name fix, the trap release → click **Approve** | "These are source-level diffs, not an overlay. The color fixer does real WCAG contrast math: 1.98 to 1 becomes 4.56 to 1. A human approves; nothing ships on its own." | Fix generation errors: "The model call timed out; here are the fixes from the warm run," open the previous fix set. |
| 7:00–8:15 | 8. Verify | Open **Fixes** → click **Approve all & verify in sandbox** | "Now we re-run the audit and the blind agent in a sandbox against the patched site." Wait for checkout success and score ~73+. "It found the button, pressed it, checked out. 10 to 73." | Verify fails: "Good, that's the point: Foghorn only marks a fix verified if the agent actually completes the task." Show the failing check, then the recording. |
| 8:15–9:00 | 9. Evidence + monitor | Open **Evidence** → show hash chain, click **Export**; show the Context.dev monitor toggle | "Every agent action is SHA-256 hash-chained, exportable for counsel. Context.dev monitors re-audit on every deploy and catch regressions." Point at the litigation-risk indicator: "risk indicator, not legal advice." | Export blocked: "The chain verifies in-app; export is the same JSON," show the chain view. |
| 9:00–10:00 | 10. Close | Cmd+Tab back to deck → slides 7, 8, 9, 10 quickly | Sponsor stack in one sentence each, then "$500–2,000 a site a month, 100 customers is a million ARR," then the close: "Every website should be heard." | Running long: skip slides 7–9, go straight to 10. |

### Universal fallback lines
- "Live demos on a boat. Here's the recording from an hour ago, same code, same store."
- "That's a real cloud VM, not a mock, which is exactly why it can be slow."
- "Even when it breaks, it writes to the evidence trail; that's the product."

### Hard cuts if time is short
- 5-minute slot: steps 2, 3, 5, 6, 8 only.
- 3-minute slot: no live demo; slide 5 animation carries the story.
