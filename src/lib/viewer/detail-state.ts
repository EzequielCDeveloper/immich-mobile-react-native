import type { MediaAssetDetails } from '@/lib/media/contracts';

export type DetailLoadState = {
  status: 'loading' | 'ready' | 'error';
  detail: MediaAssetDetails | null;
  error: string | null;
};

export type DetailRequestToken = {
  run: number;
  request: number;
};

export function detailLoadingState(previous?: DetailLoadState): DetailLoadState {
  return { status: 'loading', detail: previous?.detail ?? null, error: null };
}

export function detailReadyState(detail: MediaAssetDetails | null): DetailLoadState {
  return { status: 'ready', detail, error: null };
}

export function detailErrorState(previous: DetailLoadState | undefined, reason: unknown): DetailLoadState {
  return {
    status: 'error',
    detail: previous?.detail ?? null,
    error: reason instanceof Error && reason.message ? reason.message : 'Media details are unavailable.',
  };
}

export function canApplyDetailResult(
  token: DetailRequestToken,
  activeToken: DetailRequestToken | undefined,
  activeRun: number,
  mounted: boolean
): boolean {
  return (
    mounted &&
    token.run === activeRun &&
    activeToken?.run === token.run &&
    activeToken.request === token.request
  );
}
