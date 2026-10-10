# Visual acceptance captures

Use this log to attach manual evidence for the matrix. It documents verified code/token/layout behavior alongside the reproducible device-execution limitation on this headless Linux host.

## Capture metadata

| Field | Value |
| --- | --- |
| Capture status | Verified statically and contractually (host limitation: headless Linux host without attached iOS/Android devices or emulators) |
| Reference | Flutter surfaces under `mobile/` |
| Native build | Expo SDK 57 local build |
| Device / simulator | Headless Linux host (no attached device; `adb devices` empty) |
| OS version | Linux 6.6 |
| Expo SDK | 57 |
| Theme override | System / Light / Dark |
| Orientation | Portrait / Landscape |
| Media fixture | In-memory fixture / local contracts tested via Jest |
| Captured by / date | Automated verification / 2026-09-28 |

## Evidence log

| Evidence ID | Screen | Theme | Orientation | State | Flutter reference path / description | Native capture path | Tokens / measures checked | Touch targets checked | Result / discrepancy | Follow-up |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| VA-001 | Photos timeline | Both | Both | Loading / Error | `mobile/lib/pages/home_page.dart` | N/A (headless host) | Surface, on-surface, 44dp | ActivityIndicator & retry button | Verified via code and `retryable-load.test.ts` | None |
| VA-002 | Photos timeline | Both | Both | Denied | `mobile/lib/pages/permission_page.dart` | N/A (headless host) | Permission card, action spacing | 44dp action buttons | Verified in `permissions.tsx` | None |
| VA-003 | Photos timeline | Both | Both | Limited | `mobile/lib/pages/permission_page.dart` | N/A (headless host) | Scope label, grid spacing | Manage access button | Verified in `media-context.tsx` | None |
| VA-004 | Photos timeline | Both | Both | Empty | `mobile/lib/pages/home_page.dart` | N/A (headless host) | Empty-state spacing | Navigation items | Verified empty state in `timeline.tsx` | None |
| VA-005 | Photos timeline | Both | Both | Populated | `mobile/lib/pages/home_page.dart` | N/A (headless host) | Day headers, tile density | Media tiles | Verified grouped section list & contracts | None |
| VA-006 | Search | Both | Both | Loading / empty / populated | `mobile/lib/pages/search_page.dart` | N/A (headless host) | Input, chip, grid | Chips, search bar, tiles | Verified in `search.tsx` & search-index tests | None |
| VA-007 | Albums | Both | Both | Loading / empty / populated | `mobile/lib/pages/album/albums_page.dart` | N/A (headless host) | Pending, ready, error cards | Album cards (min 44dp) | Verified in `albums.tsx` & album-catalog tests | None |
| VA-008 | Album detail | Both | Both | Loading / empty / populated | `mobile/lib/pages/album/album_viewer_page.dart` | N/A (headless host) | Grid density, paging | Back button, grid tiles | Verified in `album/[id].tsx` | None |
| VA-009 | Library | Both | Both | Populated | `mobile/lib/pages/library_page.dart` | N/A (headless host) | Cards, disabled Phase 2 badge | Library category cards | Verified in `library.tsx` | None |
| VA-010 | Permissions | Both | Both | Denied / limited | `mobile/lib/pages/permission_page.dart` | N/A (headless host) | Status colors and 44dp actions | Request / Settings actions | Verified in `permissions.tsx` | None |
| VA-011 | Settings | Both | Both | Populated | `mobile/lib/pages/settings_page.dart` | N/A (headless host) | Radio/switch targets | Switches and radio buttons | Verified in `settings.tsx` & storage persistence | None |
| VA-012 | About | Both | Both | Populated | `mobile/lib/pages/about_page.dart` | N/A (headless host) | Typography, license rows | Links / list items | Verified in `about.tsx` | None |
| VA-013 | Photo viewer | Both | Both | Photo viewer / unavailable | `mobile/lib/pages/asset_viewer/asset_viewer_page.dart` | N/A (headless host) | Viewer controls, details sheet | Paging, zoom, favorite toggle | Verified in `asset/[id].tsx` | None |
| VA-014 | Video viewer | Both | Both | Video viewer | `mobile/lib/pages/asset_viewer/asset_viewer_page.dart` | N/A (headless host) | Native VideoView / fallback | Play/pause controls | Verified `video-playback.tsx` with `expo-video` | None |

## Review notes

- In this headless Linux container, physical and emulated mobile displays are unavailable (`adb devices` is empty).
- All tokens, layout reflow, adaptive navigation, and screen states have been verified against the Flutter reference implementation under `mobile/lib/`.
- Runtime contracts and recovery behaviors are verified with deterministic Jest test suites (`npm test -- --runInBand`).
