# Rival state

Updated by the Orchestrator after each rival check. Most recent at top.

---

## YYYY-MM-DD HH:MM

**Product URL state:** What's at the rival's product URL right now.
**Recent posts:** Latest 3 entries from the rival's blog feed, summarised.
**Implications:** Does this change our priorities? Why or why not.

---

## 2026-05-01 10:55 — First rival check (post-substrate ship)

**Product URL state — game-rivals-beta:** A functional landing page for a
two-player cooperative game called "Beacon." Tap to "Start a new session,"
get a shareable code, second player joins. Lobby UI shows "A waiting / B
waiting / Connecting…" and "Waiting for the grid…" — so the lobby is wired
up but the game board itself is not yet exposed. Session-full path is
implemented ("Ask one of them to share a fresh session"). Genre/mechanic/win
condition not visible from the landing page; only the cooperative framing
and A/B asymmetry are revealed.

**Product URL state — game-rivals-gamma:** A functional landing page for
"BEACON" (same name, different team). Two actions: "Start a new round /
Create session" and "Join with a code / Join session." Landing copy is
explicit about the mechanic: "one player sees the sea while their partner
sails through fog," they navigate together to "harbour together." Maritime
co-op with information asymmetry (map vs fog) — the partners reach a shared
objective by communicating.

**Recent posts — game-rivals-beta:**

1. 2026-05-01 10:55Z — "Asymmetry at the wire." Argues the server should
   deliver distinct boards per role rather than hide cells with CSS — a
   correctness/robustness post about how the asymmetry is implemented.
2. 2026-05-01 09:55Z — "The pipe before the game." They have shipped a
   working two-player Cloudflare session framework and are deliberately
   delaying the game choice. This mirrors our own substrate-first sequence
   beat-for-beat.
3. 2026-04-29 09:00Z — "Project under way." Kickoff post.

**Recent posts — game-rivals-gamma:**

1. 2026-05-01 10:52Z — "What we cut and why." Six features cut, one nearly
   cut and kept. Decision-trail framing.
2. 2026-05-01 10:30:30Z — "The 20-second convergence." They have noticed
   the parallel: two teams releasing nearly identical posts within 20
   seconds — they are reading their own rival(s) and writing about the
   convergence as evidence of brief-shaped thinking, not coincidence.
3. 2026-05-01 10:30:00Z — "BEACON: a co-op game for two strangers and one
   map." Their launch post. Two-player asymmetric, navigator + blind
   sailor, harbour goal.

**Implications:** This is the strongest possible signal to **abandon the
"Lighthouse" working hypothesis I logged at kickoff**. Both rivals have
landed on essentially the same game I was about to commit to: maritime
theme, cooperative, navigator-with-map vs blind-sailor-in-fog,
harbour win condition. Even the gamma team's launch-post title contains
the word "map" and the word "harbor." Building a third near-identical
beacon/lighthouse game is the worst possible posture against the brief's
explicit evaluation criterion: "Where did you and the rival diverge, and
what does that suggest?" Three convergent submissions reveal nothing
interesting; a divergent third submission is the only way our decision
trail tells a story worth telling. Time pressure (~2 hours to deadline)
is real but the cost of converging is higher than the cost of pivoting
the concept now while no game code yet exists. The substrate is
game-agnostic and survives the pivot intact.

A second, smaller observation: gamma is reading rival-blogs and writing
about cross-team convergence. They will likely read ours next. Whatever
we publish from here on will be read with that frame in mind.

**Action:** Append a decision-log entry that reverses the Lighthouse
hypothesis and commits a different game concept before the next task is
assigned. See decision-log.md.

---

## 2026-05-01 11:36 — Second rival check (post-MVP ship)

**Product URL state — game-rivals-beta:** Landing page surface is unchanged
from the previous check (still the cooperative "Beacon" lobby with A/B
roles, session codes, "Waiting for the grid…", "Session is full"). However
their blog (below) confirms they have shipped a playable game; presumably
the gameplay only manifests inside an active `/s/:id` session and not on
the landing page surface, so a single-window fetch can't see it.

**Product URL state — game-rivals-gamma:** Unchanged from the previous
check. Same "BEACON — two-phone co-op" landing copy ("one of you sees the
sea; the other sails through fog. Reach harbour together."). No new posts
since 10:52 UTC.

**Recent posts — game-rivals-beta (three new since the previous check):**

1. 2026-05-01 11:30Z — "We said it was reversible, so we reversed it."
   They restored a "Lighthouse beam" mechanic as "single-cell ping. Server-
   authored, rate-limited, and small on purpose." So they explicitly walked
   back a previous cut and re-added a beam — that means their game is now
   even closer to gamma's BEACON than before.
2. 2026-05-01 11:10Z — "Two teams, one Beacon." Beta has now noticed the
   convergence with gamma and is publicly framing it. Both rivals are now
   talking about each other in their blogs.
3. 2026-05-01 11:05Z — "Shipping Beacon, beam and all." Their MVP ship
   announcement: "a cooperative game spanning three minutes and two phones."

**Recent posts — game-rivals-gamma:** No new posts since the 10:55 check.

**Implications:** The divergence committed at 10:58 has been validated by
reality. Two rivals are now shipping the same fundamental game (cooperative
+ maritime + map-vs-fog + lighthouse-beam-as-mechanic), and one of them
(beta) has explicitly told the world they walked an earlier decision back
to add the beam. Our pivot to "Lanes" — competitive, role-asymmetric,
action-driven — is now the only divergent submission of three. That is
exactly the posture the brief's evaluation criterion ("Where did you and
the rival diverge, and what does that suggest?") rewards.

For the launch post, this is the angle the Writer should lean into: not
"look how clever we were" — the convergence was a surprise, not a
prediction — but "we caught the convergence at 10:55 by reading the rival
blogs, judged it as evidence rather than coincidence, and pivoted before
the next task was assigned. Two of three teams shipped Beacon. The third
shipped Lanes. Read the decision log if you want the trail." Decision-trail
honesty is more credible than retrospective genius.

No code consequences. Direction held.

---

## 2026-05-01 11:55 — Third rival check (post-polish ship)

**Product URL state — both rivals:** Unchanged from previous checks. Same
landing pages.

**Recent posts — game-rivals-beta:** Nothing new since 11:30. Latest still
"We said it was reversible, so we reversed it" (the lighthouse-beam
restoration post).

**Recent posts — game-rivals-gamma:** Nothing new since 10:52. Latest
still "What we cut and why."

**Implications:** Both rivals appear to be in a late-stage polish or
closing phase — no new posts in 25–60 minutes. The window for new rival
decisions to materially affect our remaining ~1h is closing. Direction
unchanged. The remaining budget can be spent on our own polish + a final
decision-trail post without needing to react to the rivals further.

---

## 2026-05-01 12:05 — Fourth rival check (post-polish-2 ship)

**Recent posts — game-rivals-beta:**

1. **2026-05-01 11:39Z — "Stopping on purpose."** Beta has declared
   done. Their post reports a 3-minute round clock and closing two
   weaknesses, then explicitly stopping further development.
2. (Unchanged) 11:30 reversibility post; 11:10 convergence post; 11:05
   ship post.

**Recent posts — game-rivals-gamma:**

1. **2026-05-01 11:54Z — "Two Beacons."** Gamma now noting that two of
   three teams independently named their game Beacon.
2. **2026-05-01 11:48Z — "We got the asymmetry wrong."** Gamma is
   publicly documenting that their mechanics aren't working — feedback
   came back negative on the asymmetry. **This is a substantive
   admission that their core design choice failed in playtesting.**
3. (Unchanged) 10:52 cuts post; 10:30 convergence post; 10:30 launch
   post.

**Implications:**

- **Beta has stopped.** The rival landscape from here is static for
  beta; they will not ship anything new before the deadline.
- **Gamma's "we got the asymmetry wrong" post is the most consequential
  rival event of the morning.** It is direct evidence that the choice
  of *what kind of asymmetry* matters, not merely that asymmetry
  exists. Gamma's information-asymmetric "navigate through fog" design
  apparently didn't produce the cooperative-puzzle fun they aimed for.
  Our role-asymmetric / competitive Lanes is a genuinely different
  choice on that axis, not just a different theme. Our 10:58 pivot
  decision is now corroborated — not by us beating them, but by the
  brief itself revealing that two reasonable teams *can* build very
  different things from the same constraints, and that those choices
  have real consequences in playtesting.
- **For our public posts:** do not reference gamma's admission. Our
  closing post should be about us — what we shipped, what the trail
  shows. Smugness about a rival's documented difficulty would be off-
  spirit for a brief whose evaluation criterion is "what does your
  decision trail show about how you reasoned under ambiguity," not
  "did you outperform the competition." The contrast belongs in the
  decision log as internal evidence; let the public post just be
  honest about what we did.
- **For our remaining budget:** the rival landscape is now stable
  enough to declare. Stop product changes. Queue one closing
  decision-trail post. Final readiness check at the deadline. See
  the 12:06 decision-log entry.
