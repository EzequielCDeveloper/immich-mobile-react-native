import type {
  MediaAlbum,
  MediaAssetMetadata,
  MediaLibraryService,
} from '@/lib/media/contracts';
import { fetchAlbumCount, type AlbumCountResult, AlbumCountCache } from '@/lib/albums/album-count';

export type AlbumCardState = 'pending' | 'ready' | 'error';

export type AlbumCardModel = MediaAlbum & {
  state: AlbumCardState;
  count: number | null;
  cover: MediaAssetMetadata | null;
  error?: string;
};

export const albumCountCache = new AlbumCountCache();

export const albumCatalogConcurrency = 4;

export function createAlbumCards(
  albums: MediaAlbum[],
  previous: AlbumCardModel[] = []
): AlbumCardModel[] {
  const previousById = new Map(previous.map((card) => [card.id, card]));
  return albums.map((album) => {
    const existing = previousById.get(album.id);
    return existing ? { ...existing, title: album.title } : { ...album, state: 'pending', count: null, cover: null };
  });
}

export async function resolveAlbumCard(
  service: MediaLibraryService,
  album: MediaAlbum,
  revision: number,
  scope: 'all' | 'limited',
  signal?: AbortSignal
): Promise<AlbumCountResult> {
  assertAlbumReadIsCurrent(service, revision, signal);
  const cached = albumCountCache.get(album.id, revision, scope);
  if (cached) {
    return cached;
  }
  const result = await fetchAlbumCount(service, album.id, revision, scope, signal);
  assertAlbumReadIsCurrent(service, revision, signal);
  albumCountCache.set(album.id, revision, scope, result);
  return result;
}

function assertAlbumReadIsCurrent(
  service: MediaLibraryService,
  revision: number,
  signal?: AbortSignal
): void {
  if (signal?.aborted) {
    throw new Error('Album metadata became stale before the count completed');
  }
  if (service.revisionClock.value !== revision) {
    throw new Error('Album metadata became stale before the count completed');
  }
}

export async function mapWithConcurrency<T, R>(
  values: T[],
  limit: number,
  mapper: (value: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(values.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (true) {
      const index = nextIndex++;
      if (index >= values.length) {
        return;
      }
      results[index] = await mapper(values[index]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, () => worker()));
  return results;
}
