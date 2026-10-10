# Local Gallery

Local Gallery is a native-only Expo SDK 57 photo and video browser. It keeps the UI, settings, metadata paging, and permission state local to the device; it does not connect to a remote service.

## Quick path

1. Use Node.js 22.13 or newer.
2. Run `npm install` from this directory. The checked-in lockfile is the source of truth.
3. Run `npm start` and open the native iOS or Android target.

## Native scope

- Four product tabs: Photos, Search, Albums, and Library.
- Portrait uses a bottom navigation bar; landscape reflows into a navigation rail.
- Media access is isolated behind `src/lib/media/`.
- The Expo SDK 57 media and video packages are optional at this local snapshot. When they are unavailable, the app shows an explicit unavailable state rather than fabricating device results.
- Web is intentionally not a deliverable.

The native media boundary is dependency-injected in `src/lib/media/expo-media-library-service.ts`. The current root provider uses the explicit unavailable service because `expo-media-library` is absent from both local `node_modules` and the local npm cache. The activation point is `src/lib/media/optional-module.ts`: an authorized SDK 57 build must import the installed module and replace its `null` value with `adaptExpoMediaLibraryModule(MediaLibrary)`. No package or lockfile was added here.

Video has the same deliberate limitation. `src/lib/video/optional-module.ts` is `null` because `expo-video` is absent locally. An authorized SDK 57 build must import the installed module and replace its `null` value with `adaptExpoVideoModule(ExpoVideo)`; the viewer then uses the real `VideoView`/`useVideoPlayer` path without changing route behavior or inventing a fallback module.

## Verification

```bash
npm run guard:no-legacy
npm run guard:no-immich
npm run guard:native-config
npm run typecheck
npm run lint
npm test -- --runInBand
```

`npm test` requires the configured Jest packages to be installed. See the verification report for the exact local result when they are absent.

## Acceptance templates

- [Visual acceptance matrix](docs/visual-acceptance-matrix.md)
- [Visual capture log](docs/visual-acceptance-captures.md)
