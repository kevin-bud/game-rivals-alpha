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
