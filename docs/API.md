# API & real-time contract

All REST responses and Socket.IO acknowledgements use one envelope:

```jsonc
{ "ok": true,  "data": { /* ... */ } }
{ "ok": false, "error": { "code": "ROOM_FULL", "message": "That room already has two players.", "details": [] } }
```

Error codes live in [`shared/src/errors.ts`](../shared/src/errors.ts) and payload schemas (Zod) in [`shared/src/schemas.ts`](../shared/src/schemas.ts). The server validates every payload; the client uses the same schemas for its forms.

## Which path does each action use?

| Action                                                                                   | Transport            |
| ---------------------------------------------------------------------------------------- | -------------------- |
| Choose a name (start a session), refresh token, forget me                                | REST `/api/session*` |
| Health                                                                                   | REST `/api/health`   |
| Create / preview / join / leave room, moves, next-game votes, reconnect, chat, reactions | Socket.IO            |

There are **no accounts** and no account, profile or history endpoints.

## REST

| Method | Endpoint               | Auth            | Body              | Response `data`                                                    |
| ------ | ---------------------- | --------------- | ----------------- | ------------------------------------------------------------------ |
| GET    | `/api/health`          | none            |                   | `{ status, db, uptimeSeconds }` (503 if DB down)                   |
| POST   | `/api/session`         | header          | `{ displayName }` | `AuthPayload`; sets the HttpOnly session cookie                    |
| POST   | `/api/session/refresh` | cookie + header |                   | `AuthPayload`, or `null` when no session                           |
| POST   | `/api/session/end`     | cookie + header |                   | `{ ended: true }`; revokes the session and disconnects its sockets |
| GET    | `/api/session/me`      | Bearer          |                   | `{ playerId, displayName }`                                        |

`AuthPayload = { accessToken, expiresIn, profile: { playerId, displayName }, features: { chat } }`

"header" means requests must send `X-Arena-Client: 1` (CSRF defence).

## Socket.IO

**Handshake:** `io(url, { auth: { token: <accessToken> } })`. An invalid or expired token fails with `connect_error` and `err.data.code` = `UNAUTHORIZED` / `SESSION_EXPIRED`; the client refreshes and reconnects.

**Acks:** every client event takes an ack callback and receives the envelope. Use a timeout (`SOCKET_ACK_TIMEOUT_MS` = 8 s); on timeout, resync with `session:reconnect`.

**Authority:** the player is derived from the authenticated socket, never from the payload. Payloads are `.strict()`, so unknown fields such as `board`, `mark` or `winner` are rejected.

### Client → server

| Event                   | Payload                                                   | Ack `data`           | Notable errors                                                                                                                                            |
| ----------------------- | --------------------------------------------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `room:create`           | `{ gameType? }`                                           | `{ snapshot }`       | `RATE_LIMITED`                                                                                                                                            |
| `room:preview`          | `{ roomCode }`                                            | `RoomPreview`        | `ROOM_NOT_FOUND`, `ROOM_EXPIRED`, `ROOM_CLOSED`                                                                                                           |
| `room:join`             | `{ roomCode }`                                            | `{ snapshot }`       | `ROOM_FULL`, `ROOM_NOT_FOUND`, `ROOM_EXPIRED`, `ROOM_CLOSED`                                                                                              |
| `session:reconnect`     | `{ roomCode }`                                            | `{ snapshot, chat }` | `NOT_A_MEMBER`, `ROOM_NOT_FOUND`                                                                                                                          |
| `room:leave`            | `{ roomCode }`                                            | `{ left: true }`     | `NOT_A_MEMBER`                                                                                                                                            |
| `game:make-move`        | `{ roomCode, roundVersion, expectedStep, moveId, index }` | `{ snapshot }`       | `NOT_A_MEMBER`, `NOT_YOUR_TURN`, `CELL_OCCUPIED`, `ILLEGAL_MOVE`, `INVALID_INDEX`, `DUPLICATE_MOVE`, `STALE_STATE`, `STALE_ROUND`, `GAME_NOT_IN_PROGRESS` |
| `game:rematch-request`  | `{ roomCode, roundVersion, gameType? }`                   | `{ snapshot }`       | `STALE_ROUND`, `REMATCH_NOT_AVAILABLE`                                                                                                                    |
| `game:rematch-response` | `{ roomCode, roundVersion, accept }`                      | `{ snapshot }`       | same                                                                                                                                                      |
| `chat:send`             | `{ roomCode, text }` (1–200 chars, sanitized)             | `{ message }`        | `FEATURE_DISABLED`, `NOT_A_MEMBER`                                                                                                                        |
| `room:reaction`         | `{ roomCode, emoji }`                                     | `{ sent: true }`     | `NOT_A_MEMBER`                                                                                                                                            |

`gameType` is one of `tic-tac-toe`, `four-in-a-row`, `five-in-a-row`, `dots-and-boxes`, `reversi`, `ultimate-tic-tac-toe`, `mancala`, `hex`, `know-me`, `in-sync`, `rock-paper-scissors`, `memory-match`.

**`index` by game:** a cell (row-major) for grid games, Reversi, Hex and Memory; `board*9 + cell` for Ultimate TTT; a column for Four in a Row; a line for Dots & Boxes; your own pit 0–5 for Mancala; a choice (0 rock, 1 paper, 2 scissors) for RPS; an option index for the quizzes.

**`expectedStep`:** echo `snapshot.game.step`. For turn-based games it advances on every move. For simultaneous games (RPS, quizzes) it advances only when both picks are revealed, so the two players can lock in independently.

**Next-game voting:** `game:rematch-request` proposes the next round: a rematch (no `gameType`) or a different game. A proposal for a different game replaces any pending one. `game:rematch-response { accept: true }` agrees to the pending proposal; `accept: false` clears it. When both players agree, a new round starts immediately with marks swapped, and an unfinished round is abandoned without a result. In a waiting room the host's `gameType` proposal applies immediately.

### Server → client

| Event                                     | Payload                                                       | When                                         |
| ----------------------------------------- | ------------------------------------------------------------- | -------------------------------------------- |
| `room:state` / `game:state`               | `RoomSnapshot` (built per viewer)                             | Any change / after each accepted move        |
| `room:player-joined` / `room:player-left` | `{ roomCode, playerId, displayName }`                         | Membership changes                           |
| `room:player-status`                      | `{ …, connected }`                                            | A player's last socket drops, or they return |
| `room:closed`                             | `{ roomCode, reason }`                                        | Room cancelled or expired                    |
| `game:round-completed`                    | `{ roomCode, roundVersion, winnerPlayerId, isDraw, reason }`  | Win, draw, forfeit or timeout                |
| `game:rematch-status`                     | `{ roomCode, roundVersion, votes, nextGameType, declinedBy }` | Vote changes                                 |
| `game:move-rejected`                      | `{ code, message, snapshot }`                                 | Sent only to the sender of a rejected move   |
| `chat:message` / `room:reaction`          | message / `{ id, playerId, emoji }`                           | Chat and reactions                           |
| `session:error`                           | `{ code, message }`                                           | Session revoked elsewhere                    |

**Snapshots are per viewer.** Each member receives state through a private channel. An opponent's locked-in choice appears as `-1` (`HIDDEN_CHOICE`), and face-down Memory cards appear as `''`. `stateVersion` is monotonic, so clients drop older snapshots.
