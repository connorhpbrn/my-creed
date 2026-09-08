/** Serializes writes for each document without delaying unrelated documents. */
export class DocumentWriteQueue {
  private readonly pending = new Map<string, Promise<unknown>>();

  run<T>(creedId: string, operation: () => Promise<T>): Promise<T> {
    const previous = this.pending.get(creedId) ?? Promise.resolve();
    const result = previous.catch(() => undefined).then(operation);
    this.pending.set(creedId, result);
    void result.finally(() => {
      if (this.pending.get(creedId) === result) this.pending.delete(creedId);
    }).catch(() => undefined);
    return result;
  }

  async drain(creedId: string): Promise<void> {
    while (this.pending.has(creedId)) await this.pending.get(creedId);
  }
}
