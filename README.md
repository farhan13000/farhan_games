# TicTac Arena

[![CI](https://github.com/farhan13000/farhan_games/actions/workflows/ci.yml/badge.svg)](https://github.com/farhan13000/farhan_games/actions/workflows/ci.yml)

A private, no-login game room for two: couples, best friends, rivals. Type a name, create a room, send the link, and play as many rounds of as many games as you like, all in one room.

## Games (12)

| Besties & Couples                                                                 | Brainy Battles                                                                   | Quick Classics               |
| --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ---------------------------- |
| 💞 **How Well Do You Know Me?**: answer about yourself while your partner guesses | ⚫ **Reversi**: outflank and flip discs                                          | ❌ **Tic-Tac-Toe**           |
| 🔮 **In Sync**: co-op "this or that". How often do you match?                     | 🧠 **Ultimate Tic-Tac-Toe**: nine boards, each move sends your partner somewhere | 🔴 **Four in a Row**         |
| ✊ **Rock Paper Scissors**: secret throws, best of five                           | 🪨 **Mancala**: sow seeds, capture, fill your store                              | 🔲 **Dots & Boxes**          |
| 🃏 **Memory Match**: flip cards, find pairs                                       | ⬡ **Hex**: connect your two edges; no draws                                      | ⭕ **Five in a Row** (13×13) |

## How it works

- **No login, ever.** A visitor picks a display name; an anonymous session in an HttpOnly cookie keeps the same identity across refreshes. No email or password.
- **One room, unlimited play.** After any round, choose **Rematch** or **Play something else**. Either player can also **Switch game** mid-round. Nothing changes until the other player agrees. While waiting for a partner, the host can change the starting game freely. A series score carries across every game.
- **Fair and private.** The server referees every move. Secret picks (RPS throws, quiz answers) and face-down cards are removed from each player's snapshot before it is sent, so they never reach the other browser.
- **Reconnect-safe.** Refresh, lose Wi-Fi or let the tab sleep: your seat is held for 90 s and the state is restored.
- **Extras:** live presence, in-room chat (feature flag), emoji reactions, confetti, mutable sound effects, keyboard-playable boards, screen-reader announcements and reduced-motion support.

**Stack:** React 18 + Vite + TypeScript + Tailwind + Zustand + React Hook Form/Zod + Socket.IO · Node.js + Express + Socket.IO + MongoDB/Mongoose · Vitest, React Testing Library, Supertest, Playwright.

## Project layout

```
shared/   pure game engines (one rules module per game), Zod schemas, event contract, question banks
server/   Express + Socket.IO + Mongoose          (src/{config,controllers,middleware,models,routes,services,sockets,utils}, tests/)
client/   React app                              (src/{app,components,features,hooks,lib,store,styles,test})
e2e/      Playwright two-browser tests
docs/     ARCHITECTURE.md (design, lifecycle, security) · API.md (REST + Socket.IO contract)
```

## Quick start

Prerequisites: Node.js **20+** and npm 10+. MongoDB is optional for local development.

```bash
git clone https://github.com/farhan13000/farhan_games.git
cd farhan_games
npm install
cp server/.env.example server/.env   # set two different random secrets (see below)
npm run dev                          # server :5000, client :5173
```

Open http://localhost:5173. To play locally against yourself, use a second browser profile or a private window; each one gets its own player.

- **Database:** `MONGODB_URI=memory` runs an ephemeral in-memory MongoDB (dev only; the first run downloads a binary). Alternatively run `docker compose up -d` for MongoDB 7 on `localhost:27017`, or use a MongoDB Atlas URI.
- **Secrets:** `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`. Set `JWT_ACCESS_SECRET` and `SESSION_SECRET` to two **different** values. The server validates all variables at startup and exits with a clear message if something is missing or unsafe.

## Configuration defaults

| Variable                         | Default | Meaning                                                |
| -------------------------------- | ------- | ------------------------------------------------------ |
| `ROOM_WAITING_TTL_MINUTES`       | 30      | Waiting room expires if nobody joins                   |
| `ROOM_IDLE_TTL_MINUTES`          | 120     | Active room expires after this much inactivity         |
| `PLAYER_RECONNECT_GRACE_SECONDS` | 90      | Seat held for a disconnected player                    |
| `ROOM_SWEEP_INTERVAL_SECONDS`    | 10      | How often expiry and timeout rules run                 |
| `ENDED_ROOM_RETENTION_DAYS`      | 7       | Ended rooms deleted afterwards (TTL index)             |
| `SESSION_TTL_DAYS`               | 7       | How long a browser remembers its player name (sliding) |
| `CHAT_ENABLED`                   | true    | In-room chat feature flag                              |

## Testing

```bash
npm test              # shared engines + server (unit & integration) + client (RTL)
npm run e2e:install   # once: downloads Playwright Chromium
npm run test:e2e      # boots server (in-memory DB) + client, runs two-browser scenarios
npm run verify        # lint + typecheck + tests + production build
```

| Suite         | Covers                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `shared` (68) | Rules for all 12 games: wins, draws, illegal moves, Reversi flips/passes, Ultimate TTT sending, Mancala sowing/captures/seed conservation, Hex chains, RPS scoring, quiz scoring, Memory pairs, plus redaction of secrets                                                                                                                                                                          |
| `server` (68) | Room lifecycle, next-game voting (rematch, switch, counter-proposal, mid-round switch), hidden-information snapshots, anonymous sessions (cookie, refresh, expiry, revoke, CSRF header, rate limit), and Socket.IO integration: join/full/invalid, unauthorized and out-of-turn moves, duplicate and stale moves, simultaneous moves, win/draw persistence, reconnection, expiry, restart recovery |
| `client` (44) | Landing and create/join validation, waiting room, every board's interaction rules, turn/result rendering, rematch and game switching, co-op results, locked-in states, connection banner                                                                                                                                                                                                           |
| `e2e` (3)     | Two browsers: full match → rematch → refresh → disconnect/reconnect; third player and invalid code rejected; change the game while waiting, switch mid-round to RPS and verify picks stay hidden                                                                                                                                                                                                   |

## Production build & deployment

```bash
npm run build        # server → server/dist (bundled ESM), client → client/dist (static)
npm start            # node server/dist/server.js (reads server/.env)
```

**Server** (Render, Railway, Fly.io, a VPS: any host with WebSocket support): set `NODE_ENV=production`, `MONGODB_URI` (Atlas), strong secrets, `CLIENT_ORIGIN=https://your-client-domain`, and `TRUST_PROXY=1` behind a proxy. Health check: `GET /api/health`. Run a **single instance** (see [Scaling](docs/ARCHITECTURE.md#scaling)).

**Client** (Netlify, Vercel, Cloudflare Pages…): publish `client/dist` with an SPA fallback so `/room/ABC234` links work. Either proxy `/api` and `/socket.io` to the server on the same domain (recommended), or build with `VITE_API_BASE_URL` / `VITE_SOCKET_URL` and run the server with `COOKIE_SAMESITE=none` and `COOKIE_SECURE=true`.

## Limitations & next steps

- Single server instance only (a Redis adapter, sticky sessions and a distributed lock are needed to scale out).
- Chat is ephemeral (in memory) and lost on restart. No spectators.
- No accounts means no long-term stats; match results are kept 30 days for auditing only.
- Ideas: more question packs (spicy and deep-talk modes for couples), word games, drawing/guessing, an AI practice opponent, move timers, dark mode.
