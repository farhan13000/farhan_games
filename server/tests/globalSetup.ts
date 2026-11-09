import { MongoMemoryServer } from 'mongodb-memory-server';
import type { GlobalSetupContext } from 'vitest/node';

let mongod: MongoMemoryServer | undefined;

/** One in-memory MongoDB for the whole run; each test file uses its own database. */
export default async function setup({ provide }: GlobalSetupContext) {
  mongod = await MongoMemoryServer.create();
  provide('mongoUri', mongod.getUri());
  return async () => {
    await mongod?.stop();
  };
}

declare module 'vitest' {
  export interface ProvidedContext {
    mongoUri: string;
  }
}
