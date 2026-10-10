import type { MediaAssetMetadata } from '@/lib/media/contracts';
import { createAlbumCards, type AlbumCardModel } from '@/lib/albums/album-catalog';
import { beginRetry, completeLoad, failLoad } from '@/lib/recovery/retryable-load';
import {
  canApplyDetailResult,
  detailErrorState,
  detailLoadingState,
  detailReadyState,
} from '@/lib/viewer/detail-state';

declare function describe(name: string, callback: () => void): void;
declare function test(name: string, callback: () => void | Promise<void>): void;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function asset(id: string): MediaAssetMetadata {
  return {
    id,
    filename: `${id}.jpg`,
    mediaType: 'image',
    creationTime: 1,
    modificationTime: 1,
    width: 100,
    height: 100,
    duration: null,
    isFavorite: false,
    uri: `file:///${id}.jpg`,
  };
}

describe('initial-load recovery contracts', () => {
  test('timeline retry moves an initial query error to a successful state', () => {
    const failed = failLoad(
      { status: 'loading' as const, error: null, assets: [] as MediaAssetMetadata[] },
      new Error('timeline failed'),
      'Timeline unavailable.'
    );
    const retrying = beginRetry(failed);
    const ready = completeLoad({ ...retrying, assets: [asset('timeline-asset')] });

    assert(retrying.status === 'loading', 'Timeline retry must leave the loading state visible');
    assert(retrying.error === null, 'Timeline retry must clear the previous error');
    assert(ready.status === 'ready' && ready.assets.length === 1, 'Timeline retry must reach ready');
  });

  test('search retry preserves the active query and filters', () => {
    const request = { query: 'beach', favoriteOnly: true, mediaType: 'image' };
    const failed = failLoad(
      { status: 'loading' as const, error: null, request, assets: [] as MediaAssetMetadata[] },
      new Error('search failed'),
      'Search unavailable.'
    );
    const retrying = beginRetry(failed);
    const ready = completeLoad({ ...retrying, assets: [asset('search-asset')] });

    assert(retrying.request === request, 'Search retry must retain the active query and filters');
    assert(retrying.status === 'loading' && retrying.error === null, 'Search retry must clear the error');
    assert(ready.status === 'ready' && ready.assets.length === 1, 'Search retry must reach ready');
  });

  test('album catalog retry preserves independently settled card states', () => {
    const settledCard: AlbumCardModel = {
      id: 'settled',
      title: 'Settled',
      state: 'ready',
      count: 3,
      cover: asset('cover'),
    };
    const cards = createAlbumCards(
      [
        { id: 'settled', title: 'Settled' },
        { id: 'new', title: 'New' },
      ],
      [settledCard]
    );
    const failed = failLoad(
      { status: 'loading' as const, error: null, cards },
      new Error('album catalog failed'),
      'Albums unavailable.'
    );
    const retrying = beginRetry(failed);
    const ready = completeLoad({ ...retrying, cards });

    assert(cards[0].state === 'ready' && cards[0].count === 3, 'Settled album card state must survive a catalog retry');
    assert(cards[1].state === 'pending', 'New album cards must still load independently');
    assert(ready.status === 'ready' && ready.cards === cards, 'Album catalog retry must reach ready');
  });

  test('viewer detail retry is recoverable and stale or unmounted results are ignored', () => {
    const failed = detailErrorState(detailLoadingState(), new Error('detail failed'));
    const retrying = detailLoadingState(failed);
    const ready = detailReadyState({
      ...asset('viewer-asset'),
      isAvailable: true,
      uri: 'file:///viewer-asset.jpg',
    });
    const token = { run: 2, request: 4 };

    assert(failed.status === 'error' && failed.error === 'detail failed', 'Viewer detail errors must be visible');
    assert(retrying.status === 'loading' && retrying.error === null, 'Viewer detail retry must clear the error');
    assert(ready.status === 'ready' && ready.detail?.id === 'viewer-asset', 'Viewer detail retry must reach ready');
    assert(canApplyDetailResult(token, token, 2, true), 'Current mounted detail results must apply');
    assert(!canApplyDetailResult(token, { run: 2, request: 5 }, 2, true), 'Older detail results must not overwrite retries');
    assert(!canApplyDetailResult(token, token, 2, false), 'Unmounted detail results must be ignored');
  });
});
