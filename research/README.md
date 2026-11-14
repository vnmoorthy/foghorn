# Idea selection: the 50-judge simulated panel

Before writing any code at the Boat Hackathon, we used a panel of simulated judges to choose which of 26 candidate ideas to build. This page explains how the panel worked, gives the full results, and reproduces the head judge's synthesis that became the Foghorn plan.

> **Important caveat.** Every "judge" here was an **LLM role-playing a persona**. None of them were real people, real judges, real investors or real customers, and no human was surveyed. Some personas were modeled on the publicly described roles of event hosts and sponsors, but the scores and comments are model output, **not** those people's opinions. Treat this as a structured brainstorming and red-teaming exercise. It is not market validation and not evidence of demand.

The raw workflow output is in [`judge-panel-raw.txt`](judge-panel-raw.txt).

## Methodology

**Panel.** 50 judge agents (each running Claude Sonnet 5.5) plus one head judge (Claude Opus 5.5) that synthesized the results. Each judge got one persona and evaluated all 26 ideas independently. The personas covered the main viewpoints in a hackathon room:

- **Sponsor founders and representatives:** boat.dev, Context.dev, NY Token Exchange / TrustedRouter, Teamily AI, Startup Boat, The AI Collective, and the event organizer
- **Event hosts:** entrepreneurs, engineers and developer advocates
- **Investors:** YC group partner, General Catalyst, a16z infra, Sequoia seed, climate, impact, enterprise SaaS, security, healthtech, GovTech, consumer, AI-native fund, solo GP angel, an angel who owns a sailboat, and a founder who exited to Google
- **Engineers and builders:** staff engineer at a frontier AI lab, model-provider developer relations lead, frontend devrel, startup CTO, developer tools founder, agentic browser founder, product designer, big-tech product manager
- **Domain and impact voices:** an **accessibility advocate who is blind**, a disability-rights lawyer, a Fortune 500 legal/compliance officer, a Fortune 500 retail head of AI, an ocean conservation scientist, a global logistics executive, a nonprofit tech director, an SF civic staffer, and a CS professor
- **Media and audience:** a TechCrunch journalist, a Gen-Z creator, a non-technical audience member, a veteran hackathon judge, and a deliberately skeptical judge

**Scoring.** Each judge scored every idea from 1 to 10 on six criteria:

| Criterion | Question |
|---|---|
| `wow` | Does it create a memorable moment on stage? |
| `impact` | Does it matter to real people? |
| `investable` | Could it become a venture-backed company? |
| `sponsor_fit` | Does it make load-bearing use of the sponsors' products? |
| `demo_feasible` | Can a small team build and demo it live in one day? |
| `overall` | The judge's holistic score |

Each judge also named a top-1 pick and a top-3 shortlist. Per-idea scores are averaged across all 50 judges (`n = 50` for every idea). `top1` and `top3` are vote counts out of 50.

**Composite.** Ideas were ranked by:

```
composite = 0.4 · overall
          + 0.15 · (wow + impact + investable + demo_feasible)
          + 0.05 · top1
```

`sponsor_fit` is reported but is **not** in the composite, so ideas could not win just by name-checking sponsors. For example, the leader scores 0.4 × 8.60 + 0.15 × (8.90 + 8.62 + 7.74 + 7.18) + 0.05 × 33 = 9.96.

**Synthesis.** The head judge read all 50 verdicts and the ranking, then wrote the plan below: the winning idea, what the panel rewards, the demo moment, MVP features, investability and stage risks.

## Results

Lighthouse (idea #3, renamed Foghorn) won clearly: 33 of 50 first-place votes, 46 of 50 top-3 placements, and a composite of 9.96 against 7.36 for second place. Black Box (#26), a tamper-evident audit trail for agents, came second; its hash-chained evidence idea was folded into Foghorn.

All 26 ideas, ordered by composite score (averages across 50 judges):

| Rank | # | Idea | Wow | Impact | Investable | Sponsor fit | Demo feasible | Overall | Top-1 votes | Top-3 votes | Composite |
|---:|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 3 | Lighthouse (accessibility) | 8.90 | 8.62 | 7.74 | 8.04 | 7.18 | 8.60 | 33 | 46 | **9.96** |
| 2 | 26 | Black Box | 6.38 | 6.80 | 8.58 | 8.82 | 6.44 | 7.08 | 6 | 25 | 7.36 |
| 3 | 19 | Scam Shield | 8.20 | 8.02 | 5.00 | 8.20 | 7.66 | 7.26 | 2 | 17 | 7.34 |
| 4 | 1 | Regatta | 8.52 | 4.82 | 5.60 | 9.84 | 7.66 | 6.84 | 3 | 25 | 6.88 |
| 5 | 4 | Tidewatch | 7.78 | 6.50 | 6.82 | 6.52 | 6.26 | 6.33 | 2 | 4 | 6.74 |
| 6 | 17 | Harbor QA | 7.26 | 4.84 | 6.88 | 8.86 | 7.50 | 6.57 | 1 | 8 | 6.65 |
| 7 | 5 | Due Diligence Deckhand | 7.92 | 4.66 | 6.40 | 8.32 | 6.26 | 6.27 | 1 | 4 | 6.34 |
| 8 | 8 | Pirate | 7.82 | 6.00 | 7.22 | 7.50 | 4.46 | 5.90 | 0 | 2 | 6.18 |
| 9 | 6 | Mayday | 6.14 | 7.90 | 6.32 | 6.52 | 4.36 | 5.80 | 1 | 4 | 6.08 |
| 10 | 2 | Armada | 8.06 | 4.58 | 5.18 | 9.24 | 6.70 | 5.99 | 0 | 2 | 6.07 |
| 11 | 9 | Lifeboat | 5.52 | 4.82 | 6.44 | 8.08 | 6.12 | 5.32 | 0 | 1 | 5.56 |
| 12 | 11 | Truthwave | 6.72 | 5.78 | 3.36 | 5.10 | 7.82 | 4.71 | 0 | 0 | 5.44 |
| 13 | 10 | Benefit Buoy | 5.54 | 8.80 | 3.82 | 6.28 | 4.10 | 5.20 | 0 | 6 | 5.42 |
| 14 | 7 | Ghost Fleet | 7.08 | 6.32 | 3.76 | 4.96 | 4.90 | 4.75 | 1 | 1 | 5.26 |
| 15 | 14 | Trial Compass | 4.80 | 7.80 | 4.54 | 4.26 | 5.42 | 4.44 | 0 | 1 | 5.16 |
| 16 | 25 | Data Dredge | 4.40 | 4.12 | 5.62 | 7.26 | 7.88 | 4.23 | 0 | 0 | 5.00 |
| 17 | 15 | Greenwash Detector | 4.70 | 5.80 | 3.92 | 4.82 | 6.78 | 4.04 | 0 | 2 | 4.80 |
| 18 | 22 | Open Source Lifeguard | 4.64 | 5.70 | 4.66 | 6.62 | 5.34 | 4.22 | 0 | 0 | 4.74 |
| 19 | 12 | Crow's Nest | 3.80 | 3.28 | 5.36 | 6.38 | 8.00 | 3.64 | 0 | 0 | 4.52 |
| 20 | 21 | Wildfire Sentinel | 4.98 | 6.78 | 2.68 | 3.76 | 5.84 | 3.45 | 0 | 0 | 4.42 |
| 21 | 18 | Policy Pulse | 3.30 | 4.98 | 4.80 | 5.02 | 6.92 | 3.53 | 0 | 1 | 4.41 |
| 22 | 20 | Recall Radar | 3.50 | 5.38 | 3.98 | 4.68 | 6.62 | 3.29 | 0 | 0 | 4.24 |
| 23 | 13 | Grant Pilot | 3.24 | 5.56 | 3.68 | 4.30 | 6.94 | 3.27 | 0 | 0 | 4.22 |
| 24 | 16 | Bid Boat | 3.24 | 4.40 | 5.08 | 4.64 | 6.22 | 3.33 | 0 | 1 | 4.17 |
| 25 | 24 | Captain's Log | 3.66 | 3.90 | 4.70 | 3.40 | 5.88 | 2.78 | 0 | 0 | 3.83 |
| 26 | 23 | Job Ship | 4.00 | 3.10 | 3.46 | 6.22 | 5.86 | 2.39 | 0 | 0 | 3.42 |

## Head judge synthesis

*Lightly edited for clarity. This is model output from the simulated panel. Market figures and legal claims in it were not independently verified by the panel and should be checked before reuse.*

### 1. Winning idea

**Foghorn: hear your website the way a blind customer does, then fix it.** This is Lighthouse (#3) with Black Box's (#26) tamper-evident audit trail added as the evidence layer.

*Pitch:* A live agent drives your site in a real cloud browser and speaks aloud what a screen-reader user hears. It flags every WCAG failure with evidence, prices your legal exposure, and ships source-code fixes instead of an overlay.

Why: 33 of 50 judges ranked it #1 and 46 put it in their top 3. Its composite is 9.96; the next best is 7.36.

On the name: "Google Lighthouse" already exists and runs static accessibility scoring, so a skeptic will ask about it first. A foghorn is how ships find their way when they can't see, which fits an audio-first product and a boat event.

### 2. What this panel rewards

- **Sound before slides.** A human moment the room feels in 10 seconds; dashboards and reports score lower.
- **Live, real and checkable.** The audience picks a real site and it runs in a real browser. Findings come from deterministic tools (axe-core plus Chrome's accessibility tree), with the LLM layered on top. A cached fallback is expected, but no faked runs.
- **Visible, load-bearing sponsor use.** The boat.dev desktop is the hero, with a live per-second cost. The Context.dev monitor fires live. The NY Token Exchange pool, privacy floor and per-call cost are on screen.
- **A buyer with a deadline.** The EU Accessibility Act has applied since June 2025, there are thousands of ADA web lawsuits a year, and the ADA Title II rule covers government sites. Regulators have acted against accessibility overlay vendors, so overlays are discredited. The buyer is the general counsel or compliance budget.
- **A recurring, expandable loop with a human in it.** Scan, approve fix, re-verify, monitor, export evidence.

### 3. The one jaw-drop moment

"Close your eyes." Someone names a well-known retailer and the boat.dev desktop opens it live. The speakers say: *"Link. Link. Image. Button. Button. Button."* Focus loops inside checkout and the agent stops: *"Stuck. Unlabeled control."* Three seconds of silence. "Open your eyes." Violations are pinned on the page and the exposure meter has climbed. Click **Fix**, a human approves the diff, and the same flow replays: *"Checkout, button."* The score goes from red to green. Closing line: **"Same site. Thirty seconds."**

### 4. MVP features (in priority order)

1. **URL to live boat.dev VM.** Spawn a VM, open the URL in Chrome, embed the live desktop as the hero panel with a VM-seconds and dollars ticker.
2. **Screen-reader walk.** Tab through the focus order and read Chrome's accessibility tree, which is what NVDA, VoiceOver and Orca read. Speak each announcement, synced to a focus ring. Detect focus traps and unlabeled controls, then stop with "stuck".
3. **Deterministic audit.** Inject axe-core. Each finding carries its WCAG success criterion, selector and screenshot, pinned on the page.
4. **Vision simulation.** A color-vision-deficiency view and a low-vision blur of the same screenshot.
5. **AI fix and human approval.** Generate fixes through NY Token Exchange with a zero-data-retention floor and per-call cost. Show the diff behind an **Approve** gate, apply it in the sandbox, and re-run steps 2 and 3.
6. **Exposure indicator.** A transparent formula over severity, blocked key flows and jurisdictions, labeled "risk indicator, not legal advice."
7. **Evidence report.** A timestamped SHA-256 hash chain of every agent action, screenshot and WCAG citation, exported in one click.
8. **Continuous monitor.** A Context.dev change monitor fires a webhook that triggers a re-audit and a regression alert.
9. **Stretch: fleet mode.** Audit 10 pages in 10 parallel VMs, shown as a wall of desktops.

### 5. Investability

- **Market:** Companies selling online to EU or US consumers face legal accessibility obligations. Incumbents include Deque, Level Access, Siteimprove and UsableNet.
- **Buyer:** First, the general counsel or compliance lead at an e-commerce or SaaS company that just received a demand letter. Next, state and local government under ADA Title II.
- **Business model:** Per-site monthly subscription for monitoring, fixes and evidence, expanding through agency white-labeling and a CI gate.
- **Why now:** Accessibility regulation and litigation are rising, overlays are discredited, and computer-use agents on cheap VMs make real-browser audits scale.
- **Moat:** A growing dataset of real-browser failures mapped to verified fixes per framework and component; the hash-chained evidence trail becomes the customer's record; distribution through CI.

### 6. Top 3 risks on stage

1. **The demo stalls.** Big sites throw bot walls and cookie modals. Pre-test targets, pre-warm VMs, host a known-broken demo shop, keep a recorded fallback, and test audio through the venue PA.
2. **Overclaiming.** Never say "compliant" and never present a risk number as a legal verdict. Fixes go into source code, never an overlay, and every finding cites its WCAG criterion. To "isn't this just axe or Google Lighthouse?": "They lint a page. We walk your checkout, speak it, fix it and re-verify it."
3. **Spectacle over substance.** Don't call it an "empathy simulation". Go deep on the screen reader, keep vision views brief, and keep the human approval gate visible.

## How this shaped Foghorn

Most of the MVP list shipped in v0.1.0 (see [`CHANGELOG.md`](../CHANGELOG.md) and [`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md)). Fleet mode did not. The risk indicator uses severity, blocked flows, most-litigated barrier categories, an e-commerce signal and jurisdiction; it does not use company size or news search.

## Limitations

- **Simulated, not real.** All 51 agents were LLMs. Persona prompts shape the output, and the same underlying model family scored every idea, so the judges are far less independent than 50 humans would be.
- **Our own framing.** The idea list, persona list, criteria and composite weights were all chosen by the team, which biases the result.
- **No validation of demand.** None of this shows that anyone would buy or use Foghorn. That requires talking to disabled users, accessibility practitioners and buyers.
