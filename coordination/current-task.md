# Current task

Set by the Orchestrator. Read by the Engineer. The Engineer updates the
`Status` field as work progresses.

**Task:** Lanes polish — role swap on Play Again + invalid-id page
**Assigned:** 2026-05-01 11:42
**Status:** claimed

**Why this task:** MVP shipped at commit `a14123b` and the launch post is
live. About 1h 18m of deadline budget remain. The 11:42 decision-log entry
explains the trade-off; the short version is that with roles permanently
fixed for the lifetime of the session, only one player experiences each
side of the asymmetric design. Swapping roles on each "Play again" makes
both players actually play both roles inside one match, which is what the
asymmetric design was built to produce.

**Time budget:** Strict 25 minutes from assignment to claim. If you push
past it, stop and ship what you have. Deadline `2026-05-01T13:00:00+00:00`.

## What to build

1. **Role swap on Play Again.** When the DO transitions out of `over` in
   response to a `{type:"play_again"}` message from either client, swap
   the Pilot and Spawner role assignments before re-broadcasting `role`
   messages and entering `countdown`. The first round's roles still
   follow the existing rule (first connection = Pilot, second = Spawner).
   Subsequent rounds alternate: round 2 swaps, round 3 swaps back, and
   so on. Both clients should receive a fresh `{type:"role", role}`
   message at the start of each new round so their UI updates lane
   labels ("← Left / Centre / Right →" for Pilot, "Drop ← / Drop ▼ /
   Drop →" for Spawner).
2. **Client UI on role change.** The page must visibly re-render when a
   new `role` message arrives mid-session: the role label
   (`getByTestId("role")` text), the lane button labels, and any
   role-conditional rendering (Pilot sees `runner`, Spawner sees
   `ghost-runner`). Test this — the existing `getByTestId("role")`
   assertion should still match after a Play Again, with the *opposite*
   role text.
3. **Invalid session id page.** Currently a request to `/s/<bad-id>`
   (where `bad-id` contains characters outside `SESSION_ID_ALPHABET`,
   e.g. `0`, `1`, `l`, `o`, or anything not in `[a-z2-9]`, or has the
   wrong length) appears to 404 with no useful body. Replace this with
   a small HTML page (same minimal portrait viewport as the rest of the
   app) that says "That link doesn't look right" in British English,
   with a one-sentence explanation that session links are
   auto-generated, plus a single "Create session" button that POSTs to
   the existing session-creation endpoint. Use HTTP status 404 — search
   engines and link previews benefit from the correct status; the page
   body is what matters for humans.
4. **Stack rules unchanged.** Curly braces on every conditional, no
   `any`, prefer `type`, named exports, British English in human prose.

## Definition of done

- `pnpm --filter product build` passes.
- `pnpm --filter product deploy` succeeds and the deployed URL responds.
- Existing Playwright tests (`apps/product/tests/session.spec.ts`,
  `apps/product/tests/lanes.spec.ts`, `apps/product/tests/smoke.spec.ts`)
  all still pass against the deployed URL — including the existing role
  assertions on first connection.
- Manual smoke (you, two browser windows on the same `/s/:id`): play one
  round to completion, click "Play again", verify both clients now show
  the *opposite* role label and the runner / ghost-runner are flipped to
  the other client.
- Manual smoke for the invalid-id page: hit `/s/0000000` (contains `0`,
  rejected) and verify the new page renders with a "Create session"
  button.
- The Engineer appends a completion claim to `coordination/review-queue.md`
  with deployed URL, sample `/s/:id` URL using only valid alphabet chars
  (e.g. `polish8`, `swapxyz`), and the invalid-id URL the Reviewer should
  hit (`/s/0000000` is a fine test case).
- Status flipped to `claimed`.

## Out of scope (do not start)

- Score tracking. No "P 1 - S 0" counter. The decision log explicitly
  defers best-of-three with score for risk reasons.
- Match end / declared match winner. Play Again continues to loop
  rounds indefinitely.
- Theme, animations beyond what already exists, sound, haptics.
- Reconnection across DO eviction.
- Any change to the substrate's connection-count / session-full
  behaviour. The existing substrate tests must continue passing.
- Any change to the existing tick / collision / cooldown logic. Touch
  only role assignment, the Play Again transition, and the 404 page.

## Hard escalation rule

If at the **15-minute mark** the existing Lanes Playwright suite is
red because of your changes, **revert the role-swap change** and keep
only the invalid-id page. Append a one-line note to the review-queue
claim that role-swap was reverted for risk reasons. A regressed MVP is
much worse than an unswapped one.

## Notes

- Commit small. Do not sign commits. Drop the signature with
  `-c commit.gpgsign=false` if it prompts. Never `--no-verify`.
- Update Status: `assigned` → `in-progress` → `claimed`.
- The role-swap change should be small — one or two new fields in the
  DO state (e.g. a `roundIndex` or a flag for who is currently Pilot)
  and a re-broadcast of `role` messages on each `countdown` entry.
- The Reviewer will extend Playwright with a Play-Again role-swap
  assertion when you claim.
