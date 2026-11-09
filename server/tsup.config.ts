import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/server.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node20',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  // The shared workspace package is TypeScript source; bundle it into the output.
  noExternal: ['@arena/shared'],
  // Dev-only packages, loaded lazily at runtime and never bundled.
  external: ['mongodb-memory-server', 'pino-pretty'],
});
