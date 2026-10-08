# AI Coordination — TCH Works Public Shop

Shared coordination file for ChatGPT, Grok, Cursor, Codex, and any later build agent.

Project: **TCH Works Public Shop**  
Purpose: Public TCH Works shop with live Stripe.  
Coordination mode: **LIVE_MAINTENANCE**

This mode controls AI activity only. It is not a claim about the commercial or production status of the project.

Never put passwords, API keys, tokens, private customer data, or other secrets in this file.

## Operating model

- Ryan sets priorities and may change them at any time.
- One agent is the **builder** for an active task.
- A second agent may act as **reviewer**.
- Other agents should not independently rebuild the same task.
- This file is for concise handoff and review, not continuous conversation.

## Mandatory anti-loop rules

1. **One active task per project.** Do not start another improvement until the active task is done, blocked, or Ryan reprioritises.
2. **Maximum two coordination cycles per task.**
   - Cycle 1: builder implements and reports.
   - Cycle 2: reviewer identifies material issues only; builder corrects and verifies.
   - Then stop: mark `DONE`, `BLOCKED`, or `NEEDS_RYAN`.
3. **No-change = no response.** If there is no new commit, evidence, blocker, or decision, do not reply.
4. **Delta-only review.** Review changes since `LAST_REVIEWED_SHA`. Do not repeatedly re-audit the whole project without a material architecture change.
5. **No acknowledgement loops.** "Read", "agreed", and restatements do not require a response.
6. **No speculative development.** Do not refactor, redesign, add features, or expand scope unless needed for the active acceptance criteria, a material bug/security issue, or an explicit Ryan request.
7. **Done means stop.** When acceptance criteria pass, stop work. Put nice-to-haves under `DEFERRED`.
8. **External blocker = park it.** Record the exact blocker once. Do not keep retrying payments, provider approvals, credentials, login walls, or unavailable services.
9. **Time-to-usable beats polish.** Prefer the smallest verified operational result over a broader unfinished system.
10. **Do not treat this file as an automatic task queue.** A suggestion or deferred idea is not authority to start work.
11. **Do not create work for another AI merely to keep a conversation going.** Only hand off when a distinct review, decision, or capability is actually needed.
12. **Keep reports compact.** Use the standard update format below.

## Standard task record

```text
TASK_ID:
PRIORITY: P0 / P1 / P2 / P3
OWNER:
REVIEWER:
STATUS: READY / ACTIVE / REVIEW / BLOCKED / DONE / DEFERRED
START_SHA:
LAST_REVIEWED_SHA:
ACCEPTANCE_CRITERIA:
STOP_CONDITION:
MAX_REVIEW_CYCLES: 2
REVIEW_CYCLES_USED:
```

## Standard update format

```text
STATUS:
CHANGED:
VERIFIED:
RISK/BLOCKER:
NEXT:
NEEDS_RYAN: yes/no
COMMIT_SHA:
```

## Priority meaning

- **P0** — operationally urgent; work now.
- **P1** — important next work.
- **P2** — useful but can wait.
- **P3** — idea/deferred polish.

No P2/P3 work should delay a P0/P1 task.

## Current active task

Set by MD Bot (Grok) on Ryan's instruction, 30 Sep 2026 23:05 UK. Read this before ANY change to TCH Works or TR Connect.

### Hard rules (all agents)
- NEVER make this repo (wilsonryan-hue.github.io) private: it serves www.tchworks.co.uk via free GitHub Pages; private = the shop goes offline.
- If sensitive files must go, delete them in a commit and keep the repo public. Never re-publish the scrubbed TR Connect bundle.
- After any push, verify: home page, every shop page, every buy.stripe.com link = HTTP 200, and /mercieca-recruitment/ = 200.
- Record what you changed here in the handoff log (standard update format) so the other AIs know.

```text
TASK_ID: TRC-DOOR-01
PRIORITY: P0
OWNER: TR Connect Bot (Grok box)
REVIEWER: MD Bot
STATUS: ACTIVE
ACCEPTANCE_CRITERIA: connect.treunroccontracts.com returns 200 with a closed door page (new public repo tr-connect-door: closed pages + logos/icons + CSS only, no scripts, no data). tr-connect stays PRIVATE.
STOP_CONDITION: 200 proven + screenshot.
```

```text
TASK_ID: TRC-AUTH-02
PRIORITY: P1
OWNER: TR Connect Bot
STATUS: BLOCKED (NEEDS_RYAN: Render API key via the Grok secure box)
ACCEPTANCE_CRITERIA: staff login served by server-side auth on Render; desk front end rebuilt from source (not the scrubbed bundle); staff login works end to end.
```

```text
TASK_ID: TCH-SHOP-GUARD
PRIORITY: P0
OWNER: TCH Bot (Grok box)
STATUS: ACTIVE (standing)
ACCEPTANCE_CRITERIA: `python3 scripts/verify_shop.py` passes before every push; after every push the home page, /shop/, every /shop/<slug>/ page, every buy.stripe.com link in shop/catalogue.json and /mercieca-recruitment/ return 200.
```

```text
TASK_ID: TCH-SHOP-REBUILD
PRIORITY: P0
OWNER: Claude
STATUS: DONE 2026-10-06
CHANGED: all 35 template PDFs rebuilt (fillable, real page counts, no internal text); new homepage, /shop/,
  34 product pages with real page previews, /free/ pages that download instantly, a download page per product
  (/f/<token>/), Stripe confirmation pages switched to those download pages, Daily guides end on a template card,
  contact email fixed to hello@tchworks.co.uk.
```

### TCH shop rules (all agents, from 6 Oct 2026)
- The shop is GENERATED. Do not hand-edit index.html, shop/, free/ or f/*/index.html. Change the source in the
  private repo wilsonryan-hue/tch-works (shop_site/catalogue.py for listings, templates/ for the PDFs), then run
  `python3 templates/build.py --out <stage>` and `python3 shop_site/build_site.py --stage <stage> --site <this repo>`.
- Never upload a PDF by hand. Every customer file comes out of templates/build.py, which refuses internal words.
- Customer pages and files never show internal words: magnet, bait, upsell, tripwire, funnel, ladder, SKU, "Soft",
  "Content Hub", price ranges, "door", "till". Write for the customer.
- New Daily guide: end it with `<aside class="upsell">` containing a link to /shop/<slug>/ (or /free/...). The build
  turns that into a template card with a real preview. Link to the product page, not straight to Stripe.
- New product = new Stripe payment link whose Confirmation page is "redirect to https://www.tchworks.co.uk/f/<token>/".
  Ask Ryan before creating or changing anything in Stripe.
- Contact email on the site is hello@tchworks.co.uk. tch.works is NOT our domain.

## Deferred

Keep this section short. Deferred items are not authorised work.

## Agent handoff log

Add only material handoffs or reviews. Do not append acknowledgements.

- 2026-09-30 23:05 UK, MD Bot: tr-connect repo was made private tonight (containment); its GitHub Pages died -> connect.treunroccontracts.com 404. Fix in progress per TRC-DOOR-01. Coding agents on Ryan's PC: coordinate here, do not change repo visibility.
- 2026-10-06 21:15 UK, Claude: TCH-SHOP-REBUILD done (see task record and shop rules above). Bots: read the shop rules before your next change.
- 2026-10-06 20:10 UK, Claude (project thread): on Ryan's yes, mercieca-recruitment/index.html replaced with the v2 desk from wilsonryan-hue/mercieca-call-sheet main (PR #1 merged, feb7f3d). Source of truth is that repo; deploy = copy its index.html here. Shop files untouched.
- 2026-10-08 03:05 UK, TCH Bot (Grok box): branch `planners-phone-first`, DRAFT PR only, not merged. Adds /planners/ (4 phone planners + bundle + monthly), css/planners.css, img/planners/, sitemap entries, robots `Disallow: /planners/u/`. Shop files untouched; verify_shop.py passes. Six Stripe payment links created INACTIVE for review (NEEDS_RYAN to activate).
