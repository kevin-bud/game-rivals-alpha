# Blog queue

The Orchestrator adds entries here at milestones. The Writer drafts a post,
commits it to `apps/blog/src/content/posts/`, then marks the entry done.

---

## Template

**Milestone:** What just happened.
**Angle:** What the post should focus on.
**Status:** queued / drafting / published
**Post path:** (filled in when published)

---

## 2026-05-01 — Realtime two-phone session scaffold shipped

**Milestone:** First Reviewer PASS of the hackathon. Commit `4ce8722`. The
deployed Worker at `https://game-rivals-alpha-product.kevin-wilson.workers.dev`
now lets two phones join the same `/s/:id` over WebSocket and confirm "2 of 2
connected" within seconds; a third client is rejected as "session full". This
is the substrate every later feature will sit on. There is no game yet.

**Angle:** Treat this as release-note material, not a launch post. The
substrate alone is invisible to a player and not worth a standalone post. The
Writer's call: either hold this entry and combine it with the eventual MVP
launch post (preferred — the hand-off rule "every PASS gets a post queued"
is satisfied by the entry existing here, even if the published artefact is a
combined launch+release note), or publish a short "what we picked for the
floor" decision-trail post if there's nothing else in the queue and a thin
post would still be in keeping with the "decision-trail as evidence" framing
the brief calls for. British English. Honest about the fact that this is
plumbing, not a game.

**Status:** published
**Post path:** `apps/blog/src/content/posts/realtime-floor.md`
**Live at:** https://game-rivals-alpha-blog.kevin-wilson.workers.dev/posts/realtime-floor/

**Writer's note (2026-05-01 11:55 +01:00):** Published as a short
decision-trail release note rather than holding for the launch post. The
blog had only the placeholder welcome post in its feed, the brief
explicitly evaluates the decision trail, and the "Workers + DO + WebSockets,
here's why" angle would have been awkward to fold into a launch post about
the game itself. The launch post will cover the game; this one covers the
floor. Honest framing throughout: there is no game yet.

---

## 2026-05-01 — Lanes MVP launch post

**Milestone:** **Lanes** is shipped. Reviewer PASS at commit `a14123b`
(implementation) / `92dcc36` (review tests). Deployed at
`https://game-rivals-alpha-product.kevin-wilson.workers.dev`. Two phones
share a `/s/:id` URL; first to connect is the Pilot, second is the
Spawner. Pilot dodges blockers by tapping lanes. Spawner drops blockers
into lanes, with a 500 ms-delayed view of where the Pilot's runner is.
30-second round, clear winner, "Play again" resets. Phone-portrait,
sub-five-minute, role-asymmetric, competitive. Repo-root `README.md`
describes the game, audience, and how to play.

**Angle (the Writer chooses, but here is the framing the Orchestrator
wants leaned into):** This is the launch post the brief asks for —
"what you built, what kind of fun it is meant to produce, what bets you
made about the players." The decision-trail material is unusually
strong here and worth surfacing honestly:

- We started the morning with a working hypothesis ("Lighthouse" — a
  cooperative lighthouse-keeper / blind-sailor game). It is in the
  10:25 decision-log entry.
- At 10:55 we read the rivals' blogs and product URLs. **Both rivals
  had independently landed on essentially the same game we were about
  to build** — cooperative, maritime, map-vs-fog, harbour goal. One of
  them had even shipped a launch post titled "BEACON." A second post
  ("The 20-second convergence") showed them noticing the parallel with
  the *other* rival.
- We caught the convergence as evidence rather than coincidence and
  reversed our hypothesis at 10:58, before the next task was assigned.
  The new direction was Lanes — competitive, role-asymmetric (different
  inputs, different objectives, both players see the field),
  action-driven. Three independent structural flips from the rival
  baseline, made deliberately.
- By 11:35 both rivals had shipped their Beacons. Two of three teams
  shipped Beacon. The third shipped Lanes.

The post should be honest: the convergence was a surprise, not a
prediction. The clever bit isn't that we predicted it — it's that we
caught it at the right moment to act on it, in a regime where catching
it ten minutes later would have cost the pivot. Decision-trail honesty
is more credible than retrospective genius. The brief evaluates teams
on "Where did you and the rival diverge, and what does that suggest?"
— this post is the artefact that answers that question for our team.

**Concrete things to include:**

- The deployed URL.
- A one-paragraph description of what Lanes is and what playing it
  feels like (Pilot's reflexes vs Spawner's prediction; the 500 ms
  delayed view as the design centre-piece).
- The bet about the players: two non-gamer adults on phones, three
  minutes to spare. Lanes is built so the tutorial fits in one
  sentence per role.
- The pivot story above, with timestamps and a link to the decision
  log entry (or quote it). British English. Honest about what is *not*
  in the MVP (no role swap, no best-of-three, no theme).
- Optionally a short "what we cut and why" — the role swap and
  best-of-three are the conscious cuts; the deferred decision is in
  `decision-log.md` 11:36.

**Constraints:**

- British English throughout.
- Do not over-claim. The MVP is one round, same roles, "Play again"
  loops the same matchup. Say so.
- Do not name the rivals by team slug. "A rival team" / "another team"
  is fine and matches the brief's framing. Cross-team blog cross-links
  are unnecessary.
- Time budget: ~1h 20m to deadline at queueing. Aim to ship the post
  in under 30 minutes so there's room left for Lanes polish if any.

**Status:** published
**Post path:** `apps/blog/src/content/posts/lanes-launch.md`
**Live at:** https://game-rivals-alpha-blog.kevin-wilson.workers.dev/posts/lanes-launch/

**Writer's note (2026-05-01 12:39 +01:00):** Led with what Lanes is and
how to play it (linked playable URL in the opening paragraph), then the
"what kind of fun" / "bet on the players" beats the brief asks for, then
the pivot story as a tight timestamped sequence (10:25 hypothesis → 10:55
rival check → 10:58 reverse → 11:36 validation). Honest about catching
the convergence rather than predicting it, and honest about the MVP
being one round with no role swap, no best-of-three, no theme. Did not
name rivals by slug — "two of three teams shipped Beacon" is the framing.

---

## 2026-05-01 — Polish + cuts post

**Milestone:** Polish pass shipped — Reviewer PASS at commit `8681e56`
(role swap on Play Again) / `ecfaf48` (review tests). Both players now
play both sides of the asymmetric design within a single session. A
small DX fix for invalid session ids ("That link doesn't look right")
also landed in the same pass. The MVP-plus-polish artefact is the final
state of the product unless the Orchestrator scopes a further task.

**Angle:** A short post combining (a) what changed in the polish pass
and (b) what we deliberately did not build, in the "what we cut and why"
spirit the brief calls out as decision-trail evidence. This is the post
that finishes the blog story — launch covered the game and the pivot;
this covers the boundary of what's in and what's not, and *why those are
the right boundaries given the deadline*.

The Orchestrator's framing for the Writer to lean into:

- **What the polish changed.** Roles now swap on Play Again, so both
  players actually experience both sides of the asymmetry inside one
  session. Without it, whichever player joined first would always be
  the Pilot and never the Spawner — a one-sided experience of an
  asymmetric design. Tiny DO change, big experiential change.
- **The DX fix.** Invalid session ids used to render an unhelpful 404;
  they now render a portrait page that says what's wrong and offers a
  fresh session. Small, but Reviewer flagged it twice.
- **What we cut and why** — the part that earns the post's keep:
  - **Best-of-three with score tracking.** Considered, deferred. The
    risk of regressing the existing Lanes Playwright suite in the last
    hour outweighed the marginal gameplay gain. The decision-log entry
    at 11:42 records this explicitly.
  - **Theme.** Pilot / Spawner / runner / blocker stay as labels. The
    asymmetry is the design centrepiece; theming is decoration. With a
    fixed deadline, decoration loses to making the decoration-free
    thing actually work.
  - **Sound, haptics, animation polish.** Mobile autoplay restrictions
    plus low marginal value.
  - **Reconnection across DO eviction.** Real-world resilience that no
    single five-minute session realistically needs; deferred.
  - **A second, different game.** The brief explicitly permits one
    after MVP. The deadline-extension entry at 10:51 warned against
    this trap (Parkinson's law for hackathon scope), and we held.
- **What we kept that a stricter ship-only mind would have cut.** The
  500 ms delayed view for the Spawner. Without it the game collapses
  into a hard counter for the Pilot; with it, the Spawner has to
  predict, which is the design centrepiece that makes the asymmetry
  actually interesting to play. Worth defending in the post.

**Concrete things to include:**

- Brief reference to the launch post — link to it. This post is not
  the launch.
- The deployed URL, again, near the top.
- A short, honest "what we cut" list. Don't pad. Three or four items
  is plenty.
- One sentence on why we kept the 500 ms delay despite it being the
  most fragile-feeling design choice in the game.
- Maybe one line on how the decision trail itself is the artefact —
  the brief is explicit that "blog posts, commits, and internal
  decision log are the primary evidence." This is your closing post.

**Constraints:**

- British English throughout.
- No naming rivals by slug. "Another team", "two of three teams" etc.
- Keep it short — 350–600 words. The launch post was the long one;
  this is the trailing companion.
- Time budget: ~1h 5m to deadline at queueing. Aim under 15 minutes
  so there's room for one more Engineer pass if anything obvious
  surfaces during drafting (it usually does — Writer often finds the
  bug a player wouldn't).

**Status:** published
**Post path:** `apps/blog/src/content/posts/polish-and-cuts.md`
**Live at:** https://game-rivals-alpha-blog.kevin-wilson.workers.dev/posts/polish-and-cuts/

**Writer's note (2026-05-01 12:53 +01:00):** Trailing companion to the
launch post — opened with a one-line back-link to it and the deployed
URL, then split the body into "what changed" (role swap + invalid-id
page) and "what we cut, and why" (best-of-three, theme, sound,
reconnection, second game — each with its own one-line reason from the
11:42 and 10:51 decision-log entries). Defended the 500 ms delay in its
own short section as the most fragile-feeling design choice that earned
its keep. Closed with the decision-trail-as-artefact line. British
English throughout, no rivals named by slug ("two of three teams"
framing carried over from the launch post), no over-claim about MVP
state. ~520 words.
