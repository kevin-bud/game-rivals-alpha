/**
 * SessionRoom — one Durable Object instance per session id.
 *
 * Holds up to two live WebSocket clients and runs a single round of "Lanes":
 * the first client to connect is the Pilot, the second is the Spawner.
 * Roles persist for the lifetime of the DO. The DO drives a 100 ms tick
 * loop while the round is running, advances Spawner-dropped blockers down
 * a 3-lane × 12-row field, checks collisions, and broadcasts role-tailored
 * state messages to each client.
 *
 * State lives only in memory. No persistence, no storage. If the DO is
 * evicted, the session simply disappears — that is fine for this MVP.
 */

const MAX_CLIENTS = 2;

const LANES = 3;
const ROWS = 12;
const RUNNER_ROW = ROWS - 1; // row 11 — the row before the bottom is occupied by buttons.
const TICK_MS = 100;
const COUNTDOWN_MS = 3000;
const ROUND_MS = 30_000;
const SPAWN_COOLDOWN_MS = 600;
const SPAWNER_VIEW_DELAY_MS = 500;
// History buffer length: enough to look back SPAWNER_VIEW_DELAY_MS at TICK_MS resolution.
const RUNNER_HISTORY_SAMPLES = Math.ceil(SPAWNER_VIEW_DELAY_MS / TICK_MS) + 2;

type Role = "pilot" | "spawner";
type Phase = "lobby" | "countdown" | "running" | "over";
type Winner = "pilot" | "spawner";

type Blocker = {
  lane: number;
  row: number;
};

type RunnerSample = {
  at: number;
  lane: number;
};

type ClientSlot = {
  socket: WebSocket;
  role: Role;
};

type RoleMessage = {
  type: "role";
  role: Role;
};

type FullMessage = {
  type: "full";
  reason: string;
};

type PilotStateMessage = {
  type: "state";
  phase: Phase;
  role: "pilot";
  runnerLane: number;
  blockers: Blocker[];
  timeRemainingMs: number;
  countdownRemainingMs: number;
  winner?: Winner;
};

type SpawnerStateMessage = {
  type: "state";
  phase: Phase;
  role: "spawner";
  spawnerViewRunnerLane: number;
  blockers: Blocker[];
  timeRemainingMs: number;
  countdownRemainingMs: number;
  lanesOnCooldown: boolean[];
  winner?: Winner;
};

type IncomingLane = {
  type: "lane";
  lane: number;
};

type IncomingSpawn = {
  type: "spawn";
  lane: number;
};

type IncomingPlayAgain = {
  type: "play_again";
};

type IncomingMessage = IncomingLane | IncomingSpawn | IncomingPlayAgain;

function isValidLane(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value < LANES;
}

function parseIncoming(raw: string): IncomingMessage | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (parsed === null || typeof parsed !== "object") {
    return null;
  }
  const obj = parsed as { type?: unknown; lane?: unknown };
  if (obj.type === "lane" && isValidLane(obj.lane)) {
    return { type: "lane", lane: obj.lane };
  }
  if (obj.type === "spawn" && isValidLane(obj.lane)) {
    return { type: "spawn", lane: obj.lane };
  }
  if (obj.type === "play_again") {
    return { type: "play_again" };
  }
  return null;
}

export class SessionRoom implements DurableObject {
  private readonly clients: ClientSlot[] = [];

  private phase: Phase = "lobby";
  private runnerLane = 1;
  private blockers: Blocker[] = [];
  private runnerHistory: RunnerSample[] = [{ at: 0, lane: 1 }];
  private lastSpawnAt: number[] = [0, 0, 0];
  private phaseStartedAt = 0;
  private winner: Winner | null = null;
  private tickHandle: ReturnType<typeof setInterval> | null = null;
  private countdownHandle: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly state: DurableObjectState,
    private readonly env: unknown,
  ) {
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

    if (this.clients.length >= MAX_CLIENTS) {
      // Accept then immediately close so the browser sees a clean reason frame.
      server.accept();
      const message: FullMessage = { type: "full", reason: "session full" };
      try {
        server.send(JSON.stringify(message));
      } catch {
        // Best-effort.
      }
      server.close(4000, "session full");
      return new Response(null, { status: 101, webSocket: client });
    }

    server.accept();
    const role: Role = this.clients.length === 0 ? "pilot" : "spawner";
    const slot: ClientSlot = { socket: server, role };
    this.clients.push(slot);

    // Tell the new client what role they have.
    this.sendTo(slot, { type: "role", role } satisfies RoleMessage);

    server.addEventListener("message", (event) => {
      if (typeof event.data !== "string") {
        return;
      }
      const incoming = parseIncoming(event.data);
      if (incoming === null) {
        return;
      }
      this.handleIncoming(slot, incoming);
    });

    server.addEventListener("close", () => {
      this.removeClient(slot);
    });

    server.addEventListener("error", () => {
      this.removeClient(slot);
    });

    // Send the new client a snapshot immediately so they see the current phase.
    this.broadcastState();

    // If both clients are now connected and we are still in lobby, start.
    if (this.clients.length === MAX_CLIENTS && this.phase === "lobby") {
      this.enterCountdown();
    }

    return new Response(null, { status: 101, webSocket: client });
  }

  private removeClient(slot: ClientSlot): void {
    const idx = this.clients.indexOf(slot);
    if (idx === -1) {
      return;
    }
    this.clients.splice(idx, 1);
    // If a client drops mid-round, stop the round and return to lobby.
    if (this.clients.length < MAX_CLIENTS) {
      this.stopTimers();
      this.phase = "lobby";
      this.resetRoundState();
      this.broadcastState();
    }
  }

  private handleIncoming(slot: ClientSlot, msg: IncomingMessage): void {
    if (msg.type === "lane") {
      if (slot.role !== "pilot") {
        return;
      }
      if (this.phase !== "running") {
        return;
      }
      this.runnerLane = msg.lane;
      this.recordRunnerSample();
      // Don't re-broadcast on every lane tap — the next tick (≤100 ms) covers it.
      return;
    }
    if (msg.type === "spawn") {
      if (slot.role !== "spawner") {
        return;
      }
      if (this.phase !== "running") {
        return;
      }
      const now = Date.now();
      if (now - this.lastSpawnAt[msg.lane] < SPAWN_COOLDOWN_MS) {
        return;
      }
      this.lastSpawnAt[msg.lane] = now;
      this.blockers.push({ lane: msg.lane, row: 0 });
      return;
    }
    if (msg.type === "play_again") {
      if (this.phase !== "over") {
        return;
      }
      // Either client can request the restart.
      this.enterCountdown();
      return;
    }
  }

  private resetRoundState(): void {
    this.runnerLane = 1;
    this.blockers = [];
    this.lastSpawnAt = [0, 0, 0];
    this.runnerHistory = [{ at: Date.now(), lane: this.runnerLane }];
    this.winner = null;
  }

  private enterCountdown(): void {
    this.stopTimers();
    this.resetRoundState();
    this.phase = "countdown";
    this.phaseStartedAt = Date.now();
    this.broadcastState();
    this.countdownHandle = setTimeout(() => {
      this.countdownHandle = null;
      this.enterRunning();
    }, COUNTDOWN_MS);
  }

  private enterRunning(): void {
    this.stopTimers();
    this.phase = "running";
    this.phaseStartedAt = Date.now();
    this.runnerHistory = [{ at: this.phaseStartedAt, lane: this.runnerLane }];
    this.broadcastState();
    this.tickHandle = setInterval(() => {
      this.tick();
    }, TICK_MS);
  }

  private enterOver(winner: Winner): void {
    this.stopTimers();
    this.phase = "over";
    this.winner = winner;
    this.phaseStartedAt = Date.now();
    this.broadcastState();
  }

  private tick(): void {
    if (this.phase !== "running") {
      return;
    }
    const now = Date.now();

    // Advance every blocker by one row.
    const advanced: Blocker[] = [];
    for (const b of this.blockers) {
      const nextRow = b.row + 1;
      if (nextRow <= RUNNER_ROW) {
        advanced.push({ lane: b.lane, row: nextRow });
      }
      // Blockers past RUNNER_ROW are dropped (they overshot without colliding).
    }
    this.blockers = advanced;

    // Record runner history for the spawner-view delay.
    this.recordRunnerSample();

    // Collision check: any blocker now at RUNNER_ROW in the runner's lane?
    for (const b of this.blockers) {
      if (b.row === RUNNER_ROW && b.lane === this.runnerLane) {
        this.enterOver("spawner");
        return;
      }
    }

    // Time-out check: pilot survives 30 s without collision.
    if (now - this.phaseStartedAt >= ROUND_MS) {
      this.enterOver("pilot");
      return;
    }

    this.broadcastState();
  }

  private recordRunnerSample(): void {
    const now = Date.now();
    this.runnerHistory.push({ at: now, lane: this.runnerLane });
    if (this.runnerHistory.length > RUNNER_HISTORY_SAMPLES) {
      this.runnerHistory.splice(0, this.runnerHistory.length - RUNNER_HISTORY_SAMPLES);
    }
  }

  private spawnerViewRunnerLane(): number {
    const target = Date.now() - SPAWNER_VIEW_DELAY_MS;
    // Find the most recent sample whose timestamp is <= target.
    let chosen = this.runnerHistory[0]?.lane ?? 1;
    for (const sample of this.runnerHistory) {
      if (sample.at <= target) {
        chosen = sample.lane;
      } else {
        break;
      }
    }
    return chosen;
  }

  private lanesOnCooldown(): boolean[] {
    const now = Date.now();
    const result: boolean[] = [];
    for (let lane = 0; lane < LANES; lane += 1) {
      result.push(now - this.lastSpawnAt[lane] < SPAWN_COOLDOWN_MS);
    }
    return result;
  }

  private timeRemainingMs(): number {
    if (this.phase !== "running") {
      return 0;
    }
    const elapsed = Date.now() - this.phaseStartedAt;
    return Math.max(0, ROUND_MS - elapsed);
  }

  private countdownRemainingMs(): number {
    if (this.phase !== "countdown") {
      return 0;
    }
    const elapsed = Date.now() - this.phaseStartedAt;
    return Math.max(0, COUNTDOWN_MS - elapsed);
  }

  private broadcastState(): void {
    const blockersSnapshot: Blocker[] = this.blockers.map((b) => ({ lane: b.lane, row: b.row }));
    const timeRemainingMs = this.timeRemainingMs();
    const countdownRemainingMs = this.countdownRemainingMs();
    const spawnerLane = this.spawnerViewRunnerLane();
    const lanesOnCooldown = this.lanesOnCooldown();
    const winner = this.winner ?? undefined;

    for (const slot of this.clients) {
      if (slot.role === "pilot") {
        const msg: PilotStateMessage = {
          type: "state",
          phase: this.phase,
          role: "pilot",
          runnerLane: this.runnerLane,
          blockers: blockersSnapshot,
          timeRemainingMs,
          countdownRemainingMs,
        };
        if (winner !== undefined) {
          msg.winner = winner;
        }
        this.sendTo(slot, msg);
      } else {
        const msg: SpawnerStateMessage = {
          type: "state",
          phase: this.phase,
          role: "spawner",
          spawnerViewRunnerLane: spawnerLane,
          blockers: blockersSnapshot,
          timeRemainingMs,
          countdownRemainingMs,
          lanesOnCooldown,
        };
        if (winner !== undefined) {
          msg.winner = winner;
        }
        this.sendTo(slot, msg);
      }
    }
  }

  private sendTo(slot: ClientSlot, payload: object): void {
    try {
      slot.socket.send(JSON.stringify(payload));
    } catch {
      // Best-effort. If send fails the close handler will clean up.
    }
  }

  private stopTimers(): void {
    if (this.tickHandle !== null) {
      clearInterval(this.tickHandle);
      this.tickHandle = null;
    }
    if (this.countdownHandle !== null) {
      clearTimeout(this.countdownHandle);
      this.countdownHandle = null;
    }
  }
}
