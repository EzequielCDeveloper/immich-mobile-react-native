import type { MediaScope } from '@/lib/media/contracts';

export type PermissionState =
  | 'checking'
  | 'undetermined'
  | 'denied-retryable'
  | 'denied-settings'
  | 'granted-all'
  | 'granted-limited';

export type PermissionSnapshot = {
  state: PermissionState;
  granted: boolean;
  canAskAgain: boolean;
  accessPrivileges: 'all' | 'limited' | 'none';
  scope: MediaScope;
  unavailableReason?: string;
};

export type NativePermissionResponse = {
  status: 'undetermined' | 'denied' | 'granted';
  granted: boolean;
  canAskAgain: boolean;
  accessPrivileges?: 'all' | 'limited' | 'none';
};

export function permissionSnapshotFromResponse(
  response: NativePermissionResponse,
  unavailableReason?: string
): PermissionSnapshot {
  if (response.status === 'undetermined') {
    return {
      state: 'undetermined',
      granted: false,
      canAskAgain: response.canAskAgain,
      accessPrivileges: 'none',
      scope: 'all',
      ...(unavailableReason ? { unavailableReason } : {}),
    };
  }

  const isGranted = Boolean(
    response.granted ||
      response.status === 'granted' ||
      response.accessPrivileges === 'all' ||
      response.accessPrivileges === 'limited'
  );

  const accessPrivileges =
    response.accessPrivileges ?? (isGranted ? 'all' : 'none');

  let state: PermissionState;

  if (isGranted && accessPrivileges === 'limited') {
    state = 'granted-limited';
  } else if (isGranted) {
    state = 'granted-all';
  } else if (response.canAskAgain) {
    state = 'denied-retryable';
  } else {
    state = 'denied-settings';
  }

  const effectiveGranted = state === 'granted-all' || state === 'granted-limited';

  return {
    state,
    granted: effectiveGranted,
    canAskAgain: response.canAskAgain,
    accessPrivileges,
    scope: accessPrivileges === 'limited' ? 'limited' : 'all',
    ...(unavailableReason ? { unavailableReason } : {}),
  };
}

export function checkingPermissionSnapshot(): PermissionSnapshot {
  return {
    state: 'checking',
    granted: false,
    canAskAgain: true,
    accessPrivileges: 'none',
    scope: 'all',
  };
}

export function unavailablePermissionSnapshot(reason: string): PermissionSnapshot {
  return permissionSnapshotFromResponse(
    {
      status: 'denied',
      granted: false,
      canAskAgain: false,
      accessPrivileges: 'none',
    },
    reason
  );
}
