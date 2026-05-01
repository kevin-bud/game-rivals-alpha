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

**Reviewer verdict:** _pending_
