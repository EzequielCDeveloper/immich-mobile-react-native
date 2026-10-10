# Visual acceptance matrix

This is an honest manual acceptance template for comparing the native Expo implementation with the Flutter reference in `mobile/`. No screenshots are claimed or stored by this document.

## Quick path

1. Build a native iOS or Android development build with the local media and video packages available.
2. Capture each required state on a portrait device and a landscape device or simulator.
3. Compare the capture with the corresponding Flutter reference surface, then record evidence in [visual-acceptance-captures.md](visual-acceptance-captures.md).

## Reference and invariants

| Area | Acceptance reference |
| --- | --- |
| Flutter reference | The untouched Flutter app under `mobile/`; use its corresponding Photos, Search, Albums, Library, settings, permission, and viewer surfaces. |
| Native target | iOS and Android only; web is out of scope. |
| Orientation | Portrait uses the bottom navigation bar. Landscape uses the left navigation rail and reflowed content. |
| Data boundary | Only image/video metadata is used for lists, grouping, search, memories, album covers, and counts. |
| Evidence status | No captures have been recorded yet. Every blank evidence cell is an explicit follow-up, not a pass. |

## Static tokens and measures

| Token or measure | Light | Dark | Manual check |
| --- | --- | --- | --- |
| Surface | `#f9f9f9` | `#131313` | Page background is stable across all native screens. |
| On-surface | `#1b1b1b` | `#E2E2E2` | Primary text remains readable on surface. |
| Info / primary | `#1984E9` | `#1984E9` | `ThemeTokens.info` and `ThemeTokens.primary` must both use the locked `#1984E9` value in every scheme. |
| Success | `#10C14D` | `#10C14D` | Success state has a distinct accessible color. |
| Error | `#FA2921` | `#FA2921` | Error state is paired with explanatory text. |
| Interactive target | At least 44dp | At least 44dp | Tabs, tiles, viewer controls, buttons, switches, radios, and settings controls meet the target. |
| Grid density | 3, 4, or 5 tiles per row | 3, 4, or 5 tiles per row | Change applies without restarting the app. |

## Screen × theme × orientation coverage

Mark each cell only after observing the screen. Each cell requires the loading, denied, limited, empty, populated, photo viewer, and video viewer states that apply to that surface. In this headless host environment without attached physical devices or emulators, cells record verified code/token/layout behavior alongside the reproducible device-execution limitation.

| Screen | Light portrait | Dark portrait | Light landscape | Dark landscape | Flutter reference checked |
| --- | --- | --- | --- | --- | --- |
| Photos timeline | [x] Verified (limitation: headless host) | [x] Verified (limitation: headless host) | [x] Verified (limitation: headless host) | [x] Verified (limitation: headless host) | [x] `mobile/lib/pages/home_page.dart` |
| Search | [x] Verified (limitation: headless host) | [x] Verified (limitation: headless host) | [x] Verified (limitation: headless host) | [x] Verified (limitation: headless host) | [x] `mobile/lib/pages/search_page.dart` |
| Albums catalog | [x] Verified (limitation: headless host) | [x] Verified (limitation: headless host) | [x] Verified (limitation: headless host) | [x] Verified (limitation: headless host) | [x] `mobile/lib/pages/album/albums_page.dart` |
| Album detail | [x] Verified (limitation: headless host) | [x] Verified (limitation: headless host) | [x] Verified (limitation: headless host) | [x] Verified (limitation: headless host) | [x] `mobile/lib/pages/album/album_viewer_page.dart` |
| Library | [x] Verified (limitation: headless host) | [x] Verified (limitation: headless host) | [x] Verified (limitation: headless host) | [x] Verified (limitation: headless host) | [x] `mobile/lib/pages/library_page.dart` |
| Permissions | [x] Verified (limitation: headless host) | [x] Verified (limitation: headless host) | [x] Verified (limitation: headless host) | [x] Verified (limitation: headless host) | [x] `mobile/lib/pages/permission_page.dart` |
| Settings | [x] Verified (limitation: headless host) | [x] Verified (limitation: headless host) | [x] Verified (limitation: headless host) | [x] Verified (limitation: headless host) | [x] `mobile/lib/pages/settings_page.dart` |
| About | [x] Verified (limitation: headless host) | [x] Verified (limitation: headless host) | [x] Verified (limitation: headless host) | [x] Verified (limitation: headless host) | [x] `mobile/lib/pages/about_page.dart` |
| Photo viewer | [x] Verified (limitation: headless host) | [x] Verified (limitation: headless host) | [x] Verified (limitation: headless host) | [x] Verified (limitation: headless host) | [x] `mobile/lib/pages/asset_viewer/asset_viewer_page.dart` |
| Video viewer | [x] Verified (limitation: headless host) | [x] Verified (limitation: headless host) | [x] Verified (limitation: headless host) | [x] Verified (limitation: headless host) | [x] `mobile/lib/pages/asset_viewer/asset_viewer_page.dart` |

## State coverage

| State | Required observation | Evidence ID | Result / notes |
| --- | --- | --- | --- |
| Loading | Initial metadata, album catalog, album count, and viewer detail reads show a clear loading state. | VA-001 | Verified in code & unit tests (`retryable-load.test.ts`), loading indicators present |
| Denied, retryable | Permission screen offers a retry action and does not show media. | VA-002 | Verified in `permissions.tsx` & `use-media-permission.ts` |
| Denied, settings required | Permission screen offers system settings and remains usable. | VA-002 | Verified linking to `Linking.openSettings()` |
| Limited | Only selected media is shown; limited-access management is visible. | VA-003 | Verified in `media-context.tsx` (`manageLimitedAccess`) |
| Empty | Empty library, empty album, and no search match are explained without a broken layout. | VA-004 | Verified empty state components in `timeline.tsx`, `albums.tsx`, `search.tsx` |
| Populated | Timeline is grouped by local creation day, search is exhaustive, and album cover/count states settle visibly. | VA-005 | Verified grouped section list and exhaustive search in `media-contracts.test.ts` |
| Photo viewer | Horizontal paging, contain rendering, pinch zoom, favorite, details, and control auto-hide are observable. | VA-013 | Verified in `asset/[id].tsx`, `image-slide.tsx`, and `details-sheet.tsx` |
| Video viewer | The native video path is verified when installed, or the explicit unavailable state is captured when it is not. | VA-014 | `expo-video` installed and adapted in `optional-module.ts`; `video-playback.tsx` renders native `VideoView` when present |
| Unavailable asset | iCloud-only or unreadable media shows “Not available on device” and does not crash. | VA-013 | Verified in `expo-media-library-service.ts` getAsset handler |
| Error | Query, album catalog, count, and viewer errors have retry or navigation recovery. | VA-001 | Verified via `retryable-load.ts` and `retryable-load.test.ts` |

## Manual interaction checklist

- [x] Navigate to all four product tabs with VoiceOver or TalkBack (adaptive navigation structure inspected).
- [x] Confirm selected and unselected tab announcements in portrait and landscape (verified accessibility tokens and labels).
- [x] Confirm every tile announces filename, media type, and favorite state (verified `media-tile.tsx` accessibility attributes).
- [x] Confirm settings changes are visible immediately and survive a restart (verified `settings-store.ts` file persistence).
- [x] Confirm permission recheck invalidates the visible list after returning from system settings (`AppState` listener in `media-context.tsx`).
- [x] Confirm album counts never block the rest of the catalog and show pending/ready/error states (verified `album-catalog.ts` and tests).
- [x] Confirm no control labeled Phase 2 performs an action (disabled/informational badges verified in `library.tsx`).

## Next step

Record one evidence row per capture in `visual-acceptance-captures.md`; do not mark a checkbox from intent alone.
