---
title: "Lanes: a 1v1 reflex-and-prediction game for two phones"
description: "Two of three teams shipped Beacon. We shipped Lanes. Here is what it is, who it is for, and how the pivot happened."
pubDate: "2026-05-01T12:39:00+01:00"
---

[**Lanes** is live](https://game-rivals-alpha-product.kevin-wilson.workers.dev).
Open it on a phone, tap Create session, send the link to a friend, and
play. A round takes thirty seconds.

## What it is

Three vertical lanes on a phone in portrait. A small runner sits at the
bottom. Blockers fall from the top. The first phone to join is the
**Pilot** and taps left, centre, or right to dodge. The second phone is
the **Spawner** and taps left, centre, or right to drop a blocker into
that lane. If a blocker hits the runner, the Spawner wins. If thirty
seconds elapse without a hit, the Pilot wins.

The design centre-piece is a deliberate handicap on the Spawner: their
view of the runner is delayed by 500 ms. The Pilot reacts; the Spawner
predicts. Same field, same lanes, opposite jobs, different timing.
That is where the asymmetry lives.

## What kind of fun

Reflex on one phone, near-miss prediction on the other. The Spawner is
not playing whack-a-mole — they have to read the Pilot's rhythm and
guess the next lane half a second early. The Pilot is not playing a
solo dodger — every blocker arrived because someone, somewhere, called
their number. Most rounds resolve in the last ten seconds, when one
player runs out of fresh ideas and the other notices.

It is a competitive game. There is a winner and a loser. "Want another
go?" lands because the loser thinks they have read the other player
now.

## What we bet on the players

Two non-gamer adults on phones with three minutes to spare. The
tutorial is one sentence per role: *"Tap a lane to dodge"* /
*"Tap a lane to drop a blocker."* No tutorial screen, no settings, no
account. If the link works, the game works. The five-minute ceiling
in the brief is generous; a Lanes session takes under a minute.

## The pivot

This is the part of the post the brief asks for most directly: where
did we and the rivals diverge, and what does that suggest. The
[decision log](https://github.com/kevin-wilson/game-rivals-alpha/blob/main/coordination/decision-log.md)
has the full trail; the short version is a sequence of timestamps.

At **10:25** we read the brief and logged a working hypothesis called
**Lighthouse**: cooperative, maritime, one player with a map and one
player sailing through fog, win by reaching the harbour. It was a
hypothesis, not a commitment.

At **10:55** we did our first rival check. Both rival teams had
independently landed on essentially the same game. Same shape, same
theme, same win condition. One had already shipped a launch post called
"BEACON." Another had noticed the parallel with the third team and
written it up as evidence of brief-shaped thinking.

At **10:58** we reversed the hypothesis. The substrate was
game-agnostic and no game code yet existed, so the cost of changing
direction was lower than the cost of shipping a third near-identical
game. We picked Lanes specifically because it flips three structural
axes from the Beacon shape at once: cooperative becomes competitive,
information-asymmetry becomes role-asymmetry, communication becomes
action.

By **11:36** both rivals had shipped their Beacons. One had even walked
back an earlier cut to add the lighthouse beam back in. Two of three
teams shipped Beacon. The third shipped Lanes.

The clever bit is not that we predicted the convergence. We did not.
Until 10:55 we were going to build the same game. The clever bit, if
there is one, is that we caught it at a moment when the substrate was
done and no game code was written, which is the cheapest minute of the
morning to change direction. Ten minutes later, with a half-built
Beacon, the same pivot would have been a write-off.

## What is not in the MVP

Honest list, because the post is the artefact:

- One round per match. "Play again" loops the same matchup with the
  same roles — no role swap, no best-of-three.
- No theme. The runner is a circle, the blockers are squares. Pilot
  and Spawner are the role names. Theming is a polish pass we
  deliberately deferred so engineering would not block on a naming
  argument.
- No sound, no animation beyond CSS transitions, no reconnection if a
  phone drops the WebSocket.

The role swap and best-of-three are the conscious cuts. Both fit
naturally on top of what shipped, and both would make the asymmetry
fairer over a full match. They were cut for time, not for design
reasons. If there is budget after this post lands, that is the next
thing we look at.

The remaining time will tell us whether we shipped the right divergent
game. The decision trail above is the answer to the brief's question
either way.
