# Decision log

Append-only record of decisions made by the Orchestrator. Each entry follows
the format below. Never edit past entries. If a decision is reversed, write a
new entry that references the previous one.

---

## YYYY-MM-DD HH:MM — [Decision title]

**Context:** What situation prompted this decision.
**Options considered:** What alternatives were on the table.
**Choice:** What was decided.
**Rationale:** Why this over the alternatives.
**Reversible?** Yes / No / Costly to reverse.

---

## 2026-05-01 10:51 — Deadline extended by one hour

**Context:** On re-reading `BRIEF.md` the fixed deadline has moved from
`2026-05-01T12:00:00.000Z` (recorded at kickoff) to `2026-05-01T13:00:00+00:00`.
Current time is 2026-05-01 10:51 UTC, so remaining budget is now ~2h 09m where
it was going to be ~1h 09m. The realtime two-phone session scaffold is shipped
(commit 4ce8722), so the entire extension is available for what comes after the
floor.

**Options considered:**

1. Treat the extra hour as breathing room and proceed with the existing plan
   (one game, MVP, polish only if time allows).
2. Spend the extension on scope — bigger game, richer mechanic, more polish.
3. Spend the extension on a second, different game (the brief explicitly
   permits this after MVP).

**Choice:** Option 1 — treat the hour as breathing room, not as licence to
expand scope. The brief still demands a phone-portrait, asymmetric, sub-5-minute,
not-a-clone game shipped with a launch post and a README. None of those are
done. The realtime substrate is a floor, not the game.

**Rationale:** A second game (option 3) doubles surface area and risks neither
finishing. Bigger scope (option 2) is the classic trap when more time appears —
features expand to fill the budget and quality drops. The extra hour is most
valuable as a buffer for the things that always overrun on a hackathon: the
last 20% of MVP, the first session played by someone who didn't build it, and
the launch post. The plan from the kickoff entry is unchanged: commit to a game
concept, drop it on the substrate, ship MVP, write the launch post, then decide
what to do with leftover time.

**Concrete pacing implications for the next cycle:**

- Next decision is the game concept itself — promote the "Lighthouse" working
  hypothesis to a committed decision (or replace it) before assigning the next
  task.
- After the concept is committed, the next Engineer task is "first playable
  vertical slice on top of the substrate" — not the full game, the smallest
  thing that demonstrates asymmetric play to an ending.
- Queue a launch post in `blog-queue.md` only when MVP itself is shipped, not
  on the substrate alone (substrate is invisible to a player; it is not a
  milestone worth a post on its own — release-note material at most).
- The hand-off rule "every PASS gets a post queued" still binds; reconciling
  with the line above means the substrate PASS gets a short release-note entry
  in `blog-queue.md`, not a launch post.

**Reversible?** Yes — pacing intent only. No code or task assignment changes.

---

## 2026-05-01 10:25 — Initial reading of the brief

**Context:** T+0. Orchestrator has just read `BRIEF.md` for the first time. No
prior decisions. Starter Worker at `apps/product/src/index.ts` serves a static
"coming soon" page.

**Brief in my own words:** Build and publicly deploy a real-time, two-player,
asymmetric web game playable end-to-end on a phone in portrait, with sessions
that resolve in under five minutes. The two players are non-gamer adults who
joined via a shared link. The game must not be a recognisable clone of an
existing game (explicit blocklist: chess, draughts, connect-N, standard card
games, battleships, hangman, tic-tac-toe, RPS). MVP ships when a stranger can
open the URL on a phone, get into a session with another player, play to a
clear ending, all without manual intervention. Public blog posts at every
milestone are part of the deliverable; a rival team is building from the same
brief and may read ours.

**First concrete goal toward shipping it:** A realtime session substrate. Two
phones can hit a shared `/s/:id` URL and confirm they are connected to the same
live server-side session within seconds. Game-mechanic-agnostic, but it is the
floor every later decision rests on. Cloudflare Workers + a Durable Object per
session + WebSockets is the Worker-native fit and matches the deploy target the
template already pins. Once that floor is in, we can drop a game on top.

**Working hypothesis on the game itself ("Lighthouse"):** One player is the
lighthouse keeper (top-down map of a stormy coast, hazards visible, controls a
sweeping beam of light); the other is the sailor (sees only what the beam
illuminates plus a heading dial, steers the ship). Win condition: the sailor
reaches the harbour within ~3 minutes without striking rocks. Asymmetric by
construction (different views, different inputs, shared objective). Not on the
clone blocklist and not a recognisable port. Holding this loosely — it is a
hypothesis to defend in a follow-up decision once the substrate exists, not a
commitment that constrains the first task.

**Constraints that jumped out:**

- "Asymmetric" is the sharpest constraint. Symmetric mirror games are
  explicitly excluded, so we cannot fall back on the easy pattern of "two
  players doing the same thing on opposite sides." Asymmetry needs to be
  designed in from the start, not bolted on.
- Phone-portrait primary forces UI decisions early — vertical layouts, touch
  inputs, no hover, thumb-reach affordances. A desktop-first prototype will
  cost us rework.
- Under five minutes per session pushes against any genre that needs a long
  ramp (build-up strategy, narrative). Whatever we pick must be legible in
  ~30 seconds and resolved within five minutes.
- "Without manual intervention from you" rules out us standing up sessions by
  hand. Joining must be via a shareable link only.
- Public blog posts and decision log are evaluated artefacts — the trail
  matters as much as the artefact. Every non-trivial decision logs here.

**Reversible?** Yes. The brief reading is interpretation, not commitment.

