export type RetryableLoadStatus = 'idle' | 'loading' | 'ready' | 'error';

export type RetryableLoadState = {
  status: RetryableLoadStatus;
  error: string | null;
};

type LoadStateWithStatus<T extends RetryableLoadState, S extends RetryableLoadStatus> = Omit<T, 'status' | 'error'> & {
  status: S;
  error: string | null;
};

export function beginRetry<T extends RetryableLoadState>(
  state: T
): LoadStateWithStatus<T, 'loading'> {
  return { ...state, status: 'loading', error: null };
}

export function completeLoad<T extends RetryableLoadState>(
  state: T
): LoadStateWithStatus<T, 'ready'> {
  return { ...state, status: 'ready', error: null };
}

export function failLoad<T extends RetryableLoadState>(
  state: T,
  reason: unknown,
  fallback: string
): LoadStateWithStatus<T, 'error'> {
  return {
    ...state,
    status: 'error',
    error: reason instanceof Error && reason.message ? reason.message : fallback,
  };
}
