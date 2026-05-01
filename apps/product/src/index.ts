/**
 * Worker entry. Three responsibilities:
 *
 * 1. `GET /` — serve the landing page with a "Create session" button.
 * 2. `GET /s/:id` — serve the session page (HTML) or, if upgraded, hand
 *    the WebSocket to the SessionRoom Durable Object for that id.
 * 3. `POST /api/session` — mint a new session id and 303-redirect to it.
 *
 * The DO binding is `SESSION_ROOM`. Each session id maps to its own DO
 * instance via `idFromName(sessionId)`.
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
    <title>Two-phone session</title>
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
    <h1>Two-phone session</h1>
    <p>
      Tap below to open a fresh session, then share the resulting link with
      a second device.
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
    <title>Session ${safeId}</title>
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
      h1 { font-size: 1.25rem; margin-top: 1rem; }
      .share {
        margin-top: 1rem;
        padding: 1rem;
        border: 1px solid currentColor;
        border-radius: 0.75rem;
        word-break: break-all;
        font-family: ui-monospace, "SF Mono", Menlo, monospace;
        font-size: 1rem;
      }
      .share-label {
        font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
        font-size: 0.875rem;
        opacity: 0.7;
        margin-bottom: 0.5rem;
      }
      .status {
        margin-top: 1.5rem;
        padding: 1rem;
        border: 2px solid currentColor;
        border-radius: 0.75rem;
        text-align: center;
        font-size: 1.5rem;
        font-weight: 600;
        min-height: 3rem;
      }
      .copy {
        margin-top: 0.75rem;
        padding: 0.75rem 1rem;
        font-size: 1rem;
        font-weight: 500;
        border-radius: 0.5rem;
        border: 1px solid currentColor;
        background: transparent;
        color: inherit;
        cursor: pointer;
        width: 100%;
        min-height: 2.75rem;
      }
    </style>
  </head>
  <body>
    <h1>Session <code>${safeId}</code></h1>
    <p class="share-label">Share this link with the second device:</p>
    <div class="share" data-testid="share-url" id="share-url"></div>
    <button class="copy" type="button" id="copy-button">Copy link</button>
    <div class="status" data-testid="status" id="status">Connecting…</div>
    <script>
      (function () {
        var shareUrl = window.location.origin + window.location.pathname;
        var shareEl = document.getElementById("share-url");
        var statusEl = document.getElementById("status");
        var copyBtn = document.getElementById("copy-button");
        shareEl.textContent = shareUrl;

        copyBtn.addEventListener("click", function () {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(shareUrl).then(function () {
              copyBtn.textContent = "Copied";
              setTimeout(function () {
                copyBtn.textContent = "Copy link";
              }, 1500);
            });
          }
        });

        var protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        var wsUrl = protocol + "//" + window.location.host + window.location.pathname;
        var ws = new WebSocket(wsUrl);

        ws.addEventListener("message", function (event) {
          try {
            var data = JSON.parse(event.data);
            if (data.type === "roster") {
              statusEl.textContent = data.connected + " of " + data.capacity + " connected";
            } else if (data.type === "full") {
              statusEl.textContent = "Session full";
            }
          } catch (err) {
            // Ignore malformed messages.
          }
        });

        ws.addEventListener("close", function (event) {
          if (event.code === 4000) {
            statusEl.textContent = "Session full";
          } else if (statusEl.textContent === "Connecting…") {
            statusEl.textContent = "Disconnected";
          }
        });

        ws.addEventListener("error", function () {
          if (statusEl.textContent === "Connecting…") {
            statusEl.textContent = "Connection error";
          }
        });
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
        return new Response(notFoundHtml, {
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
