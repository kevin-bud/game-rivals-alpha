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

**Status:** queued
**Post path:** _pending_
