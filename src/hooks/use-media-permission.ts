import { useMediaContext } from '@/context/media-context';

export function useMediaPermission() {
  const media = useMediaContext();
  return {
    permission: media.permission,
    isChecking: media.isCheckingPermission,
    recheck: media.recheckPermission,
    request: media.requestPermission,
    manageLimitedAccess: media.manageLimitedAccess,
  };
}
