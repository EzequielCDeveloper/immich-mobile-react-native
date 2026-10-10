import { sortAssetsNewestFirst, type MediaAssetMetadata, type MediaLibraryService, type MetadataPageRequest } from '@/lib/media/contracts';

export function normalizeMetadataAsset(value: Partial<MediaAssetMetadata> & { id: string }): MediaAssetMetadata | null {
  if (value.mediaType !== 'image' && value.mediaType !== 'video') {
    return null;
  }

  return {
    id: value.id,
    filename: value.filename ?? 'Untitled media',
    mediaType: value.mediaType,
    creationTime: value.creationTime ?? null,
    modificationTime: value.modificationTime ?? null,
    width: value.width ?? null,
    height: value.height ?? null,
    duration: value.duration ?? null,
    isFavorite: value.isFavorite ?? false,
    ...(value.uri ? { uri: value.uri } : {}),
    ...(value.albumIds ? { albumIds: value.albumIds } : {}),
    ...(value.sizeBytes !== undefined ? { sizeBytes: value.sizeBytes } : {}),
  };
}

export function assertCurrentRequest(request: Pick<MetadataPageRequest, 'signal'>): void {
  if (request.signal?.aborted) {
    throw new Error('Media query was cancelled');
  }
}

export async function loadAllMetadata(
  service: MediaLibraryService,
  request: Omit<MetadataPageRequest, 'offset' | 'cursor'> & { pageSize?: number }
): Promise<MediaAssetMetadata[]> {
  const assets: MediaAssetMetadata[] = [];
  const seen = new Set<string>();
  const pageSize = request.pageSize ?? 100;
  let offset = 0;
  let cursor: string | null = null;
  let hasMore = true;

  while (hasMore) {
    assertCurrentRequest(request);
    if (service.revisionClock.value !== request.revision) {
      throw new Error('Media metadata became stale before the exhaustive read completed');
    }
    const page = await service.queryMetadata({
      ...request,
      pageSize,
      offset,
      cursor,
    });
    if (service.revisionClock.value !== request.revision) {
      throw new Error('Media metadata became stale before the exhaustive read completed');
    }
    assertCurrentRequest(request);
    for (const asset of page.assets) {
      if (!seen.has(asset.id)) {
        seen.add(asset.id);
        assets.push(asset);
      }
    }
    hasMore = page.hasMore;
    cursor = page.nextCursor;
    offset += page.pageSize;
    if (page.assets.length === 0 && page.hasMore) {
      throw new Error('Media source returned an empty page while reporting more data');
    }
  }

  assertCurrentRequest(request);
  return sortAssetsNewestFirst(assets);
}
