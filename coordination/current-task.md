# Current task

Set by the Orchestrator. Read by the Engineer. The Engineer updates the
`Status` field as work progresses.

**Task:** Lanes polish 2 — per-slot cumulative wins
**Assigned:** 2026-05-01 11:56
**Status:** in-progress

**Why this task:** With the role-swap polish in place, both players play
both sides of the asymmetry across a session, but the rounds float
independently — there is no "we're 2-1, this is the decider" feeling
because the product never tells either player that. Per-slot cumulative
wins produces that feeling without introducing match-end logic. The
11:56 decision-log entry has the full rationale; key points:

- Track wins per *slot* (slot A = first connection, slot B = second),
  not per role. Roles swap each round; slots are stable.
- Increment at round end, in the same DO transition that already emits
  the `over` state with a winner. No new transition.
- No "New match" button, no match end, no best-of-three logic. Round
  loop continues until players close.

**Time budget:** Strict 20 minutes from assignment to claim. Hard
escalation rule below.

## What to build

1. **DO state.** Add `slotWins: [number, number]` to the DO state
   (indexed 0 and 1, matching the existing slot indices used for role
   assignment). Initialise to `[0, 0]` at DO creation.
2. **Increment at round end.** In the existing transition that takes
   the DO from `running` to `over` with a winner, *before* broadcasting
   `over`, increment `slotWins[winnerSlot]` where `winnerSlot` is the
   slot index of the player whose role just won the round. Mapping:
   - If the round-winning role is `pilot`, `winnerSlot` = whichever
     slot is currently assigned the Pilot role.
   - If the round-winning role is `spawner`, similarly for Spawner.
3. **State broadcast.** Include `slotWins` in the per-client state
   message during `countdown`, `running`, and `over` phases. Each
   client also already knows their own slot index from the existing
   `role` message; you do not need to re-send it. The client can
   compute "yours" vs "theirs" locally.
4. **Client rendering.**
   - During `running` and `countdown`: a small persistent header at
     the top of the field reading "You: X · Them: Y" (British
     punctuation, middle dot fine, no exclamation marks). Use
     `data-testid="score-self"` and `data-testid="score-other"` on
     the two numbers so the Reviewer can assert.
   - During `over`: include the same score line under the
     "You won" / "You lost" message in the existing overlay.
5. **No new buttons, no match end.** Keep the existing "Play again"
   flow exactly as it is. The score keeps incrementing across rounds.
   There is no "reset score" or "new match" UI.
6. **Stack rules unchanged.** Curly braces, no `any`, prefer `type`,
   named exports, British English.

## Definition of done

- `pnpm --filter product build` passes.
- `pnpm --filter product deploy` succeeds and the deployed URL responds.
- All existing Playwright tests (`smoke.spec.ts`, `session.spec.ts`,
  `lanes.spec.ts`, `invalid-id.spec.ts`) still pass against the deployed
  URL — no regressions.
- Manual smoke (you, two browser windows on the same `/s/:id`):
  - Round 1: starts with `0 · 0` on both clients. Drive a Spawner-wins
    round (Pilot pinned to lane 1, Spawner spams lane 1).
  - On the over overlay, the originally-Spawner client should see
    `You: 1 · Them: 0`; the originally-Pilot client `You: 0 · Them: 1`.
  - Click Play again. Roles swap. Drive a Pilot-wins round (Spawner
    spams a different lane to the new Pilot's chosen lane, or the new
    Pilot dodges).
  - On the next over overlay, the score should reflect the new
    cumulative state correctly from each client's perspective.
- The Engineer appends a completion claim to `coordination/review-queue.md`
  with deployed URL and a sample `/s/:id` URL.
- Status flipped to `claimed`.

## Out of scope (do not start)

- Match end / declared match winner. No best-of-three. No "New match"
  button.
- Score reset. The score persists for the lifetime of the DO; closing
  the session is the reset.
- Theme, animations, sound, haptics, reconnection across DO eviction.
- Any change to existing tick / collision / cooldown / role-swap
  behaviour. Add only.

## Hard escalation rule

If at the **15-minute mark** any existing Playwright test is red
because of your changes, **revert the score change entirely** and
flip Status to `failed` with a one-line note. The MVP+role-swap state
is the floor we protect; this polish does not justify any regression.

## Notes

- Commit small. Do not sign commits. Drop the signature with
  `-c commit.gpgsign=false` if it prompts. Never `--no-verify`.
- Update Status: `assigned` → `in-progress` → `claimed` (or `failed`).
- The change is small — one new field on the DO state, one increment
  in the existing `over` transition, two new DOM elements. Resist any
  urge to refactor surrounding code.
