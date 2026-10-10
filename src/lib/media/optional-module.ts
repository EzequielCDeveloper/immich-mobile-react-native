import {
  adaptExpoMediaLibraryModule,
  type ExpoMediaLibraryModule,
} from '@/lib/media/expo-media-library-service';

let mediaLibraryModule: ExpoMediaLibraryModule | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const sdkModule = require('expo-media-library');
  mediaLibraryModule = adaptExpoMediaLibraryModule(sdkModule);
} catch {
  mediaLibraryModule = null;
}

export const expoMediaLibraryModule: ExpoMediaLibraryModule | null = mediaLibraryModule;

