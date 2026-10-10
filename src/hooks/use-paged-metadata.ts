import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useMediaContext } from '@/context/media-context';
import {
  dedupeAssets,
  type MediaAssetMetadata,
  type MediaTypeFilter,
  type MetadataPageRequest,
} from '@/lib/media/contracts';
import { beginRetry, completeLoad, failLoad } from '@/lib/recovery/retryable-load';
import { searchMetadata } from '@/lib/search/search-index';

type PagedMetadataOptions = {
  pageSize?: number;
  albumId?: string;
  favoriteOnly?: boolean;
  filenameContains?: string;
  mediaType?: MediaTypeFilter;
  enabled?: boolean;
};

type PagedMetadataState = {
  assets: MediaAssetMetadata[];
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
  hasMore: boolean;
  refreshing: boolean;
};

export function usePagedMetadata(options: PagedMetadataOptions = {}) {
  const media = useMediaContext();
  const pageSize = options.pageSize ?? 60;
  const enabled = options.enabled ?? true;
  const [state, setState] = useState<PagedMetadataState>({
    assets: [],
    status: enabled ? 'loading' : 'idle',
    error: null,
    hasMore: false,
    refreshing: false,
  });
  const loadingRef = useRef(false);
  const requestControllerRef = useRef<AbortController | null>(null);
  const nextOffsetRef = useRef(0);
  const runRef = useRef(0);
  const key = useMemo(
    () =>
      JSON.stringify({
        revision: media.revision,
        pageSize,
        albumId: options.albumId ?? null,
        favoriteOnly: options.favoriteOnly ?? false,
        filenameContains: options.filenameContains ?? '',
        mediaType: options.mediaType ?? 'all',
        enabled,
      }),
    [
      enabled,
      media.revision,
      options.albumId,
      options.favoriteOnly,
      options.filenameContains,
      options.mediaType,
      pageSize,
    ]
  );

  const loadPage = useCallback(
    async (offset: number, replace: boolean, run: number) => {
      if (!enabled || loadingRef.current) {
        return;
      }
      loadingRef.current = true;
      const controller = new AbortController();
      requestControllerRef.current = controller;
      const request: MetadataPageRequest = {
        pageSize,
        offset,
        cursor: null,
        revision: media.revision,
        scope: media.permission.scope,
        signal: controller.signal,
        ...(options.albumId ? { albumId: options.albumId } : {}),
        ...(options.favoriteOnly ? { favoriteOnly: true } : {}),
        ...(options.filenameContains ? { filenameContains: options.filenameContains } : {}),
        ...(options.mediaType ? { mediaType: options.mediaType } : {}),
      };

      try {
        const page = await media.getPage(
          request,
          options.filenameContains !== undefined
            ? (nextRequest) => searchMetadata(media.service, nextRequest)
            : undefined
        );
        if (run !== runRef.current) {
          return;
        }
        nextOffsetRef.current = offset + page.pageSize;
        setState((current) => completeLoad({
          ...current,
          assets: replace ? page.assets : dedupeAssets([...current.assets, ...page.assets]),
          hasMore: page.hasMore,
          refreshing: false,
        }));
      } catch (error) {
        if (run === runRef.current && !controller.signal.aborted) {
          setState((current) => failLoad({
            ...current,
            refreshing: false,
          }, error, 'The media source could not be read.'));
        }
      } finally {
        if (run === runRef.current && requestControllerRef.current === controller) {
          loadingRef.current = false;
          requestControllerRef.current = null;
        }
      }
    },
    [
      enabled,
      media,
      options.albumId,
      options.favoriteOnly,
      options.filenameContains,
      options.mediaType,
      pageSize,
    ]
  );

  useEffect(() => {
    runRef.current += 1;
    const run = runRef.current;
    requestControllerRef.current?.abort();
    requestControllerRef.current = null;
    loadingRef.current = false;
    nextOffsetRef.current = 0;
    if (!enabled) {
      setState({ assets: [], status: 'idle', error: null, hasMore: false, refreshing: false });
      return;
    }
    setState({ assets: [], status: 'loading', error: null, hasMore: false, refreshing: false });
    void loadPage(0, true, run);

    return () => {
      if (run === runRef.current) {
        requestControllerRef.current?.abort();
        requestControllerRef.current = null;
        loadingRef.current = false;
      }
    };
  }, [enabled, key, loadPage]);

  const loadMore = useCallback(() => {
    if (!loadingRef.current && state.hasMore) {
      void loadPage(nextOffsetRef.current, false, runRef.current);
    }
  }, [loadPage, state.hasMore]);

  const refresh = useCallback(() => {
    setState((current) => ({ ...current, refreshing: true }));
    media.refreshLibrary();
  }, [media]);

  const retry = useCallback(() => {
    if (!enabled || loadingRef.current) {
      return;
    }
    const run = runRef.current;
    nextOffsetRef.current = 0;
    setState((current) => beginRetry({ ...current, refreshing: false }));
    void loadPage(0, true, run);
  }, [enabled, loadPage]);

  return { ...state, loadMore, refresh, retry };
}
