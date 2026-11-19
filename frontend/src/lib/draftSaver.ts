export const AUTOSAVE_INTERVAL_MS = 10_000;

export class DraftSaver<T> {
  private revision = 0;
  private savedRevision = 0;
  private queue: Promise<void> = Promise.resolve();

  constructor(private readonly write: (snapshot: T) => Promise<void>) {}

  get dirty(): boolean {
    return this.revision !== this.savedRevision;
  }

  changed(): void {
    this.revision += 1;
  }

  save(snapshot: () => T, force = false): Promise<boolean> {
    const operation = this.queue.then(async () => {
      if (!force && !this.dirty) return false;
      const revision = this.revision;
      const value = snapshot();
      await this.write(value);
      this.savedRevision = revision;
      return true;
    });
    this.queue = operation.then(() => undefined, () => undefined);
    return operation;
  }
}
