import type { RevisionClock } from '@/lib/media/revision';
import type { PermissionSnapshot } from '@/lib/media/permission-state';

export type MediaType = 'image' | 'video';
export type MediaTypeFilter = MediaType | 'all';
export type MediaScope = 'all' | 'limited';

export type MediaAssetMetadata = {
  id: string;
  filename: string;
  mediaType: MediaType;
  creationTime: number | null;
  modificationTime: number | null;
  width: number | null;
  height: number | null;
  duration: number | null;
  isFavorite: boolean;
  uri?: string | null;
  albumIds?: string[];
  sizeBytes?: number | null;
};

export type MediaAssetDetails = Omit<MediaAssetMetadata, 'uri'> & {
  uri: string | null;
  isAvailable: boolean;
  unavailableReason?: string;
};

export type MetadataPageRequest = {
  pageSize: number;
  offset: number;
  cursor: string | null;
  revision: number;
  scope: MediaScope;
  albumId?: string;
  favoriteOnly?: boolean;
  filenameContains?: string;
  mediaType?: MediaTypeFilter;
  signal?: AbortSignal;
};

export type MetadataPage = {
  assets: MediaAssetMetadata[];
  pageSize: number;
  offset: number;
  cursor: string | null;
  nextCursor: string | null;
  hasMore: boolean;
  revision: number;
  scope: MediaScope;
};

export type MediaAlbum = {
  id: string;
  title: string;
};

export type LibraryEvent = {
  hasIncrementalChanges: boolean;
  insertedIds: string[];
  deletedIds: string[];
  updatedIds: string[];
};

export type StorageEstimate = {
  status: 'available' | 'unavailable';
  bytes: number | null;
  source: 'metadata';
  reason?: string;
};

export interface MediaLibraryService {
  readonly availability: 'available' | 'unavailable';
  readonly unavailableReason?: string;
  readonly revisionClock: RevisionClock;
  getPermission(): Promise<PermissionSnapshot>;
  requestPermission(): Promise<PermissionSnapshot>;
  presentPermissionsPicker(): Promise<PermissionSnapshot>;
  subscribe(listener: (event: LibraryEvent) => void): () => void;
  queryMetadata(request: MetadataPageRequest): Promise<MetadataPage>;
  getAlbums(): Promise<MediaAlbum[]>;
  createAlbum(title: string, initialAssetId?: string): Promise<MediaAlbum>;
  renameAlbum(albumId: string, newTitle: string): Promise<MediaAlbum>;
  deleteAlbum(albumId: string): Promise<void>;
  addAssetToAlbum(assetId: string, albumId: string): Promise<void>;
  deleteAsset(id: string): Promise<void>;
  getAsset(id: string): Promise<MediaAssetDetails | null>;
  setFavorite(id: string, isFavorite: boolean): Promise<void>;
  getStorageEstimate(): Promise<StorageEstimate>;
}

export function dedupeAssets(assets: MediaAssetMetadata[]): MediaAssetMetadata[] {
  const seen = new Set<string>();
  return assets.filter((asset) => {
    if (seen.has(asset.id)) {
      return false;
    }
    seen.add(asset.id);
    return true;
  });
}

export function sortAssetsNewestFirst(assets: MediaAssetMetadata[]): MediaAssetMetadata[] {
  return [...assets].sort((left, right) => {
    const leftTime = left.creationTime ?? Number.NEGATIVE_INFINITY;
    const rightTime = right.creationTime ?? Number.NEGATIVE_INFINITY;
    return rightTime - leftTime || left.id.localeCompare(right.id);
  });
}

export function createPage(
  assets: MediaAssetMetadata[],
  request: MetadataPageRequest,
  hasMore: boolean,
  nextCursor: string | null = null
): MetadataPage {
  return {
    assets: dedupeAssets(assets),
    pageSize: request.pageSize,
    offset: request.offset,
    cursor: request.cursor,
    nextCursor,
    hasMore,
    revision: request.revision,
    scope: request.scope,
  };
}
