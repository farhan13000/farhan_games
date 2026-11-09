# Architecture

```
┌──────────── Browser (React + Vite) ─────────────┐         ┌──────────── Node.js server ───────────────┐
│ Pages → useRoomSession → zustand stores         │  REST   │ Express: helmet, CORS, rate limits,       │
│ lib/api.ts  (session cookie → access token) ────┼────────►│ /api/session, /api/health                 │
│ lib/socket.ts (one Socket.IO connection) ───────┼──WS────►│ Socket.IO: auth handshake, handlers,      │
│ boards: one renderer per game kind              │         │ presence, per-player rate limits,         │
└─────────────────────────────────────────────────┘         │ per-viewer broadcast channels             │
                                                            │            │                              │
         shared/ (TypeScript, no framework deps)            │   RoomService (per-room mutex)            │
   engine.ts → defs/{classic,reversi,uttt,mancala,          │   roomDomain (pure rules) ◄── shared/     │
   hex,social}.ts · schemas · events · question banks       │            │                              │
                                                            │   MongoDB: rooms, moves, results, sessions│
                                                            └───────────────────────────────────────────┘
```

## Game engine

Each game is a `GameDef` (`shared/src/games/defs`) with `create(rng)`, `inputRange`, `validate`, `apply` and an optional `redact(state, viewer)`. `engine.ts` performs the generic checks (round in progress, the player may act, index in range) and dispatches to the game's module. Every game shares one serializable `GameState`:

- `turnMode`: `alternate` (`currentTurn`) or `simultaneous` (`submitted[mark]`; both lock in, then the step resolves).
- `step`: the stale-state token clients echo with each move. Turn-based games advance it every move; simultaneous games advance it only when picks are revealed, so both players can submit independently.
- `board`, `boxes`, `scores`, `winner`, `isDraw`, `winningLine`, plus a typed `ext` for game-specific data (Reversi flips and passes, Ultimate TTT macro board and forced board, Mancala pits, RPS and quiz picks and history, Memory cards).

Randomness (question order, card shuffles) uses an injected RNG. The server passes a CSPRNG-backed source.

## Hidden information

RPS throws, quiz answers and face-down Memory cards are stored in full on the server only. `toSnapshot(room, viewerPlayerId)` calls `redactGameState` for that viewer: an opponent's locked-in choice becomes `-1`, and face-down cards become `''`. Each socket joins a private channel `<roomCode>#<playerId>`, and state broadcasts are built per member, so secrets never leave the server. This is covered by unit tests, Socket.IO integration tests and an E2E test.

## Room lifecycle

```
                 partner joins             first move          round ends
WAITING_FOR_PLAYER ──────────► READY ──────────────► IN_PROGRESS ───────────► COMPLETED
   │  host can change game       ▲                      │                        │
   │  freely while waiting       └── both agree on next game (rematch or any) ───┘
   │                                (from any of READY / IN_PROGRESS / COMPLETED;
   │                                 an unfinished round is abandoned, marks swap)
   ├─ host closes / leaves ─────────────────────────────────────────► CANCELLED (HOST_CLOSED)
   └─ waiting TTL (30 min) ─────────────────────────────────────────► EXPIRED
any active state:
   ├─ player leaves (competitive IN_PROGRESS → opponent wins by FORFEIT) ► CANCELLED (PLAYER_LEFT)
   ├─ player offline > 90 s grace (competitive IN_PROGRESS → TIMEOUT win) ► CANCELLED (PLAYER_TIMEOUT)
   ├─ both offline > grace ──────────────────────────────────────────► EXPIRED
   └─ idle for 120 min ──────────────────────────────────────────────► EXPIRED
```

**Next-game voting** (`voteNextGame`): `rematchVotes` plus `nextGameType`. Proposing a different game replaces the pending proposal with a single vote; agreeing adds a vote. Two votes start the next round. Co-op rounds (In Sync) never produce forfeits and don't count as series draws.

## Move pipeline

```
game:make-move ─► rate limit ─► Zod (strict) ─► per-room mutex ─► load room
  ─► member? active? roundVersion current? moveId unseen? expectedStep == game.step?
  ─► engine.validateMove(player's server-side mark) ─► engine.applyMove
  ─► insert GameMove (unique room+round+moveNumber and room+round+moveId)
  ─► findOneAndUpdate({_id, stateVersion}) ─► per-viewer game:state ─► (finished) MatchResult + round-completed
```

## Identity & security decisions

| Decision        | Choice                                                                                                                                                                                                                                                  |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Accounts        | None. A player is a display name plus an anonymous session                                                                                                                                                                                              |
| Session         | Random 256-bit secret in an **HttpOnly** cookie (`ta_session`, path `/api/session`, `SameSite=Lax`, `Secure` in production). The DB stores only `HMAC-SHA256(SESSION_SECRET, secret)`, compared in constant time. Sliding 7-day expiry plus a TTL index |
| Access token    | HS256 JWT (15 min) held **in memory only**, containing just the session id. Revocation is checked on every request and socket handshake                                                                                                                 |
| Player identity | `p:<sessionId>`, derived server-side, never from payloads                                                                                                                                                                                               |
| Room codes      | 6 chars from a 31-symbol unambiguous alphabet via `crypto.randomInt`. Uniqueness via a unique index with retry. Codes are not credentials: actions require membership                                                                                   |
| Concurrency     | Per-room async mutex, optimistic `stateVersion`, `moveId` idempotency and unique indexes                                                                                                                                                                |
| CSRF            | The cookie is only sent to `/api/session/*`, and non-GET requests need `X-Arena-Client: 1` (forces a CORS preflight the allowlist rejects). Game actions use the token, not cookies                                                                     |
| Hardening       | Helmet, CORS allowlist, 10 KB JSON / 16 KB socket limits, REST and socket rate limits, sanitized names and chat, safe error envelope (no stack traces), redacted logs                                                                                   |

## Persistence

| Collection       | Purpose                                                                    | Retention                                     |
| ---------------- | -------------------------------------------------------------------------- | --------------------------------------------- |
| `playersessions` | display name + hashed session secret                                       | TTL on `expiresAt`                            |
| `gamerooms`      | full room state incl. game state (bounded: 2 players, ≤50 recent move IDs) | TTL on `purgeAt` (7 days after the room ends) |
| `gamemoves`      | append-only move audit log                                                 | 30 days                                       |
| `matchresults`   | one per completed round (`roomId + roundVersion` unique)                   | 30 days                                       |

## Restart recovery

Room state is persisted after every change. On boot, all seated players are marked disconnected "now", so their grace period starts from boot. Clients auto-reconnect and call `session:reconnect`. The sweeper depends only on persisted timestamps. This is covered by the restart-recovery integration test.

## Scaling

Single instance only. The per-room mutex, presence map, chat buffer and the default Socket.IO adapter are process-local. Scaling out would need the Redis adapter, sticky sessions, a distributed lock (or `stateVersion` retry), and Redis-backed presence and chat. None of that is implemented, so horizontal scaling is **not** claimed.
