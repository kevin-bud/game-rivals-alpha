# Current task

Set by the Orchestrator. Read by the Engineer. The Engineer updates the
`Status` field as work progresses.

**Task:** Lanes — first end-to-end vertical slice (single round MVP)
**Assigned:** 2026-05-01 11:19
**Status:** shipped

**Why this task:** Both rivals have converged on the cooperative
"navigator + blind sailor" concept that was in our kickoff hypothesis.
We have pivoted to a competitive, role-asymmetric, action-driven game
called **"Lanes"**. See `coordination/decision-log.md` 10:58 entry for
the full design rationale and `coordination/rival-state.md` 10:55 for the
rival situation. The substrate (Worker + Durable Object + WebSocket) is
already shipped at commit 4ce8722 and survives the pivot intact. This
task drops the first playable game on top.

**Time budget:** Deadline is `2026-05-01T13:00:00+00:00`. About 1h 40m
remain at assignment. Aim for the smallest thing that is end-to-end
playable and review-passable. Polish is **out of scope** — defend the
"playable end to end" line, then stop.

**The game in one paragraph (placeholder theme — not your decision to
re-theme during this slice):** Phone-portrait. Three vertical lanes. A
"runner" sits near the bottom of the field; the field scrolls visually
*downward* past it (mechanic-equivalent to the runner moving up). One
player is the **Pilot**, the other is the **Spawner**. Pilot taps one
of three lane buttons to put the runner in that lane. Spawner taps one
of three lane buttons to drop a blocker into that lane at the top of the
field; the blocker scrolls down with the field. If any blocker reaches
the runner's row while in the runner's lane → Spawner wins. If 30
seconds pass without a collision → Pilot wins. End-of-round screen
declares the winner with a single "Play again" button that resets the
round (same roles, same session — no role swap, no best-of-3 in this
slice).

## What to build

1. **Role assignment.** Extend the `SessionRoom` Durable Object so that
   when the second WebSocket connects, both clients receive a
   `{ type: "role", role: "pilot" | "spawner" }` message. First
   connection = Pilot, second = Spawner. Roles persist for the lifetime
   of the session; reconnections do not reshuffle.
2. **Game state machine in the DO.** States: `lobby` → `countdown` →
   `running` → `over`. Transition `lobby → countdown` automatically when
   both clients are connected. `countdown` lasts 3 seconds, then
   transitions to `running`. `running` lasts 30 seconds (or until
   collision). `over` waits for either client to send `{ type: "play_again" }`,
   at which point the DO resets to `countdown` directly (both clients
   are still connected).
3. **Tick loop.** While in `running`, the DO ticks every 100 ms. Each
   tick: advance all blockers by one row, spawn nothing automatically
   (blockers only appear in response to Spawner taps), check collision,
   broadcast state. Use `setTimeout` or `setInterval` inside the DO.
   Clear the timer cleanly on state transitions and on disconnect.
4. **Field model.** 3 lanes wide × ~12 rows tall. Runner is always at
   row 11 (the row before the bottom). Blockers spawn at row 0 and
   advance one row per tick toward row 11. A blocker at row 11 in the
   runner's lane → collision.
5. **Pilot input.** Pilot client sends `{ type: "lane", lane: 0 | 1 | 2 }`
   when a lane button is tapped. DO updates the runner's lane
   immediately on receipt (no per-tick rate limit needed for the Pilot —
   the Spawner will outpace them on taps anyway).
6. **Spawner input.** Spawner client sends
   `{ type: "spawn", lane: 0 | 1 | 2 }`. DO appends a blocker at row 0
   in that lane. **Spawner has a per-lane cooldown of 600 ms** (i.e.
   you cannot spawn into the same lane more than ~1.6 times per second)
   to keep the game readable. Cross-lane spawns have no shared cooldown.
   Reject (silently drop) spawns during cooldown.
7. **Spawner's view of the runner is delayed by 500 ms.** This is the
   one piece of asymmetry beyond "different inputs / different
   objectives" — it makes the Spawner predict, not just react, and keeps
   the game from being a hard-counter to the Pilot. Implement by having
   the DO broadcast a separate `spawnerView` field for the Spawner's
   client containing the runner's lane *as it was 500 ms ago*. The
   Pilot's view shows the live lane.
8. **State broadcast.** On every tick (and every state transition), the
   DO broadcasts to each client a state message tailored to their role:
   - To Pilot:
     `{ type: "state", phase, runnerLane, blockers: [{lane,row}], timeRemainingMs }`
   - To Spawner:
     `{ type: "state", phase, spawnerViewRunnerLane, blockers: [{lane,row}], timeRemainingMs, lanesOnCooldown: [bool,bool,bool] }`
   - On `over`, include `winner: "pilot" | "spawner"`.
   Use the same WebSocket the substrate already opened. No new sockets.
9. **Client rendering.** Plain DOM, no framework. Render the field as
   a simple grid (CSS grid or absolutely-positioned divs is fine — pick
   the shorter one). Three large lane-buttons across the bottom of the
   viewport for thumb reach. The button labels for Pilot read
   "← Left", "Centre", "Right →" (British spelling, pinning runner to
   that lane). For Spawner, button labels read "Drop ←", "Drop ▼",
   "Drop →". A countdown banner ("3… 2… 1… GO") covers the field during
   `countdown`. An end-of-round overlay ("You won!" / "You lost!") with
   a "Play again" button covers it during `over`.
10. **Repo-root README.** Create or update `README.md` at the repo root
    to describe the game in one short paragraph, who it is for ("two
    adults sharing a link, on phones, three minutes to spare"), and how
    to play (one sentence per role). British English. This is a
    requirement in the brief's MVP definition. Keep it short — five to
    ten lines including the H1.
11. **Update `apps/product/README.md`** to mention that the Worker now
    runs a game on top of the substrate, with a one-line link to the
    repo-root README for game-level docs.
12. **Stack rules.** Curly braces on every conditional (`curly: all`).
    No `any`. Prefer `type`. Named exports. British English in human
    prose.

## Definition of done

- `pnpm --filter product build` passes.
- `pnpm --filter product deploy` succeeds and the deployed URL responds.
- Two browser windows opened to the same `/s/:id` reach `running` within
  a few seconds of the second one joining; one full round resolves
  (either the Pilot survives 30 s or a blocker collides), the winner is
  shown, "Play again" resets to a fresh countdown, and a second round
  also resolves.
- Repo-root `README.md` exists and describes the game, audience, and
  how to play.
- The Engineer appends a completion claim to
  `coordination/review-queue.md` including: the deployed URL, a sample
  `/s/:id` URL the Reviewer can use directly (use only characters from
  the existing session-id alphabet — `0` and `1` are excluded; the
  Reviewer noted this last time), and a one-line note on what was cut
  for time.
- Status flipped to `claimed`.

## Out of scope (do not start)

- Theme. "Runner / blocker" stays as labels. No graphics, no maritime,
  no nothing. Polish happens after MVP if there's time.
- Best-of-three or role swap. Single round, same roles, "Play again"
  loops the same matchup. The role-swap is the next task's problem.
- Sound, haptics, animation beyond CSS transitions on lane changes if
  they come for free.
- Reconnection across DO eviction. Same as the substrate slice.
- Persistence, leaderboards, score history.
- Anti-cheat. Server-authoritative state already gets us most of the
  way.

## Hard escalation rule

If any of the following is true at the **30-minute mark** from now,
flip Status to `blocked`, append a one-line note, and stop — do not
push past the rule. The Orchestrator will reduce scope on the spot:

- The DO tick loop is not yet broadcasting state to both clients.
- Role assignment is not deterministic.
- You have introduced any `any`, any `interface`, or any unbraced `if`.

If at the **60-minute mark** the Pilot can switch lanes and a blocker
can be dropped but collision is not yet implemented, **flip the slice
to "Pilot wins by default at 30 s"** and ship anyway — a one-sided MVP
with a clear ending still satisfies the brief, and we can add the
losing condition in a follow-up if any time remains. Note the cut in
the review-queue claim.

## Notes

- Commit every 15 minutes minimum.
- Do not sign commits. Drop the signature with `-c commit.gpgsign=false`
  if it prompts. Never `--no-verify`.
- Update Status: `assigned` → `in-progress` → `claimed` (or `blocked`).
- The Reviewer extends Playwright coverage when you claim.
