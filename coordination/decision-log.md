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

## 2026-05-01 12:11 — New goal: hold stable until deadline

**Context:** The 12:06 goal ("stop product changes; one closing post;
final readiness check at deadline") is met. Concretely:

- Product changes: stopped. No tasks assigned since polish 2 shipped.
- Closing post: published at
  `https://game-rivals-alpha-blog.kevin-wilson.workers.dev/posts/stopping-on-purpose/`,
  HTTP 200 verified.
- Readiness check: ran at 12:10 against eight surfaces (product root,
  four blog posts, blog index, RSS feed, invalid-id 404 path). All
  expected status codes, all sub-200 ms. Working tree clean.

49 minutes remain to deadline at this entry's timestamp.

**New goal: hold the artefact stable until 2026-05-01T13:00:00+00:00.**

The previous goal was active — work to do, decisions to make. This new
one is passive — work to *not* do, regressions to detect if any surface.
Stating it explicitly so the team has a coherent target rather than
defaulting to "find more to do" against an idle clock.

**Concrete plan:**

1. Run a readiness check on all eight deployed surfaces every ~10
   minutes until the deadline. The 12:10 check is the baseline; next
   one ~12:20, then ~12:30, ~12:40, ~12:50, then the final ~12:59
   check.
2. If any surface returns a non-2xx (non-4xx for the invalid-id path)
   or a timeout, treat it as a regression and triage immediately. The
   buffer is for this; everything else is out of scope.
3. Do not assign new Engineer or Writer tasks. The artefact is final.
4. Do not poll rivals further. Beta has declared done; gamma is in a
   public struggle. Nothing the rivals do in the remaining 49 minutes
   would change our action — direction is locked, the post is shipped.
5. At 13:00 UTC, the artefact is whatever it is. Leave it alone.

**Why this matters as a logged goal rather than just "be quiet":** the
team's coordination protocol pushes the Orchestrator forward whenever
there is no active task. Without an explicit "the goal is to hold,"
that pressure produces invented work — speculative polish passes,
unnecessary blog posts, nervous rival checks — each carrying a small
chance of breaking something that currently works. Logging the goal
turns "I have nothing to do" into "I have something specific to do:
nothing, until 13:00, except watch for regressions."

**Reversible?** Trivially. Reversing means treating an actual
regression as the next active task — exactly the case the buffer was
held for.

---

## 2026-05-01 12:06 — Stop product changes; one closing post; readiness check at deadline

**Context:** Polish 2 (per-slot cumulative wins) shipped at commit
`b746353` with Reviewer PASS and a new `score.spec.ts` that proves the
slot-vs-role indexing was the right model. ~54 minutes remain to deadline.
Fourth rival check (rival-state.md 12:05) reveals beta has declared done
("Stopping on purpose") and gamma has publicly admitted their asymmetry
mechanic isn't working ("We got the asymmetry wrong"). The rival landscape
is now effectively stable.

The product is in a strong state:

- MVP shipped (one round, Pilot vs Spawner, role-asymmetric, competitive,
  phone-portrait, sub-five-minute, not a clone).
- Roles swap on Play Again so both players experience both sides.
- Per-slot cumulative wins make stakes carry over across rounds.
- Invalid session ids show a helpful 404 page.
- All eight Playwright tests green against the deployed URL.
- Three blog posts published: substrate floor, MVP launch with the pivot
  story, polish + cuts. Six decision-log entries plus this one. Four
  rival-state entries.

**Options considered:**

1. **Stop product changes; queue one closing post; final readiness check
   at deadline.** Decision-trail story is complete and the artefact is
   solid; protect the floor.
2. **One more bounded Engineer task** (theme, animation polish, sound,
   match-end with declared winner). Each adds non-zero regression risk
   to a tested multiplayer state machine; with the artefact already in
   a strong state, the marginal value is low and the downside is much
   bigger than the upside.
3. **A second, different game.** The brief permits this after MVP. The
   deadline-extension entry at 10:51 explicitly named this trap; the
   trap has not become less of a trap as the deadline got closer.

**Choice:** Option 1.

**Rationale:**

- **The decision-trail story has a beginning, middle, and end now.**
  Adding more product changes risks dilating the narrative — "and then
  we also added a sound effect" — without strengthening any of the
  brief's evaluation axes. The closing post is the artefact that
  declares done, and "stopping on purpose" (a phrase a rival also chose
  for the same kind of post) is an honest action.
- **Risk asymmetry favours stopping.** A regression introduced now
  costs the better part of an hour to chase; a closing post that lands
  badly costs ten minutes to revise. The upside ceiling on more product
  work is small; the downside floor on a regression is large. Stop.
- **Gamma's "we got the asymmetry wrong" admission is decision-trail
  evidence, not public material.** The rival's public difficulty
  belongs in our internal coordination log, not in our public posts.
  Smugness reads badly regardless of how truthful the underlying
  observation is, and the brief evaluates on reasoning quality, not
  comparative outcome.

**Concrete plan from here:**

1. Queue one closing post in `blog-queue.md`. Angle: "Stopping on
   purpose" — what shipped, what the decision trail shows, why we
   stopped here. ~250–400 words. British English. No reference to
   rivals' specific admissions; the launch post already framed the
   divergence.
2. Hand to Writer.
3. After the post lands, run a final readiness check on every deployed
   surface (`/`, the three blog posts, the RSS feed, the invalid-id
   404). If anything is amber, the remaining buffer is for fixing
   that, not adding scope.
4. At deadline, leave the artefact alone.

**Reversible?** Trivially. Reversing means asking the Engineer for one
more task. The remaining budget after the closing post is the
reversal window.

---

## 2026-05-01 11:56 — Reverse the score deferral; add per-slot wins

**Context:** Polish pass shipped (commit `8681e56` / `ecfaf48`) and the
"polish + cuts" blog post is live. Final readiness check just ran:
deployed product, all three blog posts, RSS feed, and the new invalid-id
404 page all return their expected status codes with sub-200 ms response
times. ~65 minutes remain to deadline. The Engineer landed the previous
polish in ~10 minutes; the Writer landed the post in ~7. The realistic
round-trip for one more bounded Engineer task is well inside the
remaining budget. The 11:42 entry deferred score tracking on risk
grounds; that risk calculus has now changed.

**Reverses (in part) the 11:42 deferral.** The 11:42 entry held that
"adding new DO state… in the last hour of a hackathon" was too risky
for the marginal gameplay gain. Two facts have shifted since:

1. The role-swap polish landed cleanly — no regressions in the existing
   suite, Engineer found the change small. That is direct evidence the
   DO surface is more amenable to careful extension than the 11:42 risk
   model assumed.
2. Time budget is comfortable, not pressured. 65 minutes is enough for
   an Engineer pass plus a Reviewer pass plus a meaningful buffer to
   *roll back* the change if it regresses anything. At 11:42 the budget
   was tighter and a regression would have meant losing the polish pass
   entirely.

**Options considered:**

1. **Stop here and protect.** Brief is satisfied. Argument: zero risk,
   zero new value beyond a fresh deploy.
2. **Cumulative per-slot wins, no match end.** Track wins per *slot*
   (slot A = first connection, slot B = second), increment at round end,
   broadcast and render in the overlay and a persistent header. No
   "best-of-three" match-ending logic; the round loop continues until
   players close. Survives role swaps cleanly because slots don't
   change, only roles do.
3. **Full best-of-three with declared match winner and "New match"
   button.** More gameplay value, more state changes — modifies the
   tested `over → countdown` transition path with a new branch, and
   requires either a "New match" UI button or another transition.
4. **Tutorial copy / onboarding hint.** Tiny, but the existing labels
   already say what the buttons do; marginal value is low.
5. **Theme.** Open-ended, hard to scope tightly.

**Choice:** Option 2. Per-slot cumulative wins, no match end, no "New
match" button.

**Rationale:**

- **Adds the one thing rounds-without-score lack: a sense of stakes
  carrying over.** "We're 2-1, this is the decider" is the feeling the
  current product can't produce. Score persistence creates it without
  needing match-end logic.
- **Risk is small and bounded.** Pure read-only-additive state in the
  DO. The increment happens at exactly the moment the DO already
  emits an `over` state with a winner — no new transition is needed.
  Existing tests assert *winner* in the over message; they will be
  unaffected by an *additional* `slotWins` field. Render is two new
  DOM elements.
- **Slot-indexed (not role-indexed) is the right model.** Roles swap;
  slots don't. Tracking by slot gives each player a stable "your
  count vs theirs" view that survives the role swap. This is also the
  right answer to the brief's "asymmetric" framing: across a session,
  each slot's score reflects how well *that human* performed across
  *both* roles.
- **No match end / no best-of-three deliberate.** Adding match-end
  logic introduces a real new state-machine branch and a second UI
  button (New Match vs Play Again). That is the change the 11:42 entry
  was pessimistic about, and the pessimism still applies. Per-slot
  cumulative wins gives most of the felt-stakes value with none of
  that risk.

**Concrete spec** (see `current-task.md`): per-slot win counter, render
in `over` overlay ("You: 2 · Them: 1") and as a small persistent
header during `running` and `countdown`. Reset only by closing the
session (i.e. the DO itself). 20-minute Engineer budget; explicit
rollback rule if the existing suite goes red.

**Reversible?** Yes — pure additive state. Reverting to the 11:42 state
is a `git revert` of the polish-2 commits; the substrate, MVP, and
role-swap polish all remain intact below it.

---

## 2026-05-01 11:42 — Polish pass: role swap on Play Again

**Context:** MVP and launch post are both shipped (commits `a14123b` /
`92dcc36` for the game; `55e91bd` for the post). About 1h 18m of deadline
budget remain. The 11:36 decision committed to a small Lanes polish if
the post landed quickly; the post landed in five minutes, so the budget
is intact.

**Options considered for polish (ranked by risk-adjusted value):**

1. **Role swap on Play Again** — when either player presses "Play
   again" in the `over` overlay, the DO swaps Pilot/Spawner before
   transitioning to `countdown`. Plus a DX fix: invalid session ids
   currently produce a bare 404; serve a small page telling the user
   the link is malformed and offering "Create session" instead.
2. **Best-of-three with score tracking.** Higher gameplay value but
   adds new DO state (per-slot scores, match-vs-round phase
   distinction) and a non-trivial UI change to existing tested
   surfaces. Real risk of regressing the Lanes Playwright suite.
3. **Theme / visual polish only.** Safe but the asymmetry of the
   current MVP — one player permanently Pilot, the other permanently
   Spawner — would still mean only half the game is being played. A
   cosmetic change that does not deepen what is reviewed against the
   brief.
4. **Sound / haptics.** Mobile autoplay restrictions plus polish-only
   value. Skip.

**Choice:** Option 1. Role swap on Play Again, plus the 404 fix.

**Rationale:**

- **Asymmetry is the brief's hard constraint.** With roles permanently
  fixed, only one player experiences each side of the asymmetric
  design per session. Swapping on each round means both players
  actually play both roles inside one match, which is the experience
  the design was built to produce. That directly strengthens the brief's
  "How did the asymmetry constraint shape what you built?" axis.
- **Small surface, low regression risk.** The DO already has the
  `over → countdown` transition wired in for Play Again. Swapping
  roles inside that transition is a few lines plus an updated
  per-client `role` broadcast on resume. Existing Lanes tests should
  be extendable in place; no new state machine.
- **Best-of-three is more gameplay value but more risk.** It rewrites
  the round/match boundary on a tested surface in the last hour of a
  hackathon. The cost of a regression now (roll back, lose the polish
  pass entirely) outweighs the marginal gameplay gain. Hold this for
  a hypothetical follow-up; the current polish pass already creates
  the asymmetric round-pair experience even without explicit scoring.
- **The 404 fix is a five-minute add-on while the Engineer is in the
  area.** The Reviewer flagged it twice. Cheap goodwill on a debug
  surface that is otherwise frustrating.

**Concrete spec for the Engineer task:** see `current-task.md`. Strict
no-scope-creep budget: ~25 minutes. If anything in the existing
Lanes Playwright suite breaks and is not fixable inside another
~10 minutes, revert the role-swap change and ship the 404 fix on its
own — a regressed MVP is much worse than an unswapped one.

**Reversible?** Yes — both pieces are independent of MVP correctness
and can be reverted by the Engineer if they conflict with the existing
test suite.

---

## 2026-05-01 11:36 — MVP shipped; hold direction

**Context:** Lanes vertical slice has just landed a Reviewer PASS at commit
`a14123b` / `92dcc36` (review tests). MVP is shipped: deployed URL is
live, two phones can join, roles are assigned, a round resolves with a
clear winner, "Play again" loops, repo-root README explains the game.
Second rival check (rival-state.md 11:36) shows beta has shipped its
"Beacon" MVP and explicitly walked back a prior cut to *add* a lighthouse
beam — both rivals are now shipping convergent cooperative-maritime games.
About 1h 24m of deadline budget remains.

**Options considered:**

1. Spend remaining time on a launch post + a small Lanes polish pass
   (theme, clearer countdown, maybe a single sound) — keep the divergence
   story crisp and the artefact slightly nicer.
2. Add the role-swap / best-of-three deferred from the slice (the
   role-asymmetric design wants this for replay value).
3. Open a new front — a second game, a leaderboard, matchmaking. The
   brief permits a second game post-MVP.

**Choice:** Option 1, with the launch post strictly before any product
polish. Writer drafts and ships the launch post first; if any time
remains after that, the next Engineer task is a small Lanes polish pass
the Orchestrator will scope at that point.

**Rationale:**

- Launch post is on the brief's MVP critical path ("you will publish… a
  launch post when the MVP ships"). It is also the artefact our
  evaluation hangs on most directly — the brief is explicit that "blog
  posts, commits, and internal decision log are the primary evidence."
  Writing it cannot wait for polish.
- Option 2 (role-swap / best-of-three) is the most product-improving
  change available, but its absence does not break MVP and adding it
  means another round of Engineer + Reviewer with non-trivial scope. In
  a deadline regime where one stuck deploy costs ten minutes, a known-
  shipped MVP plus a launch post beats a half-built bigger game.
- Option 3 (second game, etc.) is the trap the deadline-extension entry
  at 10:51 explicitly warned against. Hold.

**Reversible?** Trivially. If the launch post lands quickly, the next
decision can flip into Option 2 with most of the budget still available.

---

## 2026-05-01 10:58 — Reverse "Lighthouse" hypothesis; commit "Lanes" concept

**Context:** First rival check just completed (see `rival-state.md` 10:55
entry). Both rivals — game-rivals-beta and game-rivals-gamma — have
independently landed on essentially the game I had as a working hypothesis
at kickoff: **a cooperative, maritime, information-asymmetric two-player
web game where one player has a map and the other is sailing blind**. Both
have shipped lobbies and at least one has shipped a launch post with
"BEACON" as the name. Even the win condition (reach the harbour together)
matches the Lighthouse sketch. A third near-identical entry would be the
worst possible posture against the brief's explicit evaluation question
"Where did you and the rival diverge, and what does that suggest?" —
convergence reveals nothing interesting; divergence is the entire signal.
The substrate is game-agnostic and the cost of pivoting now (no game code
exists yet) is materially smaller than the cost of converging. Reverses
the Lighthouse hypothesis from the 10:25 kickoff entry.

**Options considered:**

1. **Stick with Lighthouse anyway** — different code, similar concept; rely
   on execution and theme to differentiate. Cheap to start, expensive in
   evaluation: the "where did you diverge" axis pays out badly.
2. **Pick a different cooperative information-asymmetric game** — same
   structural shape as the rivals but a different setting (e.g. heist,
   surgery, archaeology). Diverges on theme, not on structure. Half a flip.
3. **Pick a competitive, role-asymmetric, action-driven game** — flips
   three independent structural axes from the rivals at once: co-op →
   competitive, info-asymmetry → role-asymmetry, communication → action.
   Different fun. Different evidence in the decision trail.
4. **Pick a creative-vs-interpretive game** (e.g. one player builds, other
   guesses or grades) — diverges on interaction model but tends towards
   Pictionary-clone risk and is harder to land in two hours.

**Choice:** Option 3. Working title **"Lanes"**. Competitive 1v1,
role-asymmetric, action-driven, phone-portrait native.

**The game in one paragraph:** Phone-portrait screen split into three
vertical lanes. A small "ship" (or runner — theme later) starts at the
bottom and is automatically scrolling upward at constant pace. **Player
A is the Pilot** — they tap left/centre/right to switch the runner
between lanes. **Player B is the Spawner** — they tap left/centre/right
to drop a blocker into a lane at the top of the screen, which then scrolls
down. If a blocker collides with the runner, the Spawner scores; if the
runner survives 30 seconds, the Pilot scores. Best of three rounds, roles
swap each round, third round breaks ties on a smaller field. A full match
fits well inside five minutes. Both players see the same scrolling field
(no fog-of-war), but their controls and objectives are inverted. The
asymmetry is in role and goal, not in information.

**Rationale:**

- **Diverges on structure, not just theme.** Three independent flips from
  the rival baseline: competitive, role-asymmetric, action-driven. Even if
  a third rival later landed on a similar concept, our decision trail
  documents the divergence as a deliberate response to convergence — that
  reasoning is itself the artefact the brief evaluates.
- **Buildable in the remaining ~2h.** No physics simulation, no continuous
  collision; the field is a discrete grid (3 lanes wide) that ticks on a
  server timer (e.g. every 100–200 ms). State is a small JSON blob. The
  Worker DO already has WebSocket fan-out. The engineering shape is "tick
  loop + collision check + broadcast" on top of the existing substrate.
- **Phone-portrait by design.** Three vertical lanes is exactly what a
  portrait phone wants. No tortured layout maths.
- **Sub-5-minute by design.** A 30-second round, three rounds, ten seconds
  of intermission = about two minutes per match. "Want another go?" lands
  naturally.
- **Not a clone.** Closest cultural reference points are arcade dodgers
  (Frogger, Crossy Road) but those are single-player and the player drives
  *all* the danger. Inverting the dodge-vs-spawn relationship into a 1v1
  competitive match is the design move, and I am not aware of a
  commercially recognisable game with this exact 1v1 inversion. If the
  Engineer or Reviewer recognises a clone risk during build, flag back to
  the Orchestrator.
- **Legible to a non-gamer.** Two buttons per role (lane choice). Tutorial
  is a single sentence on each player's screen ("Tap a lane to dodge" /
  "Tap a lane to drop a blocker"). No tutorial screen needed.

**Asymmetry, defended:** Pilot and Spawner have different inputs (move
self vs spawn obstacle), different views (Pilot sees the runner's
position; Spawner sees a *delayed* indicator of the runner's lane —
~500 ms of lag, so the Spawner has to predict, not react), and different
objectives (survive vs hit). This satisfies the brief's "different roles,
different views, different inputs, *or* different objectives" — we
satisfy all four, not just the minimum.

**What this commitment does NOT include (deliberately deferred):**

- Theme. "Runner / Spawner" is a placeholder. The theme decision happens
  after a working slice exists; it should not block engineering.
- Best-of-3 and role-swap. The first slice is a single round.
- Sound, animation polish, score persistence, leaderboards.
- Reconnection across DO eviction.

**Reversible?** Costly to reverse once the first vertical slice is built —
swapping concepts a second time inside the remaining budget would forfeit
the deadline. Up until the next Engineer task is assigned, it is still
free to reverse. The Engineer's next task will be the first vertical
slice; from that point the concept is effectively committed.

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

