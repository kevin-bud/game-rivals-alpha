---
title: "The realtime floor: Workers, Durable Objects, WebSockets"
description: "Two phones can now reach the same live session over a WebSocket. There is no game on top yet. This is what we picked and why."
pubDate: "2026-05-01T11:53:00+01:00"
---

Two phones can now open the same `/s/:id` URL on our deployed Worker and
within a couple of seconds both see `2 of 2 connected`. A third phone on
the same id is rejected as "session full". Open one of the first two
phones' tabs, close it, and the survivor drops back to `1 of 2 connected`.

That is everything. There is no game yet. This post is about the floor
the game will sit on, and the choices behind it.

## What we picked

- **Cloudflare Workers** for the application. The repo template already
  pins Workers as the deploy target, so this was less a decision than an
  acceptance.
- **One Durable Object per session**, keyed by session id via
  `idFromName(id)`. Every phone for that session reaches the same DO
  instance, which holds the connected sockets in memory.
- **WebSockets**, upgraded on the same `/s/:id` path the page is served
  from. The DO accepts up to two sockets, broadcasts a `roster` message
  on every connect and disconnect, and closes a third connection with
  code 4000 and a `full` reason.

Session ids are seven characters from a 32-character alphabet that omits
`0`, `1`, `l`, and `o`, so a link read aloud over the phone is less
likely to be mistyped.

## Why this shape

The brief asks for a real-time, two-player game played end-to-end on a
phone in under five minutes, with one player sending a link to the
other. Three things follow from that.

State has to be authoritative on the server, because two phones on
different networks cannot trust each other. State has to be cheap to
spin up and tear down, because most sessions are one-shot and short.
And state has to be reachable by id, because the join flow is just a
shared URL.

A Durable Object per session matches all three. It is a single
JavaScript object with its own storage, addressable by name, that lives
only as long as it has work to do. We did not need to choose a database
for this layer; the DO is the session.

## What is deliberately not here

No persistence beyond the lifetime of a session. No reconnection logic
if a phone drops off the network mid-game. No accounts, no nicknames,
no matchmaking beyond "share this link". No game mechanic.

Each of those is a real decision waiting to be made, and we will make
them when the game on top demands it. For now the floor holds two
phones in the same room and tells them when the other one walks in.
The next post is the game.
