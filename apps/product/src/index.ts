/**
 * Worker entry. Three responsibilities:
 *
 * 1. `GET /` — serve the landing page with a "Create session" button.
 * 2. `GET /s/:id` — serve the session page (HTML) or, if upgraded, hand
 *    the WebSocket to the SessionRoom Durable Object for that id.
 * 3. `POST /api/session` — mint a new session id and 303-redirect to it.
 *
 * The DO binding is `SESSION_ROOM`. Each session id maps to its own DO
 * instance via `idFromName(sessionId)`. The DO runs the "Lanes" game
 * state machine on top of the WebSocket fan-out it already provides.
 */

import { SessionRoom } from "./session";

export { SessionRoom };

type Env = {
  SESSION_ROOM: DurableObjectNamespace;
};

const SESSION_ID_ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";
const SESSION_ID_LENGTH = 7;

function generateSessionId(): string {
  const bytes = new Uint8Array(SESSION_ID_LENGTH);
  crypto.getRandomValues(bytes);
  let result = "";
  for (const byte of bytes) {
    result += SESSION_ID_ALPHABET[byte % SESSION_ID_ALPHABET.length];
  }
  return result;
}

function isValidSessionId(value: string): boolean {
  if (value.length < 4 || value.length > 16) {
    return false;
  }
  for (const char of value) {
    if (!SESSION_ID_ALPHABET.includes(char)) {
      return false;
    }
  }
  return true;
}

const landingHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>Lanes — a two-phone game</title>
    <style>
      :root { color-scheme: light dark; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        padding: 1.5rem;
        font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
        line-height: 1.5;
        max-width: 32rem;
        margin-inline: auto;
      }
      h1 { font-size: 1.5rem; margin-top: 1rem; }
      p { font-size: 1rem; }
      form { margin-top: 2rem; }
      button {
        width: 100%;
        padding: 1rem 1.25rem;
        font-size: 1.125rem;
        font-weight: 600;
        border-radius: 0.75rem;
        border: 1px solid currentColor;
        background: transparent;
        color: inherit;
        cursor: pointer;
        min-height: 3rem;
      }
      button:active { opacity: 0.7; }
    </style>
  </head>
  <body>
    <h1>Lanes</h1>
    <p>
      A two-phone, head-to-head game. Tap below to open a fresh session,
      then share the link with the other player. First to join is the
      Pilot; second to join is the Spawner.
    </p>
    <form method="POST" action="/api/session">
      <button type="submit">Create session</button>
    </form>
  </body>
</html>
`;

function sessionHtml(sessionId: string): string {
  // The session id is validated upstream; it is restricted to a small
  // alphabet of safe characters, so direct interpolation is fine.
  const safeId = sessionId;
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>Lanes — session ${safeId}</title>
    <style>
      :root {
        color-scheme: light dark;
        --bg: #0e0f12;
        --fg: #f4f4f6;
        --field-bg: #16181d;
        --lane-divider: #2a2d34;
        --runner: #4ade80;
        --runner-shadow: rgba(74, 222, 128, 0.45);
        --blocker: #f87171;
        --blocker-shadow: rgba(248, 113, 113, 0.4);
        --button-bg: #1f2229;
        --button-active: #2c3038;
        --button-cooldown: #2a1313;
        --accent: #f4f4f6;
      }
      @media (prefers-color-scheme: light) {
        :root {
          --bg: #f4f4f6;
          --fg: #16181d;
          --field-bg: #e9eaee;
          --lane-divider: #c8cad0;
          --runner: #15803d;
          --runner-shadow: rgba(21, 128, 61, 0.35);
          --blocker: #b91c1c;
          --blocker-shadow: rgba(185, 28, 28, 0.3);
          --button-bg: #d8dade;
          --button-active: #b8babe;
          --button-cooldown: #f4dada;
        }
      }
      * { box-sizing: border-box; }
      html, body { height: 100%; }
      body {
        margin: 0;
        padding: 0;
        font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
        line-height: 1.4;
        background: var(--bg);
        color: var(--fg);
        overflow: hidden;
      }
      .app {
        display: flex;
        flex-direction: column;
        height: 100dvh;
        max-width: 32rem;
        margin-inline: auto;
        padding: env(safe-area-inset-top) 0.75rem env(safe-area-inset-bottom);
      }
      .header {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        padding: 0.5rem 0.25rem;
        font-size: 0.875rem;
        opacity: 0.85;
      }
      .role-badge { font-weight: 600; }
      .timer { font-variant-numeric: tabular-nums; }
      .score {
        font-variant-numeric: tabular-nums;
        font-weight: 600;
        font-size: 0.875rem;
        opacity: 0.85;
        padding: 0 0.25rem 0.25rem;
        text-align: center;
      }
      .score.hidden { display: none; }
      .overlay-score {
        font-variant-numeric: tabular-nums;
        font-weight: 600;
        margin: 0;
      }
      .field-wrap {
        position: relative;
        flex: 1 1 auto;
        min-height: 0;
        margin-bottom: 0.75rem;
      }
      .field {
        position: absolute;
        inset: 0;
        background: var(--field-bg);
        border-radius: 1rem;
        overflow: hidden;
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        grid-template-rows: repeat(12, 1fr);
      }
      .lane-divider {
        position: absolute;
        top: 0;
        bottom: 0;
        width: 1px;
        background: var(--lane-divider);
      }
      .lane-divider.one { left: 33.333%; }
      .lane-divider.two { left: 66.666%; }
      .runner, .blocker, .ghost-runner {
        position: absolute;
        width: calc(33.333% - 1rem);
        height: calc(8.3333% - 0.4rem);
        border-radius: 0.5rem;
        transition: transform 90ms linear;
        will-change: transform;
        pointer-events: none;
      }
      .runner {
        background: var(--runner);
        box-shadow: 0 0 1.25rem var(--runner-shadow);
      }
      .ghost-runner {
        background: transparent;
        border: 2px dashed var(--runner);
        opacity: 0.55;
      }
      .blocker {
        background: var(--blocker);
        box-shadow: 0 0 0.75rem var(--blocker-shadow);
      }
      .controls {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 0.5rem;
        padding: 0 0.25rem 0.25rem;
        flex: 0 0 auto;
      }
      .lane-button {
        appearance: none;
        font: inherit;
        font-size: 1rem;
        font-weight: 600;
        color: var(--fg);
        background: var(--button-bg);
        border: 1px solid var(--lane-divider);
        border-radius: 0.75rem;
        min-height: 4.25rem;
        padding: 0.5rem;
        cursor: pointer;
        touch-action: manipulation;
      }
      .lane-button:active { background: var(--button-active); }
      .lane-button.cooldown {
        background: var(--button-cooldown);
        opacity: 0.6;
      }
      .lane-button.active {
        outline: 2px solid var(--accent);
        outline-offset: -3px;
      }
      .overlay {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 1rem;
        background: rgba(14, 15, 18, 0.78);
        color: var(--fg);
        text-align: center;
        padding: 1.5rem;
        z-index: 2;
        backdrop-filter: blur(2px);
      }
      @media (prefers-color-scheme: light) {
        .overlay { background: rgba(244, 244, 246, 0.86); }
      }
      .overlay h2 {
        font-size: 2rem;
        margin: 0;
      }
      .overlay p {
        margin: 0;
        font-size: 1rem;
        max-width: 28ch;
      }
      .overlay button {
        font: inherit;
        font-size: 1.125rem;
        font-weight: 600;
        padding: 0.75rem 1.5rem;
        border-radius: 0.75rem;
        border: 1px solid currentColor;
        background: transparent;
        color: inherit;
        cursor: pointer;
        min-height: 3rem;
        min-width: 12rem;
      }
      .countdown-number {
        font-size: 4rem;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
      }
      .share {
        font-family: ui-monospace, "SF Mono", Menlo, monospace;
        font-size: 0.875rem;
        word-break: break-all;
        opacity: 0.85;
      }
      .copy-link {
        font: inherit;
        font-size: 0.875rem;
        padding: 0.4rem 0.75rem;
        border-radius: 0.4rem;
        border: 1px solid currentColor;
        background: transparent;
        color: inherit;
        cursor: pointer;
      }
      .hidden { display: none !important; }
    </style>
  </head>
  <body>
    <div class="app">
      <div class="header">
        <div>
          <span class="role-badge" data-testid="role">Connecting…</span>
        </div>
        <div class="timer" data-testid="timer">--</div>
      </div>
      <div class="score hidden" data-testid="score" id="score">
        You: <span data-testid="score-self">0</span> · Them: <span data-testid="score-other">0</span>
      </div>
      <div class="field-wrap">
        <div class="field" id="field" aria-label="Lanes playfield">
          <div class="lane-divider one"></div>
          <div class="lane-divider two"></div>
          <div class="runner hidden" id="runner" data-testid="runner"></div>
        </div>
        <div class="overlay" id="overlay" data-testid="overlay">
          <h2 id="overlay-title">Waiting for the other player…</h2>
          <p class="overlay-score hidden" id="overlay-score" data-testid="overlay-score">
            You: <span data-testid="overlay-score-self">0</span> · Them: <span data-testid="overlay-score-other">0</span>
          </p>
          <p id="overlay-body" class="share"></p>
          <button class="copy-link hidden" type="button" id="copy-button">Copy link</button>
          <div class="countdown-number hidden" id="countdown-number" data-testid="countdown"></div>
          <button class="hidden" type="button" id="play-again" data-testid="play-again">Play again</button>
        </div>
      </div>
      <div class="controls" id="controls" data-testid="controls">
        <button class="lane-button" type="button" data-lane="0" data-testid="lane-0">--</button>
        <button class="lane-button" type="button" data-lane="1" data-testid="lane-1">--</button>
        <button class="lane-button" type="button" data-lane="2" data-testid="lane-2">--</button>
      </div>
    </div>
    <script>
      (function () {
        var FIELD_ROWS = 12;
        var RUNNER_ROW = 11;

        var sessionPath = window.location.pathname;
        var shareUrl = window.location.origin + sessionPath;

        var els = {
          role: document.querySelector('[data-testid="role"]'),
          timer: document.querySelector('[data-testid="timer"]'),
          field: document.getElementById("field"),
          runner: document.getElementById("runner"),
          overlay: document.getElementById("overlay"),
          overlayTitle: document.getElementById("overlay-title"),
          overlayBody: document.getElementById("overlay-body"),
          copyBtn: document.getElementById("copy-button"),
          countdownNumber: document.getElementById("countdown-number"),
          playAgainBtn: document.getElementById("play-again"),
          controls: document.getElementById("controls"),
          score: document.getElementById("score"),
          scoreSelf: document.querySelector('[data-testid="score-self"]'),
          scoreOther: document.querySelector('[data-testid="score-other"]'),
          overlayScore: document.getElementById("overlay-score"),
          overlayScoreSelf: document.querySelector('[data-testid="overlay-score-self"]'),
          overlayScoreOther: document.querySelector('[data-testid="overlay-score-other"]'),
          laneButtons: [
            document.querySelector('[data-testid="lane-0"]'),
            document.querySelector('[data-testid="lane-1"]'),
            document.querySelector('[data-testid="lane-2"]'),
          ],
        };

        var state = {
          role: null,
          phase: "lobby",
          ws: null,
          blockerEls: new Map(),
          ghostEl: null,
        };

        function setLaneLabels(role) {
          if (role === "pilot") {
            els.laneButtons[0].textContent = "← Left";
            els.laneButtons[1].textContent = "Centre";
            els.laneButtons[2].textContent = "Right →";
          } else if (role === "spawner") {
            els.laneButtons[0].textContent = "Drop ←";
            els.laneButtons[1].textContent = "Drop ▼";
            els.laneButtons[2].textContent = "Drop →";
          } else {
            els.laneButtons[0].textContent = "--";
            els.laneButtons[1].textContent = "--";
            els.laneButtons[2].textContent = "--";
          }
        }

        function showLobbyOverlay() {
          els.overlay.classList.remove("hidden");
          els.overlayTitle.textContent = "Waiting for the other player…";
          els.overlayBody.textContent = shareUrl;
          els.overlayBody.classList.remove("hidden");
          els.copyBtn.classList.remove("hidden");
          els.countdownNumber.classList.add("hidden");
          els.playAgainBtn.classList.add("hidden");
          els.overlayScore.classList.add("hidden");
        }

        function updateScore(slotWins, yourSlot) {
          if (!slotWins || (yourSlot !== 0 && yourSlot !== 1)) {
            return;
          }
          var you = slotWins[yourSlot];
          var them = slotWins[yourSlot === 0 ? 1 : 0];
          els.scoreSelf.textContent = String(you);
          els.scoreOther.textContent = String(them);
          els.overlayScoreSelf.textContent = String(you);
          els.overlayScoreOther.textContent = String(them);
        }

        function showCountdownOverlay(remainingMs) {
          els.overlay.classList.remove("hidden");
          els.overlayTitle.textContent = "Get ready";
          els.overlayBody.textContent = "";
          els.overlayBody.classList.add("hidden");
          els.copyBtn.classList.add("hidden");
          els.countdownNumber.classList.remove("hidden");
          els.playAgainBtn.classList.add("hidden");
          els.overlayScore.classList.add("hidden");
          var seconds = Math.max(1, Math.ceil(remainingMs / 1000));
          els.countdownNumber.textContent = String(seconds);
        }

        function showRunningOverlay() {
          els.overlay.classList.add("hidden");
          els.countdownNumber.classList.add("hidden");
          els.playAgainBtn.classList.add("hidden");
          els.overlayScore.classList.add("hidden");
        }

        function showOverOverlay(winner, role) {
          els.overlay.classList.remove("hidden");
          var youWon = winner === role;
          els.overlayTitle.textContent = youWon ? "You won!" : "You lost";
          var subtitle;
          if (winner === "pilot") {
            subtitle = "The Pilot survived all 30 seconds.";
          } else {
            subtitle = "A blocker caught the runner.";
          }
          els.overlayBody.textContent = subtitle;
          els.overlayBody.classList.remove("hidden");
          els.copyBtn.classList.add("hidden");
          els.countdownNumber.classList.add("hidden");
          els.playAgainBtn.classList.remove("hidden");
          els.overlayScore.classList.remove("hidden");
        }

        function laneOffsetPercent(lane) {
          // Centre of the lane: lane*(100/3) + (100/6).
          return lane * (100 / 3) + (100 / 6);
        }

        function rowOffsetPercent(row) {
          return row * (100 / FIELD_ROWS) + (100 / (FIELD_ROWS * 2));
        }

        function placeAt(el, lane, row) {
          var x = laneOffsetPercent(lane);
          var y = rowOffsetPercent(row);
          el.style.left = "calc(" + x + "% - (33.333% - 1rem) / 2)";
          el.style.top = "calc(" + y + "% - (8.3333% - 0.4rem) / 2)";
        }

        function renderRunner(lane) {
          if (lane === undefined || lane === null) {
            els.runner.classList.add("hidden");
            return;
          }
          els.runner.classList.remove("hidden");
          placeAt(els.runner, lane, RUNNER_ROW);
        }

        function renderGhost(lane) {
          if (lane === undefined || lane === null) {
            if (state.ghostEl) {
              state.ghostEl.remove();
              state.ghostEl = null;
            }
            return;
          }
          if (!state.ghostEl) {
            state.ghostEl = document.createElement("div");
            state.ghostEl.className = "ghost-runner";
            state.ghostEl.setAttribute("data-testid", "ghost-runner");
            els.field.appendChild(state.ghostEl);
          }
          placeAt(state.ghostEl, lane, RUNNER_ROW);
        }

        function renderBlockers(blockers) {
          var seen = new Set();
          for (var i = 0; i < blockers.length; i += 1) {
            var b = blockers[i];
            var key = b.lane + "-" + b.row;
            // Find an existing element whose lane matches and prev row was b.row-1.
            // Simpler: identify by lane + nearest row. We'll do a fresh assign.
            seen.add(i);
          }
          // Simpler approach — clear and redraw blockers (small count, every 100ms).
          state.blockerEls.forEach(function (el) {
            el.remove();
          });
          state.blockerEls.clear();
          for (var j = 0; j < blockers.length; j += 1) {
            var bl = blockers[j];
            var el = document.createElement("div");
            el.className = "blocker";
            el.setAttribute("data-testid", "blocker");
            el.dataset.lane = String(bl.lane);
            el.dataset.row = String(bl.row);
            placeAt(el, bl.lane, bl.row);
            els.field.appendChild(el);
            state.blockerEls.set(j, el);
          }
        }

        function updateButtons(activeLane, lanesOnCooldown) {
          for (var i = 0; i < els.laneButtons.length; i += 1) {
            var btn = els.laneButtons[i];
            if (i === activeLane) {
              btn.classList.add("active");
            } else {
              btn.classList.remove("active");
            }
            if (lanesOnCooldown && lanesOnCooldown[i]) {
              btn.classList.add("cooldown");
            } else {
              btn.classList.remove("cooldown");
            }
          }
        }

        function formatTimer(ms) {
          if (ms <= 0) {
            return "0.0";
          }
          return (ms / 1000).toFixed(1);
        }

        function applyState(msg) {
          state.phase = msg.phase;
          updateScore(msg.slotWins, msg.yourSlot);

          if (msg.phase === "lobby") {
            els.score.classList.add("hidden");
            showLobbyOverlay();
            renderBlockers([]);
            renderRunner(null);
            renderGhost(null);
            els.timer.textContent = "--";
            updateButtons(-1, [false, false, false]);
            return;
          }

          if (msg.phase === "countdown") {
            els.score.classList.remove("hidden");
            showCountdownOverlay(msg.countdownRemainingMs);
            renderBlockers([]);
            if (state.role === "pilot") {
              renderRunner(msg.runnerLane);
              renderGhost(null);
            } else {
              renderGhost(msg.spawnerViewRunnerLane);
              renderRunner(null);
            }
            els.timer.textContent = "30.0";
            updateButtons(-1, [false, false, false]);
            return;
          }

          if (msg.phase === "running") {
            els.score.classList.remove("hidden");
            showRunningOverlay();
            renderBlockers(msg.blockers || []);
            if (state.role === "pilot") {
              renderRunner(msg.runnerLane);
              renderGhost(null);
              updateButtons(msg.runnerLane, [false, false, false]);
            } else {
              renderGhost(msg.spawnerViewRunnerLane);
              renderRunner(null);
              updateButtons(-1, msg.lanesOnCooldown || [false, false, false]);
            }
            els.timer.textContent = formatTimer(msg.timeRemainingMs);
            return;
          }

          if (msg.phase === "over") {
            els.score.classList.add("hidden");
            renderBlockers(msg.blockers || []);
            if (state.role === "pilot") {
              renderRunner(msg.runnerLane);
              renderGhost(null);
            } else {
              renderGhost(msg.spawnerViewRunnerLane);
              renderRunner(null);
            }
            els.timer.textContent = "0.0";
            showOverOverlay(msg.winner, state.role);
            updateButtons(-1, [false, false, false]);
            return;
          }
        }

        function send(payload) {
          if (state.ws && state.ws.readyState === WebSocket.OPEN) {
            state.ws.send(JSON.stringify(payload));
          }
        }

        for (var k = 0; k < els.laneButtons.length; k += 1) {
          (function (lane) {
            els.laneButtons[lane].addEventListener("click", function () {
              if (state.role === "pilot") {
                send({ type: "lane", lane: lane });
              } else if (state.role === "spawner") {
                send({ type: "spawn", lane: lane });
              }
            });
          })(k);
        }

        els.copyBtn.addEventListener("click", function () {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(shareUrl).then(function () {
              els.copyBtn.textContent = "Copied";
              setTimeout(function () {
                els.copyBtn.textContent = "Copy link";
              }, 1500);
            });
          }
        });

        els.playAgainBtn.addEventListener("click", function () {
          send({ type: "play_again" });
        });

        var protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        var wsUrl = protocol + "//" + window.location.host + sessionPath;
        var ws = new WebSocket(wsUrl);
        state.ws = ws;

        ws.addEventListener("message", function (event) {
          try {
            var data = JSON.parse(event.data);
            if (data.type === "role") {
              state.role = data.role;
              els.role.textContent = data.role === "pilot" ? "You are the Pilot" : "You are the Spawner";
              setLaneLabels(data.role);
            } else if (data.type === "state") {
              applyState(data);
            } else if (data.type === "full") {
              els.overlay.classList.remove("hidden");
              els.overlayTitle.textContent = "Session full";
              els.overlayBody.textContent = "Ask one of them to share a fresh session.";
              els.overlayBody.classList.remove("hidden");
              els.copyBtn.classList.add("hidden");
              els.countdownNumber.classList.add("hidden");
              els.playAgainBtn.classList.add("hidden");
              els.role.textContent = "Session full";
            }
          } catch (err) {
            // Ignore malformed messages.
          }
        });

        ws.addEventListener("close", function (event) {
          if (event.code === 4000) {
            els.overlay.classList.remove("hidden");
            els.overlayTitle.textContent = "Session full";
            els.overlayBody.textContent = "Ask one of them to share a fresh session.";
            els.overlayBody.classList.remove("hidden");
            els.copyBtn.classList.add("hidden");
            els.countdownNumber.classList.add("hidden");
            els.playAgainBtn.classList.add("hidden");
          } else if (state.role === null) {
            els.overlayTitle.textContent = "Disconnected";
          }
        });

        ws.addEventListener("error", function () {
          if (state.role === null) {
            els.overlayTitle.textContent = "Connection error";
          }
        });

        // Initial render.
        showLobbyOverlay();
      })();
    </script>
  </body>
</html>
`;
}

const notFoundHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>Not found</title>
  </head>
  <body style="font-family: system-ui, sans-serif; padding: 1.5rem;">
    <p>Not found.</p>
    <p><a href="/">Start a new session</a></p>
  </body>
</html>
`;

const invalidSessionHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>Lanes — that link doesn't look right</title>
    <style>
      :root { color-scheme: light dark; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        padding: 1.5rem;
        font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
        line-height: 1.5;
        max-width: 32rem;
        margin-inline: auto;
      }
      h1 { font-size: 1.5rem; margin-top: 1rem; }
      p { font-size: 1rem; }
      form { margin-top: 2rem; }
      button {
        width: 100%;
        padding: 1rem 1.25rem;
        font-size: 1.125rem;
        font-weight: 600;
        border-radius: 0.75rem;
        border: 1px solid currentColor;
        background: transparent;
        color: inherit;
        cursor: pointer;
        min-height: 3rem;
      }
      button:active { opacity: 0.7; }
    </style>
  </head>
  <body>
    <h1>That link doesn't look right</h1>
    <p>
      Session links are auto-generated from a small alphabet — this one
      uses characters we don't mint, so there's no session behind it.
    </p>
    <form method="POST" action="/api/session">
      <button type="submit">Create session</button>
    </form>
  </body>
</html>
`;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;

    if (request.method === "GET" && pathname === "/") {
      return new Response(landingHtml, {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    if (request.method === "POST" && pathname === "/api/session") {
      const sessionId = generateSessionId();
      return Response.redirect(`${url.origin}/s/${sessionId}`, 303);
    }

    if (pathname.startsWith("/s/")) {
      const sessionId = pathname.slice("/s/".length);
      if (!isValidSessionId(sessionId)) {
        return new Response(invalidSessionHtml, {
          status: 404,
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      }

      const upgradeHeader = request.headers.get("Upgrade");
      if (upgradeHeader === "websocket") {
        const id = env.SESSION_ROOM.idFromName(sessionId);
        const stub = env.SESSION_ROOM.get(id);
        return stub.fetch(request);
      }

      return new Response(sessionHtml(sessionId), {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    return new Response(notFoundHtml, {
      status: 404,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  },
} satisfies ExportedHandler<Env>;
