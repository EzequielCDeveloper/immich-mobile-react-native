import {
  createPage,
  sortAssetsNewestFirst,
  type LibraryEvent,
  type MediaAlbum,
  type MediaAssetDetails,
  type MediaAssetMetadata,
  type MediaLibraryService,
  type MetadataPageRequest,
  type StorageEstimate,
} from '@/lib/media/contracts';
import {
  permissionSnapshotFromResponse,
  type PermissionSnapshot,
} from '@/lib/media/permission-state';
import { RevisionClock } from '@/lib/media/revision';
import { assertCurrentRequest } from '@/lib/media/query-adapter';

export type InMemoryServiceOptions = {
  assets?: MediaAssetMetadata[];
  albums?: MediaAlbum[];
  permission?: PermissionSnapshot;
  delayMs?: number;
  failQueries?: boolean;
  failAlbums?: boolean;
};

const defaultPermission = permissionSnapshotFromResponse({
  status: 'granted',
  granted: true,
  canAskAgain: true,
  accessPrivileges: 'all',
});

export class InMemoryMediaLibraryService implements MediaLibraryService {
  readonly availability = 'available' as const;
  readonly revisionClock = new RevisionClock();
  private assets: MediaAssetMetadata[];
  private albums: MediaAlbum[];
  private permission: PermissionSnapshot;
  private readonly options: InMemoryServiceOptions;
  private readonly listeners = new Set<(event: LibraryEvent) => void>();

  constructor(options: InMemoryServiceOptions = {}) {
    this.assets = [...(options.assets ?? [])];
    this.albums = [...(options.albums ?? [])];
    this.permission = options.permission ?? defaultPermission;
    this.options = options;
  }

  async getPermission(): Promise<PermissionSnapshot> {
    await this.wait();
    return this.permission;
  }

  async requestPermission(): Promise<PermissionSnapshot> {
    await this.wait();
    return this.permission;
  }

  async presentPermissionsPicker(): Promise<PermissionSnapshot> {
    await this.wait();
    return this.permission;
  }

  subscribe(listener: (event: LibraryEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async queryMetadata(request: MetadataPageRequest) {
    assertCurrentRequest(request);
    await this.wait(request.signal);
    if (this.options.failQueries) {
      throw new Error('The in-memory media source failed as requested.');
    }
    const search = request.filenameContains?.trim().toLocaleLowerCase();
    const filtered = sortAssetsNewestFirst(this.assets).filter((asset) => {
      const matchesAlbum = !request.albumId || asset.albumIds?.includes(request.albumId);
      const matchesFavorite = !request.favoriteOnly || asset.isFavorite;
      const matchesMediaType =
        !request.mediaType || request.mediaType === 'all' || asset.mediaType === request.mediaType;
      const matchesFilename = !search || asset.filename.toLocaleLowerCase().includes(search);
      return matchesAlbum && matchesFavorite && matchesMediaType && matchesFilename;
    });
    const assets = filtered.slice(request.offset, request.offset + request.pageSize);
    return createPage(assets, request, request.offset + request.pageSize < filtered.length);
  }

  async getAlbums(): Promise<MediaAlbum[]> {
    await this.wait();
    if (this.options.failAlbums) {
      throw new Error('The in-memory album source failed as requested.');
    }
    return [...this.albums];
  }

  async createAlbum(title: string, initialAssetId?: string): Promise<MediaAlbum> {
    await this.wait();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      throw new Error('Album title cannot be empty.');
    }
    const exists = this.albums.some(
      (a) => a.title.trim().toLowerCase() === trimmedTitle.toLowerCase()
    );
    if (exists) {
      throw new Error(`An album named "${trimmedTitle}" already exists.`);
    }
    const id = `album-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const album: MediaAlbum = { id, title: trimmedTitle };
    this.albums.push(album);
    if (initialAssetId) {
      const asset = this.assets.find((candidate) => candidate.id === initialAssetId);
      if (asset) {
        asset.albumIds = [...(asset.albumIds ?? []), id];
      }
    }
    this.revisionClock.bump('album-create');
    return album;
  }

  async renameAlbum(albumId: string, newTitle: string): Promise<MediaAlbum> {
    await this.wait();
    const trimmedTitle = newTitle.trim();
    if (!trimmedTitle) {
      throw new Error('Album title cannot be empty.');
    }
    const exists = this.albums.some(
      (a) => a.id !== albumId && a.title.trim().toLowerCase() === trimmedTitle.toLowerCase()
    );
    if (exists) {
      throw new Error(`An album named "${trimmedTitle}" already exists.`);
    }
    const album = this.albums.find((a) => a.id === albumId);
    if (!album) {
      throw new Error(`Album with ID ${albumId} not found.`);
    }
    album.title = trimmedTitle;
    this.revisionClock.bump('album-change');
    return album;
  }

  async deleteAlbum(albumId: string): Promise<void> {
    await this.wait();
    this.albums = this.albums.filter((a) => a.id !== albumId);
    for (const asset of this.assets) {
      if (asset.albumIds) {
        asset.albumIds = asset.albumIds.filter((id) => id !== albumId);
      }
    }
    this.revisionClock.bump('album-change');
  }

  async addAssetToAlbum(assetId: string, albumId: string): Promise<void> {
    await this.wait();
    const asset = this.assets.find((candidate) => candidate.id === assetId);
    if (!asset) {
      throw new Error(`Asset ${assetId} was not found.`);
    }
    const current = asset.albumIds ?? [];
    if (!current.includes(albumId)) {
      asset.albumIds = [...current, albumId];
    }
    this.revisionClock.bump('album-asset-add');
  }

  async deleteAsset(id: string): Promise<void> {
    await this.wait();
    this.assets = this.assets.filter((candidate) => candidate.id !== id);
    this.revisionClock.bump('asset-delete');
  }

  async getAsset(id: string): Promise<MediaAssetDetails | null> {
    await this.wait();
    const asset = this.assets.find((candidate) => candidate.id === id);
    if (!asset) {
      return null;
    }
    return {
      ...asset,
      uri: asset.uri ?? null,
      isAvailable: Boolean(asset.uri),
      ...(asset.uri ? {} : { unavailableReason: 'The deterministic in-memory source has no device file.' }),
    };
  }

  async setFavorite(id: string, isFavorite: boolean): Promise<void> {
    const asset = this.assets.find((candidate) => candidate.id === id);
    if (!asset) {
      throw new Error('Media asset was not found.');
    }
    asset.isFavorite = isFavorite;
    this.revisionClock.bump('favorite-change');
  }

  async getStorageEstimate(): Promise<StorageEstimate> {
    const values = this.assets.map((asset) => asset.sizeBytes);
    const knownSizes = values.filter((size): size is number => typeof size === 'number');
    if (knownSizes.length !== values.length) {
      return {
        status: 'unavailable',
        bytes: null,
        source: 'metadata',
        reason: 'One or more metadata records do not include a size.',
      };
    }
    return {
      status: 'available',
      bytes: knownSizes.reduce((total, size) => total + size, 0),
      source: 'metadata',
    };
  }

  emitLibraryChange(event: LibraryEvent): void {
    this.revisionClock.bump('library-event');
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  setPermission(permission: PermissionSnapshot): void {
    this.permission = permission;
    this.revisionClock.bump('permission-transition');
  }

  private async wait(signal?: AbortSignal): Promise<void> {
    if (!this.options.delayMs) {
      assertCurrentRequest({ signal } as MetadataPageRequest);
      return;
    }
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, this.options.delayMs);
      if (signal) {
        signal.addEventListener(
          'abort',
          () => {
            clearTimeout(timer);
            reject(new Error('Media query was cancelled'));
          },
          { once: true }
        );
      }
    });
    if (signal?.aborted) {
      throw new Error('Media query was cancelled');
    }
  }
}
