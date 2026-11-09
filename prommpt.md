# Project Build Prompt: Multiplayer Private-Room Tic-Tac-Toe

## Role

Act as a senior full-stack MERN engineer, real-time systems architect,
UI/UX designer, and test engineer. Build a production-minded, responsive
multiplayer Tic-Tac-Toe web application where friends can create private
rooms, invite one another with a shareable room code/link, and play live
games in real time.

Do not stop at a static UI or a basic demo. Implement the complete
working application, including frontend, backend, real-time
communication, persistence, validation, error handling, tests, and setup
documentation.

If a requirement is ambiguous, choose a sensible, secure default and
document it. Do not silently omit features. Work in clear phases and
keep the project runnable after each phase.

------------------------------------------------------------------------

## 1. Product vision

Create a polished, lightweight web game called **TicTac Arena** (name
can be changed through a central configuration).

The core experience:

1.  A user opens the website and can play as a guest or sign in.
2.  The user creates a private room.
3.  The backend generates a short, unique, hard-to-guess room code and
    an invite URL.
4.  The host shares the invite link/code with a friend.
5.  The friend joins the room.
6.  Both players see each other's presence and the same live game board.
7.  Players take turns placing X and O. Every valid move is broadcast
    immediately to both clients.
8.  The game detects wins and draws, displays the result, and allows a
    rematch.
9.  Players can leave, reconnect after a temporary network interruption,
    or return to the room while it is still valid.

The first release is classic **two-player, 3×3 Tic-Tac-Toe**. Design the
game engine so board size and win length can be extended later, but do
not overcomplicate the initial release.

## 2. Required technology stack

Use the MERN stack with real-time communication:

### Frontend

-   React with Vite.
-   JavaScript or TypeScript; prefer TypeScript if the project is being
    created from scratch.
-   React Router for navigation.
-   Tailwind CSS for styling.
-   Socket.IO Client for real-time events.
-   Context API or Zustand for lightweight shared client state.
-   React Hook Form and Zod (or equivalent) for form validation where
    useful.
-   Lucide React for icons.

### Backend

-   Node.js with Express.
-   MongoDB with Mongoose.
-   Socket.IO server attached to the same HTTP server as Express.
-   JWT-based authentication for registered accounts.
-   bcrypt/bcryptjs for password hashing.
-   Zod or Joi for request and event payload validation.
-   Helmet, CORS configuration, rate limiting, and centralized error
    handling.

### Development and deployment

-   npm workspaces or a clearly separated `client/` and `server/`
    structure.
-   dotenv for environment variables.
-   ESLint and Prettier.
-   Vitest/Jest for unit and integration tests; React Testing Library
    for frontend tests.
-   Docker Compose may be supplied for local MongoDB, but the app must
    also support MongoDB Atlas.
-   Deployment documentation for a React host and a Node server host
    that supports persistent WebSocket connections.

Do not use localStorage as the source of truth for game state. The
server must be authoritative.

## 3. User types and identity

Support two modes:

### Guest player

-   Can enter a display name and join/create a room without creating an
    account.
-   Receive a cryptographically random guest/session identity.
-   Persist the guest session safely enough to support page refresh and
    reconnection.
-   Validate and sanitize display names; set a reasonable maximum length
    (for example, 20 characters).
-   Do not trust a client-provided player ID as proof of identity.

### Registered player

-   Sign up, log in, and log out.
-   Store only password hashes, never plaintext passwords.
-   Use short-lived access tokens and a sensible refresh/session
    strategy.
-   Allow a registered user to retain a basic profile and match history.
-   Guest play must remain available even if authentication is
    unavailable.

For the MVP, avoid collecting unnecessary personal information. Never
expose password hashes, refresh tokens, or private session secrets to
clients.

## 4. Pages and user experience

Build the following pages and states.

### A. Landing page (`/`)

-   Product logo/name and concise tagline.
-   Primary actions: **Create Private Room** and **Join Room**.
-   Optional sign-in/sign-up actions.
-   Small explanation of how private rooms work.
-   A polished hero section with a subtle animated Tic-Tac-Toe board.
-   Responsive layout for mobile, tablet, and desktop.

### B. Create room (`/create`)

-   Ask for display name if the player is a guest and has not supplied
    one.
-   Let the host choose a preferred mark only if this does not create
    assignment conflicts; otherwise assign X to the host and O to the
    second player.
-   Create a room through the backend.
-   Show the generated room code and invite link.
-   Provide copy buttons for both.
-   Show a waiting state until another player joins.
-   Host can cancel/close the room.

### C. Join room (`/join`)

-   Input for room code or invite URL.
-   Ask for a display name when needed.
-   Show clear errors for invalid, expired, full, or already-started
    rooms.
-   If the room is valid, join it and navigate to the game room.

### D. Game room (`/room/:roomCode`)

Display: - Room code and copy-invite action. - Player cards for Player X
and Player O. - Online/offline/reconnecting indicators. - Current turn
indicator. - 3×3 board with clear X/O marks. - Move feedback and
win/draw status. - Move counter. - Rematch button after the game ends. -
Leave-room action. - Connection status banner. - Optional small in-room
chat, controlled by a feature flag and not allowed to interfere with
gameplay.

The board must: - Be usable with mouse, touch, and keyboard. - Have
visible focus states and accessible labels. - Disable occupied cells and
invalid moves. - Clearly indicate the most recent move. - Prevent
accidental double submissions. - Adapt to narrow mobile screens without
horizontal scrolling.

### E. Match history (`/history`) --- registered users

-   List completed matches with date, opponent, result, and mark.
-   Provide empty, loading, and error states.
-   Paginate or limit results.

### F. Not-found and error states

-   Friendly 404 page.
-   Useful error messages with a retry action where appropriate.
-   Never expose stack traces or internal server details in production.

## 5. Private room lifecycle

Implement a well-defined room lifecycle:

`WAITING_FOR_PLAYER → READY → IN_PROGRESS → COMPLETED`

A room may also become `CANCELLED` or `EXPIRED`.

Rules: - Each room has exactly two player slots. - The host is assigned
X; the second player is assigned O. - A third player cannot join a full
room as a player. - Spectators are out of scope for the MVP unless
explicitly enabled later. - A room code must be unique among active
rooms and generated using a secure random source. - Room codes should be
easy to read and type, avoiding ambiguous characters where practical. -
Room codes are not authorization credentials by themselves. Validate
room membership separately. - The host can close a waiting room. -
Define what happens if the host disconnects: preserve the room for a
configurable grace period and allow reconnection; do not immediately
destroy an active match. - Define room expiration and cleanup
policies. - Do not let a client arbitrarily change room status, player
marks, scores, or turn ownership.

Use a configurable waiting-room TTL and reconnection grace period.
Document the chosen defaults.

## 6. Game rules and authoritative game engine

Implement all game rules on the backend.

### Board representation

Use a fixed 3×3 representation, such as an array of nine cells: - `null`
= empty - `"X"` = X mark - `"O"` = O mark

### Move validation

A move is valid only when: - The room exists and is active. - The
requesting socket/session belongs to one of the two players. - The game
is in progress. - It is that player's turn. - The target cell is within
the board bounds. - The target cell is empty. - The request is not a
duplicate/stale move.

The server must reject invalid moves and return a structured error.
Never rely only on disabling buttons in React.

### Win and draw detection

Check all eight winning lines: - Three rows. - Three columns. - Two
diagonals.

After every accepted move: 1. Update the board. 2. Check for a winner.
3. If there is no winner, check whether the board is full. 4. If neither
condition is true, switch the turn. 5. Broadcast the new authoritative
state to both players.

### Rematch

-   A rematch must reset the board and move count.
-   Require both players to accept the rematch before starting.
-   Define whether marks switch between rounds; preferably alternate X/O
    to keep play fair.
-   Reject stale rematch requests from a previous round.
-   Use a round/game version number to distinguish successive games in
    the same room.

### Concurrency and duplicate actions

-   Handle two nearly simultaneous moves safely.
-   Use server-side serialization/locking per room or an atomic state
    transition.
-   Add a move ID or idempotency key to avoid applying the same action
    twice.
-   Validate the expected game/round version.
-   Never accept a client-supplied board as the new board state.

Create pure, independently tested functions for: - `validateMove` -
`applyMove` - `getWinner` - `isDraw` - `getNextTurn` -
`createInitialGameState`

## 7. Real-time communication with Socket.IO

Use Socket.IO rooms, with one Socket.IO room per game room.

Suggested event contract (you may refine names, but document the final
contract):

### Client → server

-   `room:create`
-   `room:join`
-   `room:leave`
-   `game:make-move`
-   `game:rematch-request`
-   `game:rematch-response`
-   `session:reconnect`
-   `chat:send` (optional feature flag)

### Server → client

-   `room:created`
-   `room:joined`
-   `room:state`
-   `room:player-joined`
-   `room:player-left`
-   `room:player-status`
-   `game:state`
-   `game:move-rejected`
-   `game:round-completed`
-   `game:rematch-status`
-   `session:restored`
-   `session:error`
-   `chat:message` (optional feature flag)

For every event: - Define the payload schema. - Validate the payload on
the server. - Define acknowledgement behavior and timeout behavior. -
Return consistent success/error structures. - Ensure the sender receives
the final authoritative state too. - Do not broadcast secret tokens or
private session data.

### Reconnection

-   Handle browser refresh, temporary Wi-Fi loss, tab sleep, and
    Socket.IO reconnect.
-   Re-authenticate the reconnecting session.
-   Re-associate the player with the existing room slot.
-   Send the latest room/game snapshot after successful reconnection.
-   Avoid creating duplicate player slots when a player reconnects.
-   Display a reconnecting state to both players.
-   If a player does not return before the grace period ends, apply a
    documented policy (for example, mark the player disconnected and let
    the remaining player leave or claim a timeout win only if that rule
    is explicitly implemented).

### Server restart and scaling

-   Persist enough room/game state to recover active rooms after a
    server restart.
-   Use MongoDB as the durable source for room snapshots and match
    results.
-   For a single-instance MVP, the default Socket.IO in-memory adapter
    is acceptable.
-   Document that multiple backend instances require a shared Socket.IO
    adapter such as Redis and sticky-session/load-balancer configuration
    where applicable.
-   Do not claim horizontal scaling is supported until the adapter and
    deployment setup are implemented and tested.

## 8. Suggested database design

Use Mongoose schemas with timestamps, indexes, validation, and
appropriate TTL/cleanup behavior.

### User

-   `displayName`
-   `email` (unique, normalized; optional for guest-only accounts)
-   `passwordHash`
-   `createdAt`
-   `updatedAt`

### PlayerSession

-   `sessionId` or hashed session token identifier
-   `userId` (nullable for guests)
-   `guestDisplayName`
-   `expiresAt`
-   `createdAt`
-   `updatedAt`

Store sensitive session credentials securely. Prefer storing a hash of a
session secret rather than the raw secret.

### GameRoom

-   `roomCode` (unique index)
-   `hostPlayerId`
-   `players` (maximum two; include stable player/session reference,
    display name snapshot, mark, connection status, joined time)
-   `status`
-   `board`
-   `currentTurn`
-   `winner`
-   `winningLine`
-   `moveCount`
-   `roundNumber`
-   `roundVersion`
-   `rematchVotes`
-   `lastActivityAt`
-   `expiresAt`
-   `createdAt`
-   `updatedAt`

### GameMove (optional but recommended for audit/replay)

-   `roomId`
-   `roundVersion`
-   `moveNumber`
-   `playerId`
-   `mark`
-   `cellIndex`
-   `moveId`
-   `createdAt`

Add a unique compound index to prevent duplicate move numbers or move
IDs within a round.

### MatchResult

-   `roomId`
-   `roundVersion`
-   `playerIds`
-   `winnerPlayerId` (nullable for draw)
-   `result` (`WIN`, `LOSS`, `DRAW`)
-   `completedAt`
-   `moveCount`

Avoid unbounded embedded arrays. Keep indexes aligned with actual
queries. Explain any schema changes you make.

## 9. Backend API design

Use REST for account/profile/history operations and Socket.IO for
room/game actions.

Suggested endpoints:

  ------------------------------------------------------------------------------
  Method                  Endpoint                       Purpose
  ----------------------- ------------------------------ -----------------------
  POST                    `/api/auth/register`           Register account

  POST                    `/api/auth/login`              Log in

  POST                    `/api/auth/refresh`            Refresh session/access
                                                         token

  POST                    `/api/auth/logout`             Log out/revoke session

  GET                     `/api/auth/me`                 Current user/session
                                                         profile

  POST                    `/api/rooms`                   Create a private room
                                                         if using REST creation

  GET                     `/api/rooms/:roomCode`         Get safe room metadata
                                                         after authorization

  POST                    `/api/rooms/:roomCode/join`    Join room if using REST
                                                         join

  POST                    `/api/rooms/:roomCode/leave`   Leave room if using
                                                         REST leave

  GET                     `/api/matches`                 Get authenticated
                                                         user's match history

  GET                     `/api/health`                  Health/readiness check
  ------------------------------------------------------------------------------

Do not implement the same operation inconsistently through both REST and
Socket.IO. Choose one clear path for each action and document it. Room
creation/joining/game moves may be Socket.IO-driven, while REST can
provide health, profile, and history.

Use: - A consistent response envelope. - Centralized error codes. -
Input validation. - Authentication and authorization middleware. -
Pagination for history. - Rate limits on authentication and room
creation/join attempts.

## 10. Frontend architecture and state management

Keep responsibilities separated.

Suggested frontend structure:

``` text
client/
  src/
    app/
      App.tsx
      router.tsx
      providers/
    components/
      common/
      game/
      room/
      layout/
    features/
      auth/
      lobby/
      rooms/
      gameplay/
      history/
    hooks/
    lib/
      api.ts
      socket.ts
      validators.ts
    store/
    styles/
    types/
    utils/
    main.tsx
```

Suggested backend structure:

``` text
server/
  src/
    config/
    controllers/
    middleware/
    models/
    routes/
    services/
      auth/
      rooms/
      game/
      sessions/
    sockets/
      index.ts
      handlers/
      events/
    validators/
    utils/
    tests/
    app.ts
    server.ts
```

Frontend requirements: - Keep socket connection lifecycle in a dedicated
provider/hook. - Do not create a new socket on every render. - Clean up
listeners on unmount. - Rejoin/recover room state after reconnect. -
Keep UI state separate from authoritative game state. - Show loading,
empty, success, and error states. - Avoid optimistic board updates
unless they can be safely rolled back; server-authoritative updates are
preferred. - Prevent duplicate event listeners and stale closures.

## 11. UI/UX and visual direction

Create a modern, friendly, game-focused design. It should feel polished
rather than like a generic admin dashboard.

Visual direction: - Light-first interface with a clean neutral
background. - Strong contrast for X and O. - Rounded cards and board
cells, restrained shadows, subtle borders. - One clear accent color for
primary actions. - Subtle motion for placing a mark, winning, joining,
and changing turns. - Avoid excessive gradients, visual clutter, and
distracting animations. - Use a consistent spacing and typography
scale. - Support dark mode only if it can be implemented consistently;
it is not required for MVP.

Responsive behavior: - Mobile-first board sizing. - Touch targets should
be comfortably tappable. - Room code and invite controls should fit
small screens. - Player cards should stack on mobile and align
horizontally on desktop.

Accessibility: - Semantic HTML. - Keyboard navigation. - Visible focus
indicators. - Accessible button names and status announcements. - Do not
communicate player identity or game result through color alone. -
Respect reduced-motion preferences.

## 12. Security and abuse prevention

Implement and document: - Server-side validation for every REST endpoint
and socket event. - Authentication of sockets and authorization of room
membership. - Secure random room codes and session identifiers. -
Password hashing with an appropriate work factor. - CORS allowlist from
environment configuration. - Helmet security headers. - Rate limiting
for login, registration, room creation, and join attempts. - Payload
size limits. - Sanitized display names and chat messages. - Protection
against room enumeration where practical. - No trust in client-supplied
player IDs, marks, board state, winner, or turn. - Safe error responses
without secrets or stack traces. - Environment variables for all secrets
and URLs. - No secrets committed to Git. - Dependency audit and basic
security checks.

For cookie-based refresh sessions, use `HttpOnly`, `Secure` in
production, and an appropriate `SameSite` policy. Explain CSRF
considerations. Never store long-lived authentication secrets in browser
localStorage.

## 13. Testing requirements

### Unit tests

-   Every winning line.
-   Horizontal, vertical, and diagonal wins.
-   Draw detection.
-   Invalid cell index.
-   Occupied cell.
-   Wrong player turn.
-   Move after game completion.
-   Duplicate move ID.
-   Stale round version.
-   Rematch voting and round reset.
-   Room code generation collision handling.

### Integration tests

-   Create room and join with a second player.
-   Reject a third player.
-   Reject invalid room code.
-   Reject unauthorized move.
-   Reject out-of-turn move.
-   Broadcast accepted move to both players.
-   Detect and persist win/draw.
-   Reconnect and restore the correct state.
-   Expire and clean up inactive rooms.
-   Recover persisted active game state after a simulated restart where
    feasible.

### Frontend tests

-   Landing page navigation.
-   Create/join room validation.
-   Waiting-room state.
-   Board interaction and disabled cells.
-   Turn and result rendering.
-   Connection-loss and reconnect UI.
-   Rematch flow.
-   Keyboard accessibility for board cells.

### End-to-end tests

Use Playwright or Cypress to simulate two independent browser
contexts: 1. Player A creates a room. 2. Player B joins using the invite
code. 3. A and B make alternating moves. 4. Both browsers show identical
state. 5. A wins or the game draws. 6. Both players request/accept a
rematch. 7. Simulate one player's temporary disconnect and reconnect.

Do not mark the project complete while core multiplayer flows are
untested.

## 14. Environment variables and configuration

Provide `.env.example` files without real secrets.

Example server variables:

``` env
NODE_ENV=development
PORT=5000
CLIENT_ORIGIN=http://localhost:5173
MONGODB_URI=mongodb://127.0.0.1:27017/tictac_arena
JWT_ACCESS_SECRET=replace_with_a_long_random_secret
JWT_ACCESS_EXPIRES_IN=15m
SESSION_SECRET=replace_with_a_long_random_secret
SESSION_TTL_DAYS=7
ROOM_WAITING_TTL_MINUTES=30
PLAYER_RECONNECT_GRACE_SECONDS=90
```

Example client variables:

``` env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

Validate required environment variables at startup and fail with a clear
configuration error. Never provide real secrets in generated files.

## 15. Required deliverables

Produce all of the following:

1.  Complete runnable source code for client and server.
2.  Clean folder structure and package scripts.
3.  MongoDB models and indexes.
4.  REST API and Socket.IO event documentation.
5.  Server-authoritative game engine.
6.  Guest and registered-user flows.
7.  Private room creation and invite/join flow.
8.  Reconnection and room expiration behavior.
9.  Responsive and accessible UI.
10. Unit, integration, and end-to-end tests for critical flows.
11. `.env.example` files.
12. README with prerequisites, installation, local development, testing,
    build, and deployment.
13. Architecture overview and room/game state diagrams.
14. A list of MVP limitations and sensible next steps.

## 16. Development phases

Implement in this order. At the end of each phase, ensure the app runs
and report files created, commands to run, and tests passed.

### Phase 1 --- Foundation

-   Initialize client and server.
-   Configure TypeScript, linting, formatting, environment validation.
-   Connect MongoDB.
-   Add health endpoint.
-   Create responsive application shell.

### Phase 2 --- Identity

-   Implement guest session flow.
-   Implement registration/login/logout for registered users.
-   Add authentication and socket authentication.
-   Test identity persistence and session expiry.

### Phase 3 --- Room management

-   Create private room.
-   Generate invite code/link.
-   Join room.
-   Enforce two-player limit.
-   Implement waiting state, leave, close, and expiration.

### Phase 4 --- Game engine

-   Implement pure game functions.
-   Add server-authoritative move handling.
-   Add turn validation, win/draw detection, and round versioning.
-   Unit-test all game rules.

### Phase 5 --- Real-time gameplay

-   Integrate Socket.IO events.
-   Broadcast room/game snapshots.
-   Handle invalid/duplicate/stale actions.
-   Test two-browser multiplayer behavior.

### Phase 6 --- Reconnection and rematch

-   Implement disconnect presence.
-   Implement reconnect and state restoration.
-   Implement mutual rematch acceptance.
-   Test refresh, network interruption, and round reset.

### Phase 7 --- UI polish and history

-   Complete all pages and responsive states.
-   Add accessible animations and feedback.
-   Persist match results.
-   Add registered-user match history.

### Phase 8 --- Hardening and release

-   Add rate limits and security headers.
-   Complete automated tests.
-   Add logging and production-safe error handling.
-   Verify production build.
-   Write deployment and operations documentation.

## 17. Acceptance criteria

The application is accepted only when all of these are true:

-   A guest can create a private room without registering.
-   A friend can join through a room code or invite link.
-   Exactly two players can participate in a room.
-   Both clients see the same board and turn state in real time.
-   Only the correct player can make a valid move.
-   Invalid, duplicate, stale, and out-of-turn moves are rejected by the
    server.
-   Wins and draws are detected correctly.
-   Both players can agree to a rematch.
-   A disconnected player can reconnect within the configured grace
    period and recover the current state.
-   Refreshing a page does not silently create a new player identity or
    duplicate room slot.
-   Room and match data are persisted according to the documented
    policy.
-   The UI works on mobile and desktop.
-   Critical game and multiplayer flows have automated tests.
-   A new developer can run the project by following the README.

## 18. Instructions for the coding agent

Before writing code: 1. Inspect the existing repository. If it is not
empty, preserve useful existing work. 2. Summarize the proposed
architecture and final folder structure. 3. Identify any decisions that
materially affect security or data consistency. 4. Then implement the
project; do not stop after producing a plan.

While implementing: - Work phase by phase. - Prefer small, maintainable
modules over giant files. - Use strict types and shared event/payload
types where possible. - Keep game rules independent of Express,
Socket.IO, and React. - Make the backend authoritative for all
gameplay. - Handle loading, errors, disconnections, and race
conditions. - Do not leave placeholder buttons or fake multiplayer
behavior. - Do not hardcode secrets, room codes, or production URLs. -
Do not claim a feature works unless it is implemented and tested.

At completion: - Run linting, type checks, tests, and production
builds. - Fix failures rather than merely listing them. - Provide exact
commands to start client and server. - Summarize implemented features,
known limitations, and deployment steps. - Report any tests that could
not be run and why.

**Primary goal:** deliver a genuinely playable, reliable, private-room
multiplayer Tic-Tac-Toe application---not just a visual prototype.
