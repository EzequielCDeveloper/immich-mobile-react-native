import { useCallback, useEffect, useState } from 'react';

import { useMediaContext } from '@/context/media-context';
import {
  albumCatalogConcurrency,
  createAlbumCards,
  mapWithConcurrency,
  resolveAlbumCard,
  type AlbumCardModel,
} from '@/lib/albums/album-catalog';

export function useAlbumCatalog() {
  const media = useMediaContext();
  const [cards, setCards] = useState<AlbumCardModel[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  const retry = useCallback(() => {
    setStatus('loading');
    setError(null);
    setRetryToken((current) => current + 1);
  }, []);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const runRevision = media.revision;
    const isCurrent = () =>
      active &&
      !controller.signal.aborted &&
      media.service.revisionClock.value === runRevision;
    setStatus('loading');
    setError(null);
    void media.service
      .getAlbums()
      .then(async (albums) => {
        if (!isCurrent()) {
          return;
        }
        setCards((current) => createAlbumCards(albums, current));
        setStatus('ready');
        await mapWithConcurrency(albums, albumCatalogConcurrency, async (album) => {
          try {
            const resolved = await resolveAlbumCard(
              media.service,
              album,
              media.revision,
              media.permission.scope,
              controller.signal
            );
            if (isCurrent()) {
              setCards((current) =>
                current.map((card) =>
                  card.id === album.id
                    ? { ...card, state: 'ready', count: resolved.count, cover: resolved.cover }
                    : card
                )
              );
            }
          } catch (reason) {
            if (isCurrent()) {
              setCards((current) =>
                current.map((card) =>
                  card.id === album.id
                    ? {
                        ...card,
                        state: 'error',
                        error: reason instanceof Error ? reason.message : 'Album metadata is unavailable.',
                      }
                    : card
                )
              );
            }
          }
        });
      })
      .catch((reason: unknown) => {
        if (isCurrent()) {
          setStatus('error');
          setError(reason instanceof Error ? reason.message : 'Albums are unavailable.');
        }
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [media.permission.scope, media.revision, media.service, retryToken]);

  return { cards, status, error, retry };
}
