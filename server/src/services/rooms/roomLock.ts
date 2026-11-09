/**
 * Per-key async mutex. All mutations of a room are serialized through it so two
 * near-simultaneous moves can never interleave read-modify-write cycles.
 * (Single-instance only; the stateVersion check in the repository guards the DB.)
 */
export class KeyedMutex {
  private readonly tails = new Map<string, Promise<unknown>>();

  async run<T>(key: string, task: () => Promise<T>): Promise<T> {
    const previous = this.tails.get(key) ?? Promise.resolve();
    const current = previous.catch(() => undefined).then(task);
    this.tails.set(key, current);
    try {
      return await current;
    } finally {
      if (this.tails.get(key) === current) this.tails.delete(key);
    }
  }
}
