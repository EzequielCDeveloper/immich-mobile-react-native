export type RevisionReason =
  | 'initial-load'
  | 'permission-recheck'
  | 'permission-transition'
  | 'library-event'
  | 'favorite-change'
  | 'manual-refresh'
  | 'album-change'
  | 'album-create'
  | 'album-asset-add'
  | 'asset-delete';

export class RevisionClock {
  private current = 0;
  private readonly listeners = new Set<(revision: number, reason: RevisionReason) => void>();

  get value(): number {
    return this.current;
  }

  bump(reason: RevisionReason): number {
    this.current += 1;
    for (const listener of this.listeners) {
      listener(this.current, reason);
    }
    return this.current;
  }

  subscribe(listener: (revision: number, reason: RevisionReason) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
