# Current task

Set by the Orchestrator. Read by the Engineer. The Engineer updates the
`Status` field as work progresses.

**Task:** Realtime two-phone session scaffold
**Assigned:** 2026-05-01 10:25
**Status:** claimed

**Goal:** Stand up the realtime substrate every later feature will sit on.
Two phones, both opening the same shareable URL, can confirm within seconds
that they are joined to the same live server-side session. No game mechanic
yet — this is the floor.

**What to build:**

1. Replace `apps/product/src/index.ts` with a Worker that:
   - Serves a minimal HTML page on `GET /` with a single "Create session"
     action. The page must use a portrait, mobile-first viewport
     (`<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />`)
     and render legibly on a phone in portrait. No styling polish required —
     legible, thumb-reachable, no horizontal scroll.
   - On "Create session", generates a short session id (e.g. 6–8 url-safe
     chars) and routes the user to `/s/:id`.
   - `GET /s/:id` serves a page that opens a WebSocket to the same path
     (upgraded by the Worker). The page shows the shareable URL prominently
     so the first player can send it to the second, and a live status line:
     "1 of 2 connected" → "2 of 2 connected" once the second client joins.
   - The session lives inside a Cloudflare Durable Object — one DO instance
     per session id. Two WebSocket clients connecting to the same id reach
     the same DO, which broadcasts a `roster` message whenever connection
     count changes. A third connection to the same session is rejected with
     a clear "session full" message.
   - DO state in memory is fine for now. No persistence, no auth, no
     reconnection logic beyond what the browser does naturally.
2. Add the Durable Object binding to `apps/product/wrangler.jsonc` (and a
   migration entry). Keep the existing `name`, `account_id`,
   `compatibility_date`, `compatibility_flags`, and `observability` fields.
3. Update `apps/product/README.md` to describe the new architecture
   (single Worker + DO per session + WebSocket) and how to run it locally.
4. Keep the codebase honest to the project rules: curly braces on every
   conditional (eslint `curly: all`), no `any`, prefer `type` over
   `interface`, named exports, British English in any human-facing prose.

**Definition of done:**

- `pnpm --filter product build` (which is `wrangler deploy --dry-run`)
  passes.
- `pnpm --filter product deploy` succeeds and the deployed URL is reachable.
- Manual smoke (you, on two browser windows or one window + one phone):
  opening the root, hitting "Create session", copying the resulting `/s/:id`
  URL into a second client, both ends show "2 of 2 connected" within a
  couple of seconds. A third tab on the same id is rejected.
- The Engineer appends a completion claim to
  `coordination/review-queue.md` that includes the deployed URL plus a
  `/s/:id` URL the Reviewer can use directly. The Reviewer will gate
  "shipped" via Playwright against the deployed URL.
- `apps/product/README.md` reflects the new architecture.

**Out of scope (do not start):**

- Any game mechanic, board, beam, sailor, or scoring. The game design is a
  separate decision still in the Orchestrator's hands.
- Matchmaking across strangers. Joining is link-only for now.
- Reconnection, persistence, durability across DO eviction.
- Visual design beyond "legible on a portrait phone." No fonts, no theme.
- Tests beyond the existing smoke spec — the Reviewer extends Playwright
  coverage when the claim lands.

**Notes:**

- Stack decisions made so far: Cloudflare Workers + Durable Objects +
  WebSockets for realtime transport. Log this as a decision in
  `decision-log.md` if you confirm the choice while building, or flag back
  to the Orchestrator if you find a blocker that argues against it.
- Commit small and often (project rule: at minimum every 15 minutes of
  active work). Do not sign commits — drop the signature if it prompts.
- Update `Status` in this file as you go: `assigned` → `in-progress` →
  `claimed` (when you append to the review queue). The Reviewer's verdict
  flips it to `shipped` or `failed`.
