import { deriveOnThisDay } from '@/lib/memories/derive-on-this-day';
import type { MediaAssetMetadata, MediaType, MetadataPageRequest } from '@/lib/media/contracts';
import { InMemoryMediaLibraryService } from '@/lib/media/in-memory-service';
import { RevisionScopedPagingCache } from '@/lib/media/paging-cache';
import { normalizeMetadataAsset } from '@/lib/media/query-adapter';
import { searchMetadata } from '@/lib/search/search-index';
import {
  permissionSnapshotFromResponse,
  unavailablePermissionSnapshot,
} from '@/lib/media/permission-state';
import {
  ExpoMediaLibraryService,
  type ExpoMediaLibraryModule,
} from '@/lib/media/expo-media-library-service';

declare function describe(name: string, callback: () => void): void;
declare function test(name: string, callback: () => void | Promise<void>): void;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function asset(
  id: string,
  creationTime: number,
  isFavorite = false,
  mediaType: MediaType = 'image'
): MediaAssetMetadata {
  return {
    id,
    filename: `${id}.jpg`,
    mediaType,
    creationTime,
    modificationTime: creationTime,
    width: 100,
    height: 100,
    duration: null,
    isFavorite,
  };
}

describe('local media contracts', () => {
  test('derives a bounded local On This Day list in newest-first order', () => {
    const today = new Date(2026, 8, 17, 12);
    const matching = Array.from({ length: 24 }, (_, index) =>
      asset(`memory-${index}`, new Date(2020 + (index % 5), 8, 17, index).getTime())
    );
    const result = deriveOnThisDay(
      [asset('future', new Date(2026, 8, 17).getTime()), ...matching],
      today
    );

    assert(result.length === 20, 'On This Day must be capped at twenty items');
    assert(result[0].id === 'memory-19', 'On This Day must sort by newest creation time');
    assert(!result.some((item) => item.id === 'future'), 'Current-year items must be excluded');
  });

  test('keeps a resolved local URI separate from the media identifier', () => {
    const normalized = normalizeMetadataAsset({
      id: 'asset-id',
      mediaType: 'image',
      uri: 'file:///photos/photo.jpg',
    });

    assert(normalized?.id === 'asset-id', 'Metadata must retain the native media identifier');
    assert(normalized?.uri === 'file:///photos/photo.jpg', 'Metadata must retain the local URI');
    assert(normalized?.filename === 'Untitled media', 'Metadata must retain the filename default');
    assert(normalized?.creationTime === null, 'Metadata must retain the creation-time default');
    assert(normalized?.modificationTime === null, 'Metadata must retain the modification-time default');
    assert(normalized?.width === null, 'Metadata must retain the width default');
    assert(normalized?.height === null, 'Metadata must retain the height default');
    assert(normalized?.duration === null, 'Metadata must retain the duration default');
    assert(normalized?.isFavorite === false, 'Metadata must retain the favorite default');
  });

  test('shares one in-flight page request and caches the result', async () => {
    const cache = new RevisionScopedPagingCache();
    const request: MetadataPageRequest = {
      pageSize: 2,
      offset: 0,
      cursor: null,
      revision: 1,
      scope: 'all',
    };
    let calls = 0;
    const loader = async (current: MetadataPageRequest) => {
      calls += 1;
      await new Promise((resolve) => setTimeout(resolve, 1));
      return {
        assets: [asset('one', 2), asset('two', 1)],
        pageSize: current.pageSize,
        offset: current.offset,
        cursor: current.cursor,
        nextCursor: null,
        hasMore: false,
        revision: current.revision,
        scope: current.scope,
      };
    };

    await Promise.all([cache.getPage(request, loader), cache.getPage(request, loader)]);
    await cache.getPage(request, loader);
    assert(calls === 1, 'Repeated page reads must not duplicate work');
  });

  test('searches every metadata page instead of only a recent window', async () => {
    const service = new InMemoryMediaLibraryService({
      assets: Array.from({ length: 205 }, (_, index) =>
        asset(`asset-${index}`, new Date(2020, 0, 1, 0, index).getTime())
      ),
    });
    const result = await searchMetadata(service, {
      pageSize: 20,
      offset: 0,
      cursor: null,
      revision: service.revisionClock.value,
      scope: 'all',
      filenameContains: 'asset-20',
    });

    assert(result.assets.length === 6, 'Search must include matching assets beyond the first metadata page');
    assert(result.assets[0].id === 'asset-204', 'Search results must stay newest first');
    assert(result.hasMore === false, 'Search must report the filtered result boundary');
  });

  test('combines an independent type filter with an empty-query favorites search', async () => {
    const service = new InMemoryMediaLibraryService({
      assets: [
        asset('favorite-image', 3, true, 'image'),
        asset('favorite-video', 2, true, 'video'),
        asset('unfavorite-video', 1, false, 'video'),
      ],
    });
    const result = await searchMetadata(service, {
      pageSize: 20,
      offset: 0,
      cursor: null,
      revision: service.revisionClock.value,
      scope: 'all',
      filenameContains: '',
      favoriteOnly: true,
      mediaType: 'video',
    });

    assert(result.assets.length === 1, 'Empty-query favorites search must honor the type filter');
    assert(result.assets[0].id === 'favorite-video', 'Search must return the matching favorite video');
  });

  test('recognizes full photo library permission correctly', () => {
    const snapshot = permissionSnapshotFromResponse({
      status: 'granted',
      granted: true,
      canAskAgain: true,
      accessPrivileges: 'all',
    });
    assert(snapshot.granted === true, 'Full permission must set granted to true');
    assert(snapshot.state === 'granted-all', 'Full permission state must be granted-all');
    assert(snapshot.scope === 'all', 'Full permission scope must be all');
    assert(snapshot.accessPrivileges === 'all', 'Access privileges must be all');
  });

  test('recognizes granted permission when accessPrivileges is omitted (Android legacy/storage)', () => {
    const snapshot = permissionSnapshotFromResponse({
      status: 'granted',
      granted: true,
      canAskAgain: true,
    });
    assert(snapshot.granted === true, 'Legacy granted permission must be granted');
    assert(snapshot.state === 'granted-all', 'Legacy granted state must be granted-all');
    assert(snapshot.scope === 'all', 'Legacy granted scope must default to all');
  });

  test('recognizes limited permission as granted even if response.granted is false (iOS & Android 14)', () => {
    const snapshot = permissionSnapshotFromResponse({
      status: 'granted',
      granted: false,
      canAskAgain: true,
      accessPrivileges: 'limited',
    });
    assert(snapshot.granted === true, 'Limited access must be treated as granted for browsing');
    assert(snapshot.state === 'granted-limited', 'Limited access state must be granted-limited');
    assert(snapshot.scope === 'limited', 'Limited access scope must be limited');
    assert(snapshot.accessPrivileges === 'limited', 'Access privileges must be limited');
  });

  test('handles denied and undetermined permission states correctly', () => {
    const undetermined = permissionSnapshotFromResponse({
      status: 'undetermined',
      granted: false,
      canAskAgain: true,
    });
    assert(undetermined.granted === false, 'Undetermined permission must not be granted');
    assert(undetermined.state === 'undetermined', 'Undetermined state must match');

    const retryable = permissionSnapshotFromResponse({
      status: 'denied',
      granted: false,
      canAskAgain: true,
      accessPrivileges: 'none',
    });
    assert(retryable.granted === false, 'Denied retryable must not be granted');
    assert(retryable.state === 'denied-retryable', 'Retryable state must be denied-retryable');

    const blocked = permissionSnapshotFromResponse({
      status: 'denied',
      granted: false,
      canAskAgain: false,
      accessPrivileges: 'none',
    });
    assert(blocked.granted === false, 'Blocked settings permission must not be granted');
    assert(blocked.state === 'denied-settings', 'Blocked state must be denied-settings');

    const unavailable = unavailablePermissionSnapshot('Permission unavailable in test');
    assert(unavailable.granted === false, 'Unavailable permission must not be granted');
    assert(unavailable.state === 'denied-settings', 'Unavailable state must be denied-settings');
    assert(unavailable.unavailableReason === 'Permission unavailable in test', 'Unavailable reason must be preserved');
  });

  test('falls back to non-granular permission calls when granular calls fail', async () => {
    const calls = { granular: false, fallback: false };

    const mockModule: ExpoMediaLibraryModule = {
      Query: class {} as unknown as ExpoMediaLibraryModule['Query'],
      Asset: class {} as unknown as ExpoMediaLibraryModule['Asset'],
      Album: { getAll: async () => [] },
      AssetField: { MEDIA_TYPE: 'mediaType', CREATION_TIME: 'creationTime', IS_FAVORITE: 'isFavorite' },
      MediaType: { IMAGE: 'image', VIDEO: 'video' },
      requestPermissionsAsync: async (_writeOnly, granular) => {
        if (granular && granular.length > 0) {
          calls.granular = true;
          throw new Error('Granular permissions not supported in this runtime');
        }
        calls.fallback = true;
        return {
          status: 'granted',
          granted: true,
          canAskAgain: true,
          accessPrivileges: 'all',
        };
      },
      getPermission: async (_writeOnly, granular) => {
        if (granular && granular.length > 0) {
          calls.granular = true;
          throw new Error('Granular permissions not supported in this runtime');
        }
        calls.fallback = true;
        return {
          status: 'granted',
          granted: true,
          canAskAgain: true,
          accessPrivileges: 'all',
        };
      },
      presentPermissionsPicker: async () => undefined,
      addListener: () => ({ remove: () => undefined }),
    };

    const service = new ExpoMediaLibraryService(mockModule);

    calls.granular = false;
    calls.fallback = false;
    const getResult = await service.getPermission();
    assert(calls.granular, 'getPermission must attempt granular call first');
    assert(calls.fallback, 'getPermission must fallback to general call');
    assert(getResult.granted === true, 'getPermission must succeed via fallback');
    assert(getResult.state === 'granted-all', 'getPermission state must be granted-all');

    calls.granular = false;
    calls.fallback = false;
    const requestResult = await service.requestPermission();
    assert(calls.granular, 'requestPermission must attempt granular call first');
    assert(calls.fallback, 'requestPermission must fallback to general call');
    assert(requestResult.granted === true, 'requestPermission must succeed via fallback');
    assert(requestResult.state === 'granted-all', 'requestPermission state must be granted-all');
  });
});
