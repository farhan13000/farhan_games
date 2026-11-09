import 'dotenv/config';
import { connectDatabase } from './config/db';
import { ConfigError, loadConfig } from './config/env';
import { createArenaServer } from './createServer';
import { logger } from './utils/logger';

async function main() {
  const config = loadConfig();
  const db = await connectDatabase(config.mongoUri);
  const server = createArenaServer(config);
  const port = await server.start();
  logger.info(
    { port, origins: config.clientOrigins, env: config.env },
    'TicTac Arena server listening',
  );

  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'Shutting down');
    const force = setTimeout(() => process.exit(1), 10_000);
    force.unref();
    try {
      await server.stop();
      await db.disconnect();
      process.exit(0);
    } catch (err) {
      logger.error({ err }, 'Error during shutdown');
      process.exit(1);
    }
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  if (err instanceof ConfigError) {
    // Clear, actionable configuration failure without a stack trace.
    console.error(`\n${err.message}\n\nCopy server/.env.example to server/.env and fill it in.\n`);
  } else {
    logger.fatal({ err }, 'Failed to start server');
  }
  process.exit(1);
});
