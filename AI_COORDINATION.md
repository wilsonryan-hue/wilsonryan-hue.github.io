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

None recorded here. Do not invent one. If Ryan activates work in this repository, create one task record above before substantial development.

## Deferred

Keep this section short. Deferred items are not authorised work.

## Agent handoff log

Add only material handoffs or reviews. Do not append acknowledgements.
