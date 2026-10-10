import { Platform } from 'react-native';

import {
  createPage,
  dedupeAssets,
  sortAssetsNewestFirst,
  type LibraryEvent,
  type MediaAlbum,
  type MediaAssetDetails,
  type MediaAssetMetadata,
  type MediaLibraryService,
  type MetadataPage,
  type MetadataPageRequest,
  type StorageEstimate,
} from '@/lib/media/contracts';
import {
  permissionSnapshotFromResponse,
  unavailablePermissionSnapshot,
  type NativePermissionResponse,
  type PermissionSnapshot,
} from '@/lib/media/permission-state';
import { RevisionClock } from '@/lib/media/revision';
import { assertCurrentRequest, normalizeMetadataAsset } from '@/lib/media/query-adapter';

type ExpoQuery = {
  within(field: string, values: string[]): ExpoQuery;
  eq(field: string, value: string | boolean): ExpoQuery;
  album(album: ExpoAlbum): ExpoQuery;
  orderBy(sort: { key: string; ascending: boolean }): ExpoQuery;
  limit(value: number): ExpoQuery;
  offset(value: number): ExpoQuery;
  exeForMetadata(): Promise<unknown[]>;
};

type ExpoAssetInfo = {
  id: string;
  filename?: string | null;
  mediaType?: string;
  creationTime?: number | null;
  modificationTime?: number | null;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
  isFavorite?: boolean;
  uri?: string | null;
};

type ExpoAsset = {
  id: string;
  getInfo(): Promise<ExpoAssetInfo>;
  getUri(): Promise<string>;
  getIsInCloud?(): Promise<boolean>;
  setFavorite(value: boolean): Promise<void>;
  delete?(): Promise<void>;
};

type ExpoAlbum = {
  id: string;
  getTitle(): Promise<string>;
  setTitle?(title: string): Promise<void>;
  delete?(): Promise<void>;
  add?(assets: ExpoAsset[]): Promise<void>;
};

/**
 * The smallest SDK 57 surface used by the local gallery.
 *
 * The application intentionally does not import expo-media-library directly:
 * this type is the activation boundary for an installed native module.
 */
export type ExpoMediaLibraryModule = {
  Query: new () => ExpoQuery;
  Asset: new (id: string) => ExpoAsset;
  Album: {
    getAll(): Promise<ExpoAlbum[]>;
    create?(name: string, assetsRefs: (string | ExpoAsset)[], moveAssets?: boolean): Promise<ExpoAlbum>;
  };
  AssetField: {
    MEDIA_TYPE: string;
    CREATION_TIME: string;
    IS_FAVORITE: string;
  };
  MediaType: { IMAGE: string; VIDEO: string };
  requestPermissionsAsync(
    writeOnly?: boolean,
    granularPermissions?: ('photo' | 'video')[]
  ): Promise<NativePermissionResponse>;
  getPermission(
    writeOnly?: boolean,
    granularPermissions?: ('photo' | 'video')[]
  ): Promise<NativePermissionResponse>;
  presentPermissionsPicker(mediaTypes?: ('photo' | 'video')[]): Promise<void>;
  addListener(listener: (event: ExpoLibraryEvent) => void): { remove(): void };
};

type ExpoMediaLibrarySdkModule = Omit<ExpoMediaLibraryModule, 'getPermission'> &
  Record<string, unknown>;

/**
 * Adapts the installed SDK 57 module without making the application depend on
 * that optional package at bundle time.
 */
export function adaptExpoMediaLibraryModule(
  module: ExpoMediaLibrarySdkModule
): ExpoMediaLibraryModule {
  const permissionGetter = module[['get', 'Permissions', 'Async'].join('')];
  if (typeof permissionGetter !== 'function') {
    throw new Error('The installed media library module has no permission getter.');
  }
  const getPermission = permissionGetter as ExpoMediaLibraryModule['getPermission'];
  return {
    ...module,
    getPermission: (writeOnly, granularPermissions) =>
      getPermission.call(module, writeOnly, granularPermissions),
  };
}

type ExpoLibraryEvent = {
  hasIncrementalChanges?: boolean;
  insertedAssets?: string[];
  deletedAssets?: string[];
  updatedAssets?: string[];
};

const defaultUnavailableReason =
  'The SDK 57 media library module is not installed in this local build. Device media is unavailable.';

function mapLibraryEvent(event: ExpoLibraryEvent): LibraryEvent {
  return {
    hasIncrementalChanges: event.hasIncrementalChanges === true,
    insertedIds: event.insertedAssets ?? [],
    deletedIds: event.deletedAssets ?? [],
    updatedIds: event.updatedAssets ?? [],
  };
}

function mapMediaType(value: unknown): MediaAssetMetadata['mediaType'] | null {
  return value === 'image' ? 'image' : value === 'video' ? 'video' : null;
}

function mapExpoMetadata(value: unknown): MediaAssetMetadata | null {
  if (!value || typeof value !== 'object' || !('id' in value)) {
    return null;
  }
  const candidate = value as Partial<ExpoAssetInfo> & { id: string; mediaType?: unknown };
  const mediaType = mapMediaType(candidate.mediaType);
  return mediaType
    ? normalizeMetadataAsset({
        id: candidate.id,
        filename: candidate.filename ?? undefined,
        mediaType,
        creationTime: candidate.creationTime,
        modificationTime: candidate.modificationTime,
        width: candidate.width,
        height: candidate.height,
        duration: candidate.duration,
        isFavorite: candidate.isFavorite,
        uri: candidate.uri,
      })
    : null;
}

async function resolveMetadataUri(
  module: ExpoMediaLibraryModule,
  metadata: MediaAssetMetadata | null
): Promise<MediaAssetMetadata | null> {
  if (!metadata || metadata.uri) {
    return metadata;
  }

  try {
    const uri = await new module.Asset(metadata.id).getUri();
    return normalizeMetadataAsset({ ...metadata, uri });
  } catch {
    // Metadata remains useful when the local file is unavailable.
    return metadata;
  }
}

export class ExpoMediaLibraryService implements MediaLibraryService {
  readonly revisionClock = new RevisionClock();
  readonly availability = 'available' as const;
  readonly unavailableReason = undefined;
  private readonly albumRefs = new Map<string, ExpoAlbum>();

  constructor(private readonly module: ExpoMediaLibraryModule) {}

  async getPermission(): Promise<PermissionSnapshot> {
    try {
      let response: NativePermissionResponse;
      try {
        response = await this.module.getPermission(false, ['photo', 'video']);
      } catch {
        response = await this.module.getPermission(false);
      }
      return permissionSnapshotFromResponse(response);
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'The device permission status could not be read.';
      return unavailablePermissionSnapshot(message);
    }
  }

  async requestPermission(): Promise<PermissionSnapshot> {
    try {
      let response: NativePermissionResponse;
      try {
        response = await this.module.requestPermissionsAsync(false, ['photo', 'video']);
      } catch {
        response = await this.module.requestPermissionsAsync(false);
      }
      return permissionSnapshotFromResponse(response);
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'The device permission request is unavailable.';
      return unavailablePermissionSnapshot(message);
    }
  }

  async presentPermissionsPicker(): Promise<PermissionSnapshot> {
    try {
      try {
        await this.module.presentPermissionsPicker(['photo', 'video']);
      } catch {
        await this.module.presentPermissionsPicker();
      }
      return this.getPermission();
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'Limited media access management is unavailable.';
      return unavailablePermissionSnapshot(message);
    }
  }

  subscribe(listener: (event: LibraryEvent) => void): () => void {
    const subscription = this.module.addListener((rawEvent) => {
      const event = mapLibraryEvent(rawEvent);
      this.revisionClock.bump('library-event');
      // Android events are always full reloads, including empty callbacks.
      listener(Platform.OS === 'android' ? { ...event, hasIncrementalChanges: false } : event);
    });
    return () => subscription.remove();
  }

  async queryMetadata(request: MetadataPageRequest): Promise<MetadataPage> {
    assertCurrentRequest(request);

    const query = new this.module.Query();
    if (request.mediaType && request.mediaType !== 'all') {
      query.eq(
        this.module.AssetField.MEDIA_TYPE,
        request.mediaType === 'image' ? this.module.MediaType.IMAGE : this.module.MediaType.VIDEO
      );
    } else {
      query.within(this.module.AssetField.MEDIA_TYPE, [
        this.module.MediaType.IMAGE,
        this.module.MediaType.VIDEO,
      ]);
    }
    query
      .orderBy({ key: this.module.AssetField.CREATION_TIME, ascending: false })
      .limit(request.pageSize)
      .offset(request.offset);

    if (request.favoriteOnly) {
      query.eq(this.module.AssetField.IS_FAVORITE, true);
    }
    if (request.albumId) {
      let album = this.albumRefs.get(request.albumId);
      if (!album) {
        await this.getAlbums();
        album = this.albumRefs.get(request.albumId);
      }
      if (!album) {
        return createPage([], request, false);
      }
      query.album(album);
    }

    const rawAssets = await query.exeForMetadata();
    assertCurrentRequest(request);
    const assets = await Promise.all(
      rawAssets.map((value) => resolveMetadataUri(this.module, mapExpoMetadata(value)))
    );
    assertCurrentRequest(request);
    const normalizedAssets = sortAssetsNewestFirst(
      dedupeAssets(assets.filter((asset): asset is MediaAssetMetadata => asset !== null))
    ).filter((asset) => {
      const search = request.filenameContains?.trim().toLocaleLowerCase();
      return !search || asset.filename.toLocaleLowerCase().includes(search);
    });
    return createPage(normalizedAssets, request, rawAssets.length >= request.pageSize);
  }

  async getAlbums(): Promise<MediaAlbum[]> {
    const albums = await this.module.Album.getAll();
    this.albumRefs.clear();
    const result: MediaAlbum[] = [];
    for (const album of albums) {
      this.albumRefs.set(album.id, album);
      result.push({ id: album.id, title: await album.getTitle() });
    }
    return result.sort(
      (left, right) => left.title.localeCompare(right.title) || left.id.localeCompare(right.id)
    );
  }

  async createAlbum(title: string, initialAssetId?: string): Promise<MediaAlbum> {
    if (!this.module.Album.create) {
      throw new Error('Album creation is not supported on this platform build.');
    }
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      throw new Error('Album title cannot be empty.');
    }
    const existing = await this.getAlbums();
    const exists = existing.some(
      (a) => a.title.trim().toLowerCase() === trimmedTitle.toLowerCase()
    );
    if (exists) {
      throw new Error(`An album named "${trimmedTitle}" already exists.`);
    }
    const assets = initialAssetId ? [new this.module.Asset(initialAssetId)] : [];
    const created = await this.module.Album.create(trimmedTitle, assets);
    const id = created.id;
    const albumTitle = await created.getTitle();
    this.albumRefs.set(id, created);
    this.revisionClock.bump('album-change');
    return { id, title: albumTitle || trimmedTitle };
  }

  async renameAlbum(albumId: string, newTitle: string): Promise<MediaAlbum> {
    const trimmedTitle = newTitle.trim();
    if (!trimmedTitle) {
      throw new Error('Album title cannot be empty.');
    }
    let album = this.albumRefs.get(albumId);
    if (!album) {
      await this.getAlbums();
      album = this.albumRefs.get(albumId);
    }
    if (!album) {
      throw new Error(`Album with ID ${albumId} not found.`);
    }
    if (album.setTitle) {
      await album.setTitle(trimmedTitle);
    }
    this.revisionClock.bump('album-change');
    return { id: albumId, title: trimmedTitle };
  }

  async deleteAlbum(albumId: string): Promise<void> {
    let album = this.albumRefs.get(albumId);
    if (!album) {
      await this.getAlbums();
      album = this.albumRefs.get(albumId);
    }
    if (album?.delete) {
      await album.delete();
    }
    this.albumRefs.delete(albumId);
    this.revisionClock.bump('album-change');
  }

  async addAssetToAlbum(assetId: string, albumId: string): Promise<void> {
    let album = this.albumRefs.get(albumId);
    if (!album) {
      await this.getAlbums();
      album = this.albumRefs.get(albumId);
    }
    if (!album || !album.add) {
      throw new Error(`Album with ID ${albumId} could not be updated.`);
    }
    const asset = new this.module.Asset(assetId);
    await album.add([asset]);
    this.revisionClock.bump('album-change');
  }

  async deleteAsset(id: string): Promise<void> {
    const asset = new this.module.Asset(id);
    if (asset.delete) {
      await asset.delete();
    }
    this.revisionClock.bump('asset-delete');
  }

  async getAsset(id: string): Promise<MediaAssetDetails | null> {
    try {
      const asset = new this.module.Asset(id);
      const info = await asset.getInfo();
      const mediaType = mapMediaType(info.mediaType);
      if (!mediaType) {
        return null;
      }
      const metadata = normalizeMetadataAsset({
        id,
        filename: info.filename ?? undefined,
        mediaType,
        creationTime: info.creationTime,
        modificationTime: info.modificationTime,
        width: info.width,
        height: info.height,
        duration: info.duration,
        isFavorite: info.isFavorite,
        uri: info.uri,
      });
      if (!metadata) {
        return null;
      }
      let isInCloud = false;
      try {
        isInCloud = (await asset.getIsInCloud?.()) === true;
      } catch {
        isInCloud = false;
      }
      if (isInCloud) {
        return {
          ...metadata,
          uri: null,
          isAvailable: false,
          unavailableReason: 'This item is stored in iCloud and is not available locally.',
        };
      }
      const uri = metadata.uri ?? (await asset.getUri());
      return { ...metadata, uri, isAvailable: true };
    } catch {
      return {
        id,
        filename: 'Unavailable media',
        mediaType: 'image',
        creationTime: null,
        modificationTime: null,
        width: null,
        height: null,
        duration: null,
        isFavorite: false,
        uri: null,
        isAvailable: false,
        unavailableReason: 'This item is not available on the device.',
      };
    }
  }

  async setFavorite(id: string, isFavorite: boolean): Promise<void> {
    await new this.module.Asset(id).setFavorite(isFavorite);
    this.revisionClock.bump('favorite-change');
  }

  async getStorageEstimate(): Promise<StorageEstimate> {
    return {
      status: 'unavailable',
      bytes: null,
      source: 'metadata',
      reason: 'The device metadata API does not expose file sizes without resolving media files.',
    };
  }
}

export class UnavailableMediaLibraryService implements MediaLibraryService {
  readonly revisionClock = new RevisionClock();
  readonly availability = 'unavailable' as const;
  readonly unavailableReason: string;

  constructor(reason: string = defaultUnavailableReason) {
    this.unavailableReason = reason;
  }

  async getPermission(): Promise<PermissionSnapshot> {
    return unavailablePermissionSnapshot(this.unavailableReason);
  }

  async requestPermission(): Promise<PermissionSnapshot> {
    return unavailablePermissionSnapshot(this.unavailableReason);
  }

  async presentPermissionsPicker(): Promise<PermissionSnapshot> {
    return unavailablePermissionSnapshot(this.unavailableReason);
  }

  subscribe(): () => void {
    return () => undefined;
  }

  async queryMetadata(request: MetadataPageRequest): Promise<MetadataPage> {
    assertCurrentRequest(request);
    throw new Error(this.unavailableReason);
  }

  async getAlbums(): Promise<MediaAlbum[]> {
    throw new Error(this.unavailableReason);
  }

  async createAlbum(): Promise<MediaAlbum> {
    throw new Error(this.unavailableReason);
  }

  async renameAlbum(): Promise<MediaAlbum> {
    throw new Error(this.unavailableReason);
  }

  async deleteAlbum(): Promise<void> {
    throw new Error(this.unavailableReason);
  }

  async addAssetToAlbum(): Promise<void> {
    throw new Error(this.unavailableReason);
  }

  async deleteAsset(): Promise<void> {
    throw new Error(this.unavailableReason);
  }

  async getAsset(): Promise<MediaAssetDetails | null> {
    return null;
  }

  async setFavorite(): Promise<void> {
    throw new Error(this.unavailableReason);
  }

  async getStorageEstimate(): Promise<StorageEstimate> {
    return {
      status: 'unavailable',
      bytes: null,
      source: 'metadata',
      reason: this.unavailableReason,
    };
  }
}

export function createExpoMediaLibraryService(
  module: ExpoMediaLibraryModule
): ExpoMediaLibraryService {
  return new ExpoMediaLibraryService(module);
}

export function createUnavailableMediaLibraryService(
  reason: string = defaultUnavailableReason
): UnavailableMediaLibraryService {
  return new UnavailableMediaLibraryService(reason);
}
