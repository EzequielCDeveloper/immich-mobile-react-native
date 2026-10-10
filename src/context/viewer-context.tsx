import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';

import type { MediaAssetMetadata } from '@/lib/media/contracts';

type ViewerContextValue = {
  assets: MediaAssetMetadata[];
  initialIndex: number;
  open: (assets: MediaAssetMetadata[], index: number) => void;
  updateFavorite: (id: string, isFavorite: boolean) => void;
  clear: () => void;
};

const ViewerContext = createContext<ViewerContextValue | null>(null);

export function ViewerProvider({ children }: PropsWithChildren) {
  const [assets, setAssets] = useState<MediaAssetMetadata[]>([]);
  const [initialIndex, setInitialIndex] = useState(0);
  const open = useCallback((nextAssets: MediaAssetMetadata[], index: number) => {
    setAssets(nextAssets);
    setInitialIndex(Math.max(0, Math.min(index, nextAssets.length - 1)));
  }, []);
  const clear = useCallback(() => {
    setAssets([]);
    setInitialIndex(0);
  }, []);
  const updateFavorite = useCallback((id: string, isFavorite: boolean) => {
    setAssets((current) => current.map((asset) => (asset.id === id ? { ...asset, isFavorite } : asset)));
  }, []);
  const value = useMemo(
    () => ({ assets, initialIndex, open, updateFavorite, clear }),
    [assets, clear, initialIndex, open, updateFavorite]
  );

  return <ViewerContext.Provider value={value}>{children}</ViewerContext.Provider>;
}

export function useViewerContext(): ViewerContextValue {
  const value = useContext(ViewerContext);
  if (!value) {
    throw new Error('useViewerContext must be used within ViewerProvider');
  }
  return value;
}
