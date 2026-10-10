import { useAppTheme } from '@/components/theme-provider';

export function useTheme() {
  return useAppTheme().tokens;
}
