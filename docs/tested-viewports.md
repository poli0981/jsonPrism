# Tested viewports

JSONPrism's mobile and tablet rendering is verified across the devices below.

Status legend:

- ✅ Works as expected
- ⚠️ Cramped but functional
- ❌ Known limitation (typically below recommended minimum)

Recommended minimum viewport: **360 × 640**. Phones in landscape orientation are best-effort — see [recommendation](#recommendation).

## v2.0.0 check (2026-10-22)

Chromium device emulation against the production build served by `wrangler dev` (`npm run preview:cf`), in the light and the dark theme at each size.

| Viewport   | Form factor | Themes      | Status | Notes                                 |
| ---------- | ----------- | ----------- | ------ | ------------------------------------- |
| 360 × 740  | Phone       | Light, dark | ✅     | No horizontal overflow; header fits   |
| 768 × 1024 | Tablet      | Light, dark | ✅     | Split input/output layout from 768 px |
| 1280 × 800 | Desktop     | Light, dark | ✅     | Split input/output layout             |

Also checked in this round:

- Consent Gate with the Turnstile flow on Cloudflare's test keys (always-pass sitekey and secret).
- Appearance menu: theme switching and "Hide scrollbars".
- Browser console free of Content-Security-Policy violations.

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

1. Serve the production build with `npm run preview:cf` (http://localhost:8787; needs `.dev.vars`, see [dev_env.md](dev_env.md)). Unlike `npm run dev`, it applies the CSP from `public/_headers` and runs the Worker that verifies Turnstile.
2. Open Chrome DevTools → "Toggle device toolbar" (Ctrl+Shift+M).
3. Pick a device from the dropdown or set a custom viewport.
4. Verify on the Home page: Header navigation visible, Input/Output Tabs accessible, FormatPicker trigger fits, no horizontal scroll on `<body>`.
5. Repeat in light and dark (Appearance menu), pass the Consent Gate (the Turnstile test key passes on its own), and check the console for CSP violations.

Test results contributed by the maintainer. PRs welcome to expand the matrix.
