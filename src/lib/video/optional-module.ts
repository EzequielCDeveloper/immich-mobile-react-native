import {
  adaptExpoVideoModule,
  type ExpoVideoModule,
} from '@/lib/video/expo-video-boundary';

let videoModule: ExpoVideoModule | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const sdkModule = require('expo-video');
  videoModule = adaptExpoVideoModule(sdkModule);
} catch {
  videoModule = null;
}

export const expoVideoModule: ExpoVideoModule | null = videoModule;

