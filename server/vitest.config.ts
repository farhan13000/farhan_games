import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    globalSetup: ['tests/globalSetup.ts'],
    env: { NODE_ENV: 'test', LOG_LEVEL: 'silent' },
    testTimeout: 20_000,
    hookTimeout: 120_000,
    fileParallelism: true,
  },
});
