import type { MetadataPage, MetadataPageRequest } from '@/lib/media/contracts';

type PageLoader = (request: MetadataPageRequest) => Promise<MetadataPage>;

function pageKey(request: MetadataPageRequest): string {
  return JSON.stringify({
    pageSize: request.pageSize,
    offset: request.offset,
    cursor: request.cursor,
    revision: request.revision,
    scope: request.scope,
    albumId: request.albumId ?? null,
    favoriteOnly: request.favoriteOnly ?? false,
    filenameContains: request.filenameContains ?? '',
    mediaType: request.mediaType ?? 'all',
  });
}

export class RevisionScopedPagingCache {
  private revision: number | null = null;
  private readonly pages = new Map<string, MetadataPage>();
  private readonly pending = new Map<string, Promise<MetadataPage>>();
  private readonly controllers = new Set<AbortController>();

  async getPage(request: MetadataPageRequest, loader: PageLoader): Promise<MetadataPage> {
    if (request.signal?.aborted) {
      throw new Error('Media query was cancelled');
    }
    if (this.revision !== request.revision) {
      this.invalidate(request.revision);
    }

    const key = pageKey(request);
    const cached = this.pages.get(key);
    if (cached) {
      return cached;
    }

    const existing = this.pending.get(key);
    if (existing) {
      return observeCallerSignal(existing, request.signal);
    }

    const controller = new AbortController();
    this.controllers.add(controller);
    const onCallerAbort = () => controller.abort();
    if (request.signal) {
      if (request.signal.aborted) {
        controller.abort();
      } else {
        request.signal.addEventListener('abort', onCallerAbort, { once: true });
      }
    }
    const requestWithSignal = { ...request, signal: controller.signal };
    let pending: Promise<MetadataPage>;
    pending = Promise.resolve()
      .then(() => loader(requestWithSignal))
      .then((page) => {
        if (request.signal?.aborted) {
          throw new Error('Media query was cancelled');
        }
        if (
          controller.signal.aborted ||
          this.revision !== request.revision ||
          page.revision !== request.revision
        ) {
          throw new Error('Media page became stale before it completed');
        }
        this.pages.set(key, page);
        return page;
      })
      .catch((error: unknown) => {
        if (request.signal?.aborted) {
          throw new Error('Media query was cancelled');
        }
        if (controller.signal.aborted || this.revision !== request.revision) {
          throw new Error('Media page became stale before it completed');
        }
        throw error;
      })
      .finally(() => {
        request.signal?.removeEventListener('abort', onCallerAbort);
        if (this.pending.get(key) === pending) {
          this.pending.delete(key);
        }
        this.controllers.delete(controller);
      });

    this.pending.set(key, pending);
    return pending;
  }

  invalidate(nextRevision?: number): void {
    for (const controller of this.controllers) {
      controller.abort();
    }
    this.controllers.clear();
    this.pages.clear();
    this.pending.clear();
    this.revision = nextRevision ?? null;
  }

  clear(): void {
    this.invalidate(this.revision ?? undefined);
  }
}

function observeCallerSignal<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) {
    return promise;
  }
  if (signal.aborted) {
    return Promise.reject(new Error('Media query was cancelled'));
  }

  return new Promise<T>((resolve, reject) => {
    const onAbort = () => {
      cleanup();
      reject(new Error('Media query was cancelled'));
    };
    const cleanup = () => signal.removeEventListener('abort', onAbort);
    signal.addEventListener('abort', onAbort, { once: true });
    void promise.then(
      (value) => {
        cleanup();
        resolve(value);
      },
      (error: unknown) => {
        cleanup();
        reject(error);
      }
    );
  });
}
