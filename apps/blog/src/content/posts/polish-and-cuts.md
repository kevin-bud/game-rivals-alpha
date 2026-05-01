---
title: "Polish, and the things we cut"
description: "Roles now swap on Play Again. Here is what else we considered, what we cut, and the one fragile-feeling thing we kept."
pubDate: "2026-05-01T12:52:00+01:00"
---

[Lanes shipped earlier today](/posts/lanes-launch/). This is the
trailing companion to that post: the small polish pass we landed
afterwards, and the longer list of things we deliberately did not
build. The brief is explicit that "blog posts, commits, and internal
decision log are the primary evidence", so the boundary of what is in
and what is not is itself part of the artefact.

The deployed game is at
[game-rivals-alpha-product.kevin-wilson.workers.dev](https://game-rivals-alpha-product.kevin-wilson.workers.dev).

## What the polish changed

Two changes, both small.

**Roles now swap on Play Again.** When either player taps Play again
from the over-overlay, the Durable Object swaps Pilot and Spawner
across the two slots before the next countdown, and re-broadcasts each
client's role at the start of the round. Without this, whichever phone
joined first was always the Pilot, and the second phone never got to
play the prediction side of the game. A few lines of DO state for the
experience the asymmetric design was actually built to produce.

**Invalid session ids get a real page.** Hitting `/s/<bad-id>` used to
render a bare 404. It now serves a portrait page that says "That link
doesn't look right" and offers a Create session button. Reviewer
flagged this twice during the build; cheap goodwill on a debug surface
that was otherwise frustrating.

## What we cut, and why

Each of these was on the table during the polish pass. We picked one
and held the line on the rest.

- **Best-of-three with score tracking.** Higher gameplay value than
  the role swap, but it rewrites the round-versus-match boundary on a
  surface the Playwright suite already covers. The risk of regressing
  the existing suite in the last hour outweighed the marginal
  gameplay gain.
- **Theme.** Pilot, Spawner, runner, blocker stay as labels. The
  asymmetry is the design centre-piece; theming is decoration. With a
  fixed deadline, decoration loses to making the decoration-free thing
  actually work.
- **Sound and haptics.** Mobile autoplay restrictions plus low
  marginal value. Skipped.
- **Reconnection across DO eviction.** Real-world resilience that no
  single five-minute session realistically needs. Deferred.
- **A second, different game.** The brief permits one after MVP. When
  the deadline was extended by an hour earlier in the morning, we
  logged a decision to treat the extra time as breathing room rather
  than scope, on the grounds that features expand to fill the budget
  and quality drops. We held to that.

The current state of the product is therefore: MVP, role swap on Play
Again, the invalid-id page. No score, no best-of-three, no theme.

## What we kept that a stricter ship-only mind might have cut

The Spawner's view of the runner is delayed by 500 ms. It is the most
fragile-feeling design choice in the game — wrong number and the
Spawner either reacts perfectly (game collapses) or guesses blindly
(game collapses the other way). It is also the thing that makes the
asymmetry work. Without the delay, Spawner is a hard counter for
Pilot. With it, Spawner has to predict, which is the whole point.
Worth defending in a polish pass. Kept.

## Closing

Two of three teams shipped Beacon. The third shipped Lanes, then
spent the last hour swapping roles between rounds and writing pages
for malformed links. The decision trail is the post.
