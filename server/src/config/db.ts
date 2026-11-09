import mongoose from 'mongoose';
import { logger } from '../utils/logger';
import { GameMove } from '../models/GameMove';
import { GameRoom } from '../models/GameRoom';
import { MatchResult } from '../models/MatchResult';
import { PlayerSession } from '../models/PlayerSession';

export interface DatabaseHandle {
  uri: string;
  disconnect: () => Promise<void>;
}

/**
 * Connects Mongoose. `memory` starts an ephemeral in-memory MongoDB (requires the
 * dev dependency `mongodb-memory-server`) so the app can run without a local install.
 */
export async function connectDatabase(uri: string, dbName?: string): Promise<DatabaseHandle> {
  let stopMemory: (() => Promise<unknown>) | null = null;
  let target = uri;

  if (uri === 'memory') {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    const memory = await MongoMemoryServer.create();
    target = memory.getUri();
    stopMemory = () => memory.stop();
    logger.warn('Using an in-memory MongoDB. Data is lost when the server stops.');
  }

  mongoose.set('strictQuery', true);
  await mongoose.connect(target, { dbName, serverSelectionTimeoutMS: 10_000 });
  await ensureIndexes();
  logger.info({ db: mongoose.connection.name }, 'MongoDB connected');

  return {
    uri: target,
    disconnect: async () => {
      await mongoose.disconnect();
      if (stopMemory) await stopMemory();
    },
  };
}

/** Builds indexes up-front so unique constraints (dedupe, room codes) are enforced immediately. */
export async function ensureIndexes(): Promise<void> {
  await Promise.all(
    [PlayerSession, GameRoom, GameMove, MatchResult].map((model) => model.createIndexes()),
  );
}

export function isDatabaseReady(): boolean {
  return mongoose.connection.readyState === 1;
}
