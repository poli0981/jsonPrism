# Tested viewports

JSONPrism's mobile and tablet rendering is verified across the devices below.

Status legend:

- ✅ Works as expected
- ⚠️ Cramped but functional
- ❌ Known limitation (typically below recommended minimum)

Recommended minimum viewport: **360 × 640**. Phones in landscape orientation are best-effort — see [recommendation](#recommendation).

## Test results (last verified 2026-05-14)

### Phones (portrait)

| Device                                           | Viewport  | Status | Notes                          |
| ------------------------------------------------ | --------- | ------ | ------------------------------ |
| BlackBerry Z30 / Samsung Galaxy Note 3 / Nexus 5 | 360 × 640 | ✅     | Minimum recommended viewport   |
| Samsung Galaxy S9+                               | 320 × 658 | ✅     | Below recommended width, works |
| Pixel 4                                          | 353 × 745 | ✅     |                                |
| Pixel 3                                          | 393 × 786 | ✅     |                                |
| iPhone SE (2nd/3rd gen)                          | 375 × 667 | ✅     |                                |
| iPhone 12 Pro                                    | 390 × 844 | ✅     |                                |
| iPhone 14 Pro                                    | 393 × 852 | ✅     | Verified on real device        |
| iPhone XR                                        | 414 × 896 | ✅     |                                |
| Pixel 7                                          | 412 × 915 | ✅     |                                |
| iPhone 14 Pro Max                                | 420 × 932 | ✅     |                                |

### Tablets

| Device              | Viewport   | Status | Notes                                              |
| ------------------- | ---------- | ------ | -------------------------------------------------- |
| BlackBerry PlayBook | 600 × 1024 | ✅     |                                                    |
| iPad                | 768 × 1024 | ✅     | Side-by-side input/output kicks in at `md` (768px) |

### Known limitations

| Device         | Viewport  | Status | Notes                                                                                                                                            |
| -------------- | --------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Nokia Lumia 520 | 320 × 533 | ❌     | Code editor disappears — viewport is below the recommended minimum height (640). Worth revisiting in a future round if demand surfaces. |

## Recommendation

- **Portrait orientation only on phones.** Landscape on phones (height < width) compresses each tab's content area to ~150–200px after chrome and is best-effort.
- **Below recommended minimum (360 × 640)**: layout is functional but the code editor may collapse on very short heights (< 600px).

## How to retest

1. Open Chrome DevTools → "Toggle device toolbar" (Ctrl+Shift+M).
2. Pick a device from the dropdown or set a custom viewport.
3. Verify on the Home page: Header navigation visible, Input/Output Tabs accessible, FormatPicker trigger fits, no horizontal scroll on `<body>`.

Test results contributed by the maintainer. PRs welcome to expand the matrix.
