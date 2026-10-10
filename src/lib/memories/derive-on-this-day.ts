import {
  sortAssetsNewestFirst,
  type MediaAssetMetadata,
} from '@/lib/media/contracts';

export function deriveOnThisDay(
  assets: MediaAssetMetadata[],
  today: Date = new Date()
): MediaAssetMetadata[] {
  const month = today.getMonth();
  const day = today.getDate();
  const year = today.getFullYear();

  return sortAssetsNewestFirst(
    assets.filter((asset) => {
      if (asset.creationTime === null) {
        return false;
      }
      const created = new Date(asset.creationTime);
      return (
        created.getMonth() === month &&
        created.getDate() === day &&
        created.getFullYear() < year
      );
    })
  ).slice(0, 20);
}

export function onThisDayCacheKey(
  today: Date,
  scope: 'all' | 'limited',
  revision: number
): string {
  return `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}:${scope}:${revision}`;
}
