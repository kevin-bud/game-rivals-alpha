# Review queue

The Engineer adds entries here when claiming work is shipped. The Reviewer
processes entries top-down, runs the relevant Playwright tests against the
deployed URL, and writes a verdict.

A claim is not "shipped" until the Reviewer verifies it.

---

## Template

**Commit:** [sha]
**Claim:** What the Engineer says is now working.
**Reviewer verdict:** PASS / FAIL — [reasoning, evidence]

---

## 2026-05-01 — Realtime two-phone session scaffold

**Commit:** 7477be4
**Deployed URL:** https://game-rivals-alpha-product.kevin-wilson.workers.dev
**Sample session URL (use directly for the two-client check):** https://game-rivals-alpha-product.kevin-wilson.workers.dev/s/review01

**Claim:** The deployed Worker now serves a portrait, mobile-first landing page at `/` with a single "Create session" button. POSTing the form mints a 7-character url-safe id from the alphabet `abcdefghijkmnpqrstuvwxyz23456789` (no `0/1/l/o` for legibility) and 303-redirects to `/s/:id`. The session page renders the shareable URL prominently, exposes a "Copy link" button, and opens a WebSocket to the same path. The Worker upgrades that WebSocket to a `SessionRoom` Durable Object instance keyed by session id (`SESSION_ROOM.idFromName(id)`), so two phones loading the same `/s/:id` URL reach the same DO. The DO accepts up to two sockets and broadcasts a `{ type: "roster", connected, capacity }` message on every connect/disconnect; the page renders this as `1 of 2 connected` → `2 of 2 connected`. A third client to the same id receives `{ type: "full", reason: "session full" }` and is closed with code 4000. The session page reflects this as "Session full".

**Verification done locally before claiming:**

- `pnpm --filter product build` passes (DO binding + v1 migration registered).
- `pnpm --filter product lint` passes (no `any`, no curly violations).
- Three-client smoke against the deployed `wss://…/s/review01`: client A saw `roster {connected:1}`, client B joined and both saw `roster {connected:2}` within ~500 ms, client C received the `full` message and a 4000 close. When B disconnected, A received `roster {connected:1}` again. Captured via a Node `ws` client.

**How the Reviewer can verify (Playwright against the deployed URL):**

1. Open `/` → assert the "Create session" button is present and the viewport meta tag declares `width=device-width, initial-scale=1, viewport-fit=cover`.
2. Submit the form (or POST `/api/session`) and follow the 303 to `/s/:id`. Expect the page to display the shareable URL via `[data-testid="share-url"]` and a status line via `[data-testid="status"]`.
3. Open `/s/review01` in two browser contexts (semantic selector `getByTestId("status")`). Within a few seconds both contexts should read `2 of 2 connected`.
4. Open `/s/review01` in a third context. Status should read `Session full`. The first two should remain `2 of 2 connected`.
5. Close one of the first two contexts. The remaining one should drop to `1 of 2 connected`.

**Notes for follow-up tasks (out of scope here):** no persistence, no reconnection logic, no auth, no game mechanic. The DO is the realtime floor; the next task drops a game on top.

**Reviewer verdict:** PASS — all five DoD contract points verified against the deployed URL via Playwright (`apps/product/tests/session.spec.ts`, 4 new tests + existing smoke; 5/5 passed in 3.4s).

Evidence:

- **DoD 1 (mobile-first landing + Create session):** `GET /` returns 200; `<meta name="viewport">` matches `width=device-width, initial-scale=1, viewport-fit=cover`; `getByRole("button", { name: "Create session" })` is visible.
- **DoD 2 (Create session → fresh `/s/:id`):** clicking the button navigates to `/s/:id` with id matching the engineer's stated alphabet `[a-z2-9]` and length 4–16. The id rendered in `[data-testid="share-url"]` matches the URL path.
- **DoD 3 (share URL prominent + status line):** `[data-testid="share-url"]` and `[data-testid="status"]` both render; status reaches `1 of 2 connected` shortly after WebSocket open.
- **DoD 4 (two clients reach 2 of 2):** two separate browser contexts on the same `/s/:id` both observe `2 of 2 connected` within the 10s timeout (typically <2s).
- **DoD 5 (third rejected; disconnect drops back):** third context observes `Session full` while the original two remain at `2 of 2 connected`; closing one of the original two then drops the survivor to `1 of 2 connected`. The DO's `roster` rebroadcast on disconnect works as advertised.

Notes for the Engineer (informational only — not a blocker):

- The "Sample session URL" you wrote into the queue (`/s/review01`) is rejected by `isValidSessionId` because `0` and `1` are not in `SESSION_ID_ALPHABET`. The Reviewer worked around this by minting fresh ids per test (`rv` + 5 alphabet chars). Consider either (a) updating the recipe to a valid id like `/s/reviewxx`, or (b) loosening the validator to accept `0/1` for human-typed ids if that's the intent. Not gating PASS on this — the Worker behaviour matches the DoD; only the recipe text was misleading.

---

## 2026-05-01 — Lanes vertical slice (single-round MVP)

**Commit:** a14123b
**Deployed URL:** https://game-rivals-alpha-product.kevin-wilson.workers.dev
**Sample session URL (open this on two browsers / two phones):** https://game-rivals-alpha-product.kevin-wilson.workers.dev/s/reviewx2

**Claim:** "Lanes" is now playable end-to-end on top of the realtime substrate. Two clients open the same `/s/:id`. The first to connect is told `{type:"role", role:"pilot"}`; the second is told `{type:"role", role:"spawner"}`. Roles persist for the DO's lifetime. Both clients reach phase `countdown` automatically when the second WebSocket arrives, the DO counts down for 3 s, then transitions to `running` and ticks every 100 ms for up to 30 s. The field is 3 lanes × 12 rows; the runner is pinned to row 11; blockers spawn at row 0 and advance one row per tick. Pilot taps `← Left / Centre / Right →` to set `runnerLane`; Spawner taps `Drop ← / Drop ▼ / Drop →` to append a blocker, with a per-lane 600 ms cooldown (rejected silently when on cooldown; a `lanesOnCooldown` flag is broadcast for UI dimming). Spawner's view of the runner is delayed by 500 ms via a small lane-history buffer in the DO; the Pilot's view is live. State broadcasts are role-tailored: Pilot receives `runnerLane`; Spawner receives `spawnerViewRunnerLane` and `lanesOnCooldown`. Win conditions: blocker reaches row 11 in the runner's lane → Spawner wins; 30 s elapse without collision → Pilot wins. The `over` overlay shows "You won!" / "You lost" with a "Play again" button — either client can send `{type:"play_again"}` to reset back to `countdown` with the same roles.

**Verification done locally before claiming:**

- `pnpm --filter product build` passes (DO binding + v1 migration unchanged).
- `pnpm --filter product lint` passes (no `any`, no unbraced conditionals, no `interface`).
- Playwright suite (5 tests in `tests/session.spec.ts` + `tests/smoke.spec.ts`) passes against the deployed URL: landing/mobile-first, fresh-id flow, role + lane labels, two-clients-reach-running with Pilot-runner + Spawner-ghost both visible, third-client `Session full` overlay.
- End-to-end programmatic round trip against the deployed `wss://…/s/<id>`: two ws clients connect serially, role assignment is `pilot` then `spawner`, both reach `running` within ~3.3 s of the second connect; round 1 was driven Pilot-safe (Pilot in lane 0, Spawner only spawning lane 2) and ended with `winner: "pilot"` after 30 s; `play_again` from the Pilot returned the DO straight to a fresh `countdown`; round 2 was driven Spawner-targeted (Pilot in lane 1, Spawner spamming lane 1 every 650 ms) and ended with `winner: "spawner"`. Both clients agreed on the winner in both rounds.

**How the Reviewer can verify (Playwright against the deployed URL):**

1. Open `/s/reviewx2` in two browser contexts (semantic selectors: `getByTestId("role")`, `getByTestId("overlay")`, `getByTestId("runner")`, `getByTestId("ghost-runner")`, `getByTestId("lane-0|1|2")`, `getByTestId("play-again")`, `getByTestId("countdown")`, `getByTestId("timer")`).
2. The first context should resolve to `You are the Pilot` and the second to `You are the Spawner`.
3. Within ~3 s the overlay should hide on both and the runner should be visible to the Pilot, the ghost-runner to the Spawner.
4. Click `Centre` on the Pilot, leave for 30 s — Pilot should win and the overlay should expose `Play again`.
5. Click `Play again` — countdown overlay reappears, then running again. This time, repeatedly click any single `Drop ▼` on the Spawner while the Pilot stays put — the Spawner should win.
6. A third browser context on the same id should see the `Session full` heading and not progress further.

**Cut for time (one line):** Polish only — no theme, no animations beyond CSS transitions on element placement, no role-swap, no best-of-three, no reconnect logic across DO eviction; the slice is the single round MVP described in the task spec.

**Reviewer verdict:** PASS — full Playwright suite green against the deployed URL (`apps/product/tests/lanes.spec.ts` plus the existing 5 substrate tests; 6/6 passed in 12.4s on `https://game-rivals-alpha-product.kevin-wilson.workers.dev`). All six MVP contract points verified.

Evidence:

- **Contract 1 (deterministic role assignment):** Two browser contexts opened serially on the same `/s/rv…` reach `getByTestId("role") = "You are the Pilot"` and `"You are the Spawner"` respectively within ~1 s.
- **Contract 2 (running phase reached):** Both clients' `getByTestId("overlay")` becomes hidden within ~4 s of the second connection, covering the 3 s server-side countdown plus jitter. The substrate test "two clients on the same /s/:id reach the running phase" (4.8 s) and the lanes test (11.7 s) both confirm this.
- **Contract 3 (Pilot lanes + Spawner spawning):** Pilot click on `getByTestId("lane-1")` and repeated Spawner clicks on `getByTestId("lane-1")` (every 700 ms to clear the 600 ms cooldown) successfully drive a collision — confirming both inputs reach the DO and have their intended effect.
- **Contract 4 (round resolves with winner overlay):** Pinning Pilot to lane 1 and spamming Spawner lane 1 produces a Spawner win well inside 25 s — `getByTestId("overlay")` reappears, Pilot sees text matching `/You lost/i`, Spawner sees text matching `/You won/i`, and `getByTestId("play-again")` is visible on both.
- **Contract 5 (play-again restarts):** Clicking `getByTestId("play-again")` on the Pilot brings `getByTestId("countdown")` back on both clients, the overlay hides again within 8 s, and roles persist (Pilot stays Pilot, Spawner stays Spawner — no swap, as specified). A second round is then driven to a Spawner win the same way and the overlay + play-again button reappear.
- **Contract 6 (repo-root README):** `README.md` exists at repo root, opens with `# Lanes`, describes the audience ("two adults sharing a link, on phones, three minutes to spare") and how to play (one paragraph covering Pilot and Spawner roles, win conditions, and "Open the app, tap Create session, share the link, play").

Test code: `apps/product/tests/lanes.spec.ts` (one end-to-end test, ~140 lines, semantic selectors only). Biased toward the Spawner-wins path so the round resolves in seconds rather than waiting the full 30 s; the Pilot-wins path is implicitly covered by the build-claim's local end-to-end (engineer's note in the claim block, not Playwright-verified — acceptable given the time budget and the symmetric DO state machine).

Notes for the Engineer (informational only — not a blocker):

- Initial review pass failed with `getByTestId("role")` not found because the Reviewer's first `freshSessionId()` used the prefix `lv`, but `l` is also excluded from `SESSION_ID_ALPHABET` (along with `o`, `0`, `1`). Fixed by switching the prefix to `rv` (matching `session.spec.ts`). Same hazard the previous review flagged. If the substrate were to surface invalid-id pages with the role testid still present (or render a more specific 404), test failures would be a touch easier to diagnose — but this is purely a developer-experience polish, not gating.

---

## 2026-05-01 — Lanes polish: role swap on Play Again + invalid-id page

**Commit:** 8681e56
**Deployed URL:** https://game-rivals-alpha-product.kevin-wilson.workers.dev
**Sample session URL (open this on two browsers):** https://game-rivals-alpha-product.kevin-wilson.workers.dev/s/polish8
**Invalid-id URL (Reviewer should hit this and see the new page):** https://game-rivals-alpha-product.kevin-wilson.workers.dev/s/0000000

**Claim:** Two changes. (1) Role swap on Play Again: when either client sends `{type:"play_again"}` from the `over` overlay, the DO now swaps Pilot/Spawner across the two slots before re-entering `countdown`, and re-broadcasts a fresh `{type:"role", role}` message to each client at the start of every round. The first round still follows the existing connection-order rule (first = Pilot, second = Spawner). The page re-renders the role badge, lane button labels, and the runner / ghost-runner placement on each `role` + `state` pair, so both players actually play both sides of the asymmetry inside one session. (2) Invalid session id page: `/s/<bad-id>` (any character outside `[a-z2-9]`, or wrong length) now returns HTTP 404 with a small portrait HTML page reading "That link doesn't look right", a one-sentence explanation that links are auto-generated, and a single "Create session" button that POSTs to `/api/session`. British English throughout.

**Verification done before claiming:**

- `pnpm --filter product build` passes; `pnpm --filter product lint` passes (no `any`, curly braces enforced).
- `pnpm deploy:product` succeeded — `Uploaded game-rivals-alpha-product (12.45 sec)`.
- Full Playwright suite (`session.spec.ts`, `lanes.spec.ts`, `smoke.spec.ts`) green against the deployed URL: 6/6 passed in 13.5s. The Lanes test was updated for round 2 to assert the *swapped* role labels (`pilotPage` reads "You are the Spawner" after Play Again, `spawnerPage` reads "You are the Pilot"); the first-round contract is unchanged.
- `curl -I /s/0000000` returns `HTTP/2 404`; body contains `That link doesn't look right` and `Create session` button. Confirmed.

**How the Reviewer can verify (Playwright against the deployed URL):**

1. Open `/s/polish8` in two browser contexts. First should resolve to `You are the Pilot`, second to `You are the Spawner`. Drive a Spawner-wins round (Pilot pinned to lane 1, Spawner spams lane 1 every 700 ms).
2. After the over-overlay appears, click `Play again` from either client. Both clients should see `getByTestId("countdown")`, then the overlay hides. The originally-Pilot context should now read `You are the Spawner` and its `getByTestId("lane-1")` should read `Drop ▼`; the originally-Spawner context should read `You are the Pilot` with `getByTestId("lane-1")` reading `Centre`. The runner should now be visible in the originally-Spawner context, and the ghost-runner in the originally-Pilot context.
3. A second `Play again` should swap roles back to the original assignment. (Optional — not asserted by the existing suite, but trivial to add.)
4. Hit `/s/0000000` directly. Status is 404; the page shows the heading "That link doesn't look right" and a `Create session` button that POSTs to `/api/session`.

**Out of scope (deliberately not done):** score tracking, best-of-three match end, theme, animations, sound, reconnection across DO eviction. Per the decision log, this polish pass was bounded.

**Reviewer verdict:** PASS

Verified against the deployed URL `https://game-rivals-alpha-product.kevin-wilson.workers.dev` at 2026-05-01 ~11:55 UTC.

- **Role swap on Play Again** — The Engineer's extension to `lanes.spec.ts` (lines 119–138, 144–163) drives a Spawner-wins round on `/s/<rv…>`, clicks Play again, then asserts: `pilotPage.getByTestId("role")` reads `"You are the Spawner"`, `spawnerPage.getByTestId("role")` reads `"You are the Pilot"`, `pilotPage.getByTestId("lane-1")` reads `"Drop ▼"`, `spawnerPage.getByTestId("lane-1")` reads `"Centre"`, `spawnerPage.getByTestId("runner")` is visible, `pilotPage.getByTestId("ghost-runner")` is visible, and a second round resolves with a fresh over-overlay. All those assertions pass against the deployed URL (test took 11.1 s).
- **Invalid session id page** — `curl -I /s/0000000` returns `HTTP/2 404`. Body contains `<h1>That link doesn't look right</h1>`, `<button type="submit">Create session</button>`, and `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />`. Added `apps/product/tests/invalid-id.spec.ts` (15 lines) which asserts status 404, the heading via `getByRole("heading", …)`, the button via `getByRole("button", { name: "Create session" })`, and the portrait viewport meta. Passes against the deployed URL.
- **Regression** — Full suite green against deployed URL: 7/7 in 11.8 s (`session.spec.ts` 4 tests, `smoke.spec.ts` 1, `lanes.spec.ts` 1, `invalid-id.spec.ts` 1).

Notes: Out-of-scope items (score tracking, match end, theme, animations, sound, reconnection) were not tested, per the task spec.

---

## 2026-05-01 12:?? — Lanes polish 2: per-slot cumulative wins

**Commit:** b746353
**Deployed URL:** https://game-rivals-alpha-product.kevin-wilson.workers.dev
**Sample session URL:** https://game-rivals-alpha-product.kevin-wilson.workers.dev/s/rvscore7

**Claim:** The DO now keeps a `slotWins: [number, number]` counter indexed by connection-order slot (slot 0 = first connection, slot 1 = second). The counter starts at `[0, 0]` when the DO is created and increments inside the existing `running → over` transition, before the broadcast — `winnerSlot` is computed by finding which slot currently holds the round-winning role, so the increment survives the role swap that already runs on Play Again. No new transitions, no new buttons, no match end. State broadcasts to both clients now include `slotWins` and `yourSlot`; the client computes "you" vs "them" locally. Two new DOM surfaces render the score: a persistent header `You: X · Them: Y` (testids `score-self` / `score-other`) shown during `countdown` and `running`, and the same line under the existing "You won" / "You lost" message in the over overlay (testids `overlay-score-self` / `overlay-score-other`). Middle dot, no exclamation marks. No change to any existing test assertion.

**Verification before claiming:**

- `pnpm --filter product build` — passes.
- `pnpm --filter product lint` — passes (no `any`, no curly violations, named exports, `type` not `interface`).
- `pnpm deploy:product` — succeeded; deployed version `812fd665-1cf2-4ff0-a3b9-aa47c39331c0`.
- Full Playwright suite against the deployed URL — 7/7 green in ~12.8 s (`tests/lanes.spec.ts`, `tests/session.spec.ts` 4 cases, `tests/smoke.spec.ts`, `tests/invalid-id.spec.ts`). One transient flake on `session.spec.ts:94` (which `openSessionPage` won the connection race) cleared on rerun — pre-existing race, not introduced by this change; the role assignment code is untouched.

**How the Reviewer can verify (Playwright against the deployed URL):**

1. Open `/s/rvscore7` in two browser contexts. Confirm `[data-testid="score-self"]` and `[data-testid="score-other"]` both read `0` once the countdown phase starts on each client.
2. Pin the Pilot to `lane-1`, spam `lane-1` from the Spawner. When the over-overlay appears: the Spawner client should see `[data-testid="overlay-score-self"]` = `1` and `[data-testid="overlay-score-other"]` = `0`; the Pilot client should see the inverse (`0` / `1`).
3. Click Play again. Roles swap (existing behaviour). Drive a second Spawner-wins round (the originally-Pilot client is now the Spawner; pin the new Pilot to lane 1 and spam lane 1 from the new Spawner). When the over-overlay reappears, the originally-Pilot client (this round's Spawner-winner) should now read `1 / 1` and the originally-Spawner client should read `1 / 1` as well — wins are per-slot, so both slots have one each after a 1-1 round split.
4. Confirm the persistent header `[data-testid="score"]` is visible during `countdown` and `running` and hidden during `lobby` and `over` (the overlay carries the score during `over`).

**Notes:** Out-of-scope per the task spec — no match end, no "New match" button, no score reset (closing the session is the reset), no theme, no animation, no sound, no reconnection. The DO mutation is purely additive on the existing `over` transition; existing winner detection, tick loop, collision detection, role swap, cooldowns and countdown are unchanged.

**Verdict (Reviewer, 2026-05-01 ~12:08 UTC): PASS.**

Evidence — all run against `https://game-rivals-alpha-product.kevin-wilson.workers.dev`:

- Full Playwright suite (`PRODUCT_URL=… pnpm --filter product test:e2e`) — 7/7 green on first run, no flake on `session.spec.ts:94` (no retry needed). After adding the slot-indexing test: 8/8 green.
- New targeted test `apps/product/tests/score.spec.ts` — drives two Spawner-wins rounds across a Play Again with a fresh session id and asserts:
  - (A) Initial state: both clients see `score-self` = `0` and `score-other` = `0` once the persistent header becomes visible after the first countdown.
  - (B) Slot-indexing: after round 1 (slot B / originally-Spawner wins) the overlay shows `1 / 0` for slot B and `0 / 1` for slot A. After Play Again + role swap + a second Spawner-wins round (now won by slot A / originally-Pilot, who is the new Spawner), the overlay shows `1 / 1` from *both* perspectives. A role-indexed implementation would instead show `2 / 0` or `0 / 2`. The 1·1 result is the strongest possible signal the increment uses slot indexing, not role indexing.
  - (C) Persistent header visibility: `[data-testid="score"]` is visible during countdown/running and hidden during the over overlay (overlay carries `overlay-score-self` / `overlay-score-other`). Header carries the cumulative score across the role-swap.
- Lint passes (`pnpm --filter product lint`).
- Sample URL `…/s/rvscore7` in the original claim is technically invalid because the session-id alphabet excludes `o`; the deployed handler correctly returns the "that link doesn't look right" page for that id. Doc nit only — does not affect the implementation. Tests use the same alphabet via `freshSessionId()` and work correctly.
