/**
 * SessionRoom — one Durable Object instance per session id.
 *
 * Holds up to two live WebSocket clients. Broadcasts a `roster` message to
 * all connected clients whenever the connection count changes. A third
 * concurrent client receives a `full` close frame and is rejected.
 *
 * State lives only in memory. No persistence, no storage. If the DO is
 * evicted, the session simply disappears — that is fine for this scaffold.
 */

const MAX_CLIENTS = 2;

type RosterMessage = {
  type: "roster";
  connected: number;
  capacity: number;
};

type FullMessage = {
  type: "full";
  reason: string;
};

export class SessionRoom implements DurableObject {
  private readonly clients: Set<WebSocket> = new Set();

  constructor(
    private readonly state: DurableObjectState,
    private readonly env: unknown,
  ) {
    // env is intentionally unused; signature kept for the DO contract.
    void this.state;
    void this.env;
  }

  async fetch(request: Request): Promise<Response> {
    const upgradeHeader = request.headers.get("Upgrade");
    if (upgradeHeader !== "websocket") {
      return new Response("expected websocket upgrade", { status: 426 });
    }

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];

    if (this.clients.size >= MAX_CLIENTS) {
      // Accept then immediately close so the client receives our reason
      // frame rather than a bare 101-then-RST. This keeps the browser side
      // legible: it gets an `onclose` with code 4000 and reason "session full".
      server.accept();
      const message: FullMessage = { type: "full", reason: "session full" };
      try {
        server.send(JSON.stringify(message));
      } catch {
        // Best-effort. If send fails the close still goes out.
      }
      server.close(4000, "session full");
      return new Response(null, { status: 101, webSocket: client });
    }

    server.accept();
    this.clients.add(server);
    this.broadcastRoster();

    server.addEventListener("close", () => {
      this.clients.delete(server);
      this.broadcastRoster();
    });

    server.addEventListener("error", () => {
      this.clients.delete(server);
      this.broadcastRoster();
    });

    return new Response(null, { status: 101, webSocket: client });
  }

  private broadcastRoster(): void {
    const message: RosterMessage = {
      type: "roster",
      connected: this.clients.size,
      capacity: MAX_CLIENTS,
    };
    const payload = JSON.stringify(message);
    for (const socket of this.clients) {
      try {
        socket.send(payload);
      } catch {
        // Drop sockets that fail to send — close handler will clean up.
      }
    }
  }
}
