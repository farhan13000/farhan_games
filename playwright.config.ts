import { defineConfig, devices } from '@playwright/test';

const SERVER_PORT = 5100;
const CLIENT_PORT = 5190;

/**
 * Boots the real server (with an ephemeral in-memory MongoDB) and the Vite client
 * on dedicated ports, then drives two independent browser contexts.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${CLIENT_PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'npx tsx server/src/server.ts',
      url: `http://localhost:${SERVER_PORT}/api/health`,
      timeout: 180_000,
      reuseExistingServer: false,
      env: {
        NODE_ENV: 'development',
        LOG_LEVEL: 'warn',
        PORT: String(SERVER_PORT),
        CLIENT_ORIGIN: `http://localhost:${CLIENT_PORT}`,
        MONGODB_URI: 'memory',
        JWT_ACCESS_SECRET: 'e2e-access-secret-0123456789-abcdefghijklmnop',
        SESSION_SECRET: 'e2e-session-secret-0123456789-abcdefghijklmn',
        RATE_LIMIT_ENABLED: 'false',
        PLAYER_RECONNECT_GRACE_SECONDS: '60',
      },
    },
    {
      command: `npm run dev -w client -- --port ${CLIENT_PORT} --strictPort`,
      url: `http://localhost:${CLIENT_PORT}`,
      timeout: 120_000,
      reuseExistingServer: false,
      env: { VITE_DEV_PROXY_TARGET: `http://localhost:${SERVER_PORT}` },
    },
  ],
});
