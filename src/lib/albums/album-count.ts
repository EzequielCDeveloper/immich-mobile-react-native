import type {
  MediaAssetMetadata,
  MediaLibraryService,
} from '@/lib/media/contracts';
import { loadAllMetadata } from '@/lib/media/query-adapter';

export type AlbumCountResult = {
  count: number;
  cover: MediaAssetMetadata | null;
};

export class AlbumCountCache {
  private readonly values = new Map<string, AlbumCountResult>();

  get(id: string, revision: number, scope: 'all' | 'limited'): AlbumCountResult | undefined {
    return this.values.get(this.key(id, revision, scope));
  }

  set(
    id: string,
    revision: number,
    scope: 'all' | 'limited',
    value: AlbumCountResult
  ): void {
    this.values.set(this.key(id, revision, scope), value);
  }

  clear(): void {
    this.values.clear();
  }

  private key(id: string, revision: number, scope: 'all' | 'limited'): string {
    return `${id}:${scope}:${revision}`;
  }
}

export async function fetchAlbumCount(
  service: MediaLibraryService,
  albumId: string,
  revision: number,
  scope: 'all' | 'limited',
  signal?: AbortSignal
): Promise<AlbumCountResult> {
  const assets = await loadAllMetadata(service, {
    pageSize: 100,
    revision,
    scope,
    albumId,
    signal,
  });
  return { count: assets.length, cover: assets[0] ?? null };
}
