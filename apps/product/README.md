# Product app

Two-phone realtime session substrate plus the **Lanes** game on top of it.
A single Cloudflare Worker plus one Durable Object class (`SessionRoom`).
No framework, no database, no UI library. See the
[repo-root README](../../README.md) for what the game is and how to play.

The substrate routes WebSockets to a per-session DO; the DO holds the
game state machine (`lobby` → `countdown` → `running` → `over`), runs a
100 ms tick loop while the round is live, and broadcasts role-tailored
state to each client.

## Architecture

```
  GET  /                  → landing page with "Create session" button
  POST /api/session       → mints a short id and 303-redirects to /s/:id
  GET  /s/:id             → session page (HTML)
  GET  /s/:id (Upgrade)   → WebSocket → SessionRoom DO instance for :id
```

`SessionRoom` is a Durable Object. Each session id maps to one DO instance
via `idFromName(sessionId)`, so two phones loading the same `/s/:id` URL
land on the same in-memory room.

The DO holds at most two live WebSocket clients. Whenever the connection
count changes it broadcasts a JSON `roster` frame:

```json
{ "type": "roster", "connected": 2, "capacity": 2 }
```

The session page renders this as `2 of 2 connected`. A third client
attempting to join the same room is closed with WebSocket code `4000` and
reason `session full`.

State is in memory only. There is no persistence and no reconnection
logic beyond what the browser does on its own. If the DO is evicted,
the session disappears — adequate for the realtime floor; the substrate
will grow persistence when the game on top of it needs it.

## Layout

- `src/index.ts` — Worker fetch handler. Routes, session id minting, the
  HTML for the landing and session pages, and the WebSocket-to-DO hand-off.
- `src/session.ts` — the `SessionRoom` Durable Object class.
- `wrangler.jsonc` — DO binding (`SESSION_ROOM` → `SessionRoom`) and the
  `v1` migration that registers the class.

## Scripts

- `pnpm --filter product dev` — local dev server via `wrangler dev`. The
  local runtime emulates the Durable Object in memory, so two browser
  windows pointed at `http://localhost:8787/s/<id>` will exercise the
  same code path as production.
- `pnpm --filter product build` — `wrangler deploy --dry-run` to validate
  config (bindings, migrations, types).
- `pnpm --filter product deploy` — deploy to Cloudflare Workers.
- `pnpm --filter product test:e2e` — Playwright end-to-end tests.
- `pnpm --filter product lint` — ESLint with `curly: all` and the strict
  TypeScript ruleset.

## Manual smoke

1. `pnpm --filter product dev`.
2. Open `http://localhost:8787/` in two browser windows (or one window and
   one phone on the same network using the dev URL).
3. Click "Create session" in the first window. It redirects to
   `/s/<id>` and shows `1 of 2 connected`.
4. Copy the URL into the second window. Both should now show
   `2 of 2 connected` within a couple of seconds.
5. Open the same URL in a third window. It should show `Session full`
   (the WebSocket is closed by the DO with code `4000`).

## Tests

`tests/smoke.spec.ts` is the existing Playwright smoke. The Reviewer
extends Playwright coverage to verify the realtime behaviour against the
deployed URL. Tests run against `PRODUCT_URL` if set, otherwise
`http://localhost:8787` for local dev.

## Adding Cloudflare resources

If a future task needs KV, D1, R2, or another Durable Object class, add
the binding to `wrangler.jsonc`, provision via the Cloudflare Developer
Platform MCP (or `wrangler` CLI), and record the decision in
`coordination/decision-log.md`.
