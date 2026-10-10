import {
  dedupeAssets,
  type MediaLibraryService,
  type MetadataPage,
  type MetadataPageRequest,
} from '@/lib/media/contracts';
import { loadAllMetadata } from '@/lib/media/query-adapter';

export async function searchMetadata(
  service: MediaLibraryService,
  request: MetadataPageRequest
): Promise<MetadataPage> {
  const allAssets = await loadAllMetadata(service, {
    pageSize: 100,
    revision: request.revision,
    scope: request.scope,
    favoriteOnly: request.favoriteOnly,
    albumId: request.albumId,
    mediaType: request.mediaType,
    signal: request.signal,
  });
  const query = request.filenameContains?.trim().toLocaleLowerCase() ?? '';
  const matches = dedupeAssets(
    allAssets.filter(
      (asset) =>
        (!request.mediaType || request.mediaType === 'all' || asset.mediaType === request.mediaType) &&
        asset.filename.toLocaleLowerCase().includes(query)
    )
  );
  const assets = matches.slice(request.offset, request.offset + request.pageSize);

  return {
    assets,
    pageSize: request.pageSize,
    offset: request.offset,
    cursor: request.cursor,
    nextCursor: null,
    hasMore: request.offset + request.pageSize < matches.length,
    revision: request.revision,
    scope: request.scope,
  };
}

export function searchIndexLabel(query: string, count: number): string {
  if (!query.trim()) {
    return `${count} local items`;
  }
  return `${count} result${count === 1 ? '' : 's'}`;
}
