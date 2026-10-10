import { AppState } from 'react-native';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import type { PropsWithChildren } from 'react';

import {
  type MediaAssetMetadata,
  type MediaLibraryService,
  type MetadataPage,
  type MetadataPageRequest,
} from '@/lib/media/contracts';
import {
  createExpoMediaLibraryService,
  createUnavailableMediaLibraryService,
} from '@/lib/media/expo-media-library-service';
import { expoMediaLibraryModule } from '@/lib/media/optional-module';
import { RevisionScopedPagingCache } from '@/lib/media/paging-cache';
import {
  checkingPermissionSnapshot,
  unavailablePermissionSnapshot,
  type PermissionSnapshot,
} from '@/lib/media/permission-state';
import { loadAllMetadata } from '@/lib/media/query-adapter';
import { type RevisionReason } from '@/lib/media/revision';

type PageLoader = (request: MetadataPageRequest) => Promise<MetadataPage>;

type MediaContextValue = {
  service: MediaLibraryService;
  permission: PermissionSnapshot;
  revision: number;
  isCheckingPermission: boolean;
  getPage: (request: MetadataPageRequest, loader?: PageLoader) => Promise<MetadataPage>;
  loadAll: (
    request: Omit<MetadataPageRequest, 'offset' | 'cursor'> & { pageSize?: number }
  ) => Promise<MediaAssetMetadata[]>;
  recheckPermission: () => Promise<void>;
  requestPermission: () => Promise<void>;
  manageLimitedAccess: () => Promise<void>;
  refreshLibrary: () => void;
  toggleFavorite: (id: string, isFavorite: boolean) => Promise<void>;
  createAlbum: (title: string, initialAssetId?: string) => Promise<import('@/lib/media/contracts').MediaAlbum>;
  renameAlbum: (albumId: string, newTitle: string) => Promise<import('@/lib/media/contracts').MediaAlbum>;
  deleteAlbum: (albumId: string) => Promise<void>;
  addAssetToAlbum: (assetId: string, albumId: string) => Promise<void>;
  deleteAsset: (id: string) => Promise<void>;
};

const MediaContext = createContext<MediaContextValue | null>(null);

export function MediaProvider({
  children,
  service: providedService,
}: PropsWithChildren<{ service?: MediaLibraryService }>) {
  const service = useMemo(
    () =>
      providedService ??
      (expoMediaLibraryModule
        ? createExpoMediaLibraryService(expoMediaLibraryModule)
        : createUnavailableMediaLibraryService()),
    [providedService]
  );
  const pagingCache = useMemo(() => new RevisionScopedPagingCache(), []);
  const [permission, setPermission] = useState<PermissionSnapshot>(checkingPermissionSnapshot);
  const [isCheckingPermission, setIsCheckingPermission] = useState(true);
  const mounted = useRef(true);
  const permissionOperation = useRef(0);

  const subscribeToRevision = useCallback(
    (onStoreChange: () => void) => service.revisionClock.subscribe(() => onStoreChange()),
    [service]
  );
  const getRevision = useCallback(() => service.revisionClock.value, [service]);
  const revision = useSyncExternalStore(subscribeToRevision, getRevision, getRevision);

  const completePermissionCheck = useCallback(
    async (operation: () => Promise<PermissionSnapshot>, reason: RevisionReason) => {
      const operationId = permissionOperation.current + 1;
      permissionOperation.current = operationId;
      setIsCheckingPermission(true);
      let nextPermission: PermissionSnapshot;
      try {
        nextPermission = await operation();
      } catch {
        nextPermission = unavailablePermissionSnapshot('The device permission state is unavailable.');
      }
      if (!mounted.current || operationId !== permissionOperation.current) {
        return;
      }
      service.revisionClock.bump(reason);
      setPermission(nextPermission);
      setIsCheckingPermission(false);
    },
    [service]
  );

  const recheckPermission = useCallback(
    () => completePermissionCheck(() => service.getPermission(), 'permission-recheck'),
    [completePermissionCheck, service]
  );

  const requestPermission = useCallback(
    () => completePermissionCheck(() => service.requestPermission(), 'permission-transition'),
    [completePermissionCheck, service]
  );

  const manageLimitedAccess = useCallback(
    () =>
      completePermissionCheck(
        () => service.presentPermissionsPicker(),
        'permission-transition'
      ),
    [completePermissionCheck, service]
  );

  useEffect(() => {
    mounted.current = true;
    const unsubscribeRevision = service.revisionClock.subscribe((nextRevision) => {
      pagingCache.invalidate(nextRevision);
    });
    const unsubscribeLibrary = service.subscribe(() => {
      // The service already bumps the clock before delivering the event.
      pagingCache.invalidate(service.revisionClock.value);
    });
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && mounted.current) {
        void recheckPermission();
      }
    });

    let isMounted = true;
    const initializePermission = async () => {
      if (isMounted) {
        await recheckPermission();
      }
    };
    void initializePermission();

    return () => {
      isMounted = false;
      mounted.current = false;
      unsubscribeRevision();
      unsubscribeLibrary();
      appStateSubscription.remove();
      pagingCache.clear();
    };
  }, [pagingCache, recheckPermission, service]);

  const getPage = useCallback(
    (request: MetadataPageRequest, loader: PageLoader = service.queryMetadata.bind(service)) =>
      pagingCache.getPage(request, loader),
    [pagingCache, service]
  );

  const loadAll = useCallback(
    (request: Omit<MetadataPageRequest, 'offset' | 'cursor'> & { pageSize?: number }) =>
      loadAllMetadata(service, request),
    [service]
  );

  const refreshLibrary = useCallback(() => {
    service.revisionClock.bump('manual-refresh');
  }, [service]);

  const toggleFavorite = useCallback(
    (id: string, isFavorite: boolean) => service.setFavorite(id, isFavorite),
    [service]
  );

  const createAlbum = useCallback(
    (title: string, initialAssetId?: string) => service.createAlbum(title, initialAssetId),
    [service]
  );

  const addAssetToAlbum = useCallback(
    (assetId: string, albumId: string) => service.addAssetToAlbum(assetId, albumId),
    [service]
  );

  const renameAlbum = useCallback(
    (albumId: string, newTitle: string) => service.renameAlbum(albumId, newTitle),
    [service]
  );

  const deleteAlbum = useCallback(
    (albumId: string) => service.deleteAlbum(albumId),
    [service]
  );

  const deleteAsset = useCallback(
    (id: string) => service.deleteAsset(id),
    [service]
  );

  const value = useMemo(
    () => ({
      service,
      permission,
      revision,
      isCheckingPermission,
      getPage,
      loadAll,
      recheckPermission,
      requestPermission,
      manageLimitedAccess,
      refreshLibrary,
      toggleFavorite,
      createAlbum,
      renameAlbum,
      deleteAlbum,
      addAssetToAlbum,
      deleteAsset,
    }),
    [
      addAssetToAlbum,
      createAlbum,
      deleteAlbum,
      deleteAsset,
      getPage,
      isCheckingPermission,
      loadAll,
      manageLimitedAccess,
      permission,
      recheckPermission,
      refreshLibrary,
      renameAlbum,
      requestPermission,
      revision,
      service,
      toggleFavorite,
    ]
  );

  return <MediaContext.Provider value={value}>{children}</MediaContext.Provider>;
}

export function useMediaContext(): MediaContextValue {
  const value = useContext(MediaContext);
  if (!value) {
    throw new Error('useMediaContext must be used within MediaProvider');
  }
  return value;
}
