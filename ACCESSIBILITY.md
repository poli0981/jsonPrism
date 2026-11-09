# Accessibility

**Last reviewed**: 2026-11-09 · **Applies to**: JSONPrism 2.2.0 (website, desktop and Android apps)

JSONPrism should work for everyone who needs to convert JSON, whatever
input device, screen reader, display setting or language they use. This
statement covers our goals, what works today, how it was tested, what is
known not to work yet, and how to report a barrier.

JSONPrism is a one-person project (see [DISCLAIMER.md](DISCLAIMER.md)).
This page describes honest best effort, not a certified result.

## Goals

- **Target: [WCAG 2.2](https://www.w3.org/TR/WCAG22/) level AA.** The
  website and the apps share one interface, so the target covers all of
  them. It is a goal, not a claim of conformance: there has been no formal
  audit.
- **Priorities, in order:**
  1. Every task works with the keyboard alone: converting, opening and
     saving files, batch conversion, options and the consent screen.
  2. Every control has a name, role and state that screen readers
     announce, in the interface language.
  3. Content stays readable with high contrast, zoom, light or dark
     themes, reduced motion and Windows contrast themes.
- **Accessibility regressions are bugs.** They are triaged and fixed like
  any other bug (see [Reporting accessibility
  issues](#reporting-accessibility-issues)).

## What works today

### Keyboard

- Every interactive element is a native button, link or form control, or
  a Radix UI component with built-in keyboard support. No element has a
  positive `tabindex`.
- **Skip to content** is the first tab stop. After you move to another
  page, focus moves to that page's content.
- Every focused control shows a visible focus indicator.
- **Dialogs and sheets** (Options, Batch, format picker):
  - focus stays inside them while they are open;
  - Escape closes them;
  - focus then returns to the button that opened them.
- **The consent screen** keeps focus inside and must be answered; after
  you accept, focus moves to the page content.
- **The input editor:** Tab indents. To leave it, press **Escape, then
  Tab** (WCAG 2.1.2). The editor's screen-reader description and the
  status bar both say so.
- The read-only output and the other scroll areas take focus and scroll
  with the arrow and Page keys.
- **Drop zones have keyboard equivalents:** **Open** in the input panel,
  **click to browse** in Batch.

### Screen readers

- **Page structure:**
  - landmarks (banner, navigation, main, content info);
  - one `h1` per page;
  - a translated page title on every route.
- `<html lang>` follows the interface language. Each language name in the
  switcher has its own `lang`.
- **The editors:**
  - Both have names, such as "Input JSON" and "CSV output (read-only)".
  - The input editor reports whether its content parses (`aria-invalid`).
  - The input editor is described by the current error message
    (`aria-describedby`).
- **Live regions announce:**
  - parse errors with line and column, and conversion failures (as alerts);
  - the conversion state, but not the byte counts or timing;
  - batch progress and the human check;
  - the offline notice and page loading;
  - notifications.
- **States and shortcuts:**
  - Toggle buttons expose `aria-pressed`.
  - Theme choices are radio buttons, and on/off settings are switches.
  - The download and options shortcuts are exposed with `aria-keyshortcuts`.
- Decorative icons are hidden from assistive technology, and icon-only
  buttons have names.
- The editor's own announcements (search, replace, folding) and its
  search and error panels are translated into all four interface
  languages.

### Visual

- **Themes:** light, dark and system.
  - Text colours were checked against 4.5:1 on their backgrounds in both
    themes.
  - The focus indicator uses the theme's ring colour, at 3:1 or more.
- **Reduced motion:** with `prefers-reduced-motion`, animations and
  transitions are switched off, and Back to top jumps instead of scrolling.
- **Windows contrast themes** (`forced-colors`): focus, selected toggles and
  switches are drawn in system colours.
- **No meaning from colour alone:**
  - the status dot comes with a text state;
  - batch rows have icons and text;
  - the new-output dot on the narrow layout's Output tab also says "(new)".
- **Touch targets** meet WCAG 2.5.8: at least 24 × 24 CSS px, or spaced
  so that a 24 px circle around each one doesn't overlap its neighbours.

### Zoom and reflow

- **Website:** browser zoom and text resizing work, and pinch-zoom is
  never blocked.
- **Desktop apps:** from 2.2.0, Ctrl/⌘ + = and Ctrl/⌘ + − zoom the window.
  On Windows, Ctrl + mouse wheel also works.
- **Narrow screens:** the layout reflows to 320 CSS px wide without
  horizontal scrolling. It is designed for 360 × 640 and up
  ([tested viewports](docs/tested-viewports.md)).

### Language

The interface, including all screen-reader text, is available in English,
Tiếng Việt, 日本語 and 简体中文.

## Keyboard reference

| Keys | Where | Does |
| --- | --- | --- |
| Tab / Shift+Tab | Everywhere | Next / previous control |
| Enter on **Skip to content** | First Tab on a page | Jump to the page content |
| Ctrl+S (⌘S on macOS) | Converter | Download the output |
| Ctrl+, (⌘, on macOS) | Converter | Open Options |
| Escape | Dialog, sheet, Appearance menu | Close, and return focus to its button |
| ↑ ↓ Home End | Appearance menu | Move between items |
| ← → | Input / Output tabs (narrow screens) | Switch tab |
| Escape, then Tab | Input editor | Leave the editor (Tab alone indents) |
| Ctrl+M (Shift+Alt+M on macOS) | Input editor | Toggle "Tab moves focus" |
| Ctrl+] / Ctrl+[ (⌘] / ⌘[) | Input editor | Indent / outdent |
| Ctrl+F (⌘F), then F3 / Shift+F3 | Either editor | Search, next / previous match |
| Ctrl+Alt+G (⌘⌥G) | Either editor | Go to line |
| Ctrl+Shift+M (⌘⇧M), F8 | Input editor | Open the error list, next error |
| Alt+T | Anywhere | Focus notifications (pauses them) |
| Ctrl/⌘ + = and − | Desktop apps | Zoom in / out |

## How we test

### Tested with

| Date | Version | Platform | Method | Result |
| --- | --- | --- | --- | --- |
| 2026-11 | 2.1.1 | Windows 11: website in Edge, Brave and Firefox; Windows app (WebView2) | Narrator; keyboard only, no mouse (maintainer) | No blocking issues |
| 2026-11-09 | 2.2.0 | Chromium (development build) | Keyboard walk-through of the 2.2.0 changes: skip link, focus after navigation and consent, focus indicators | Pass |
| Every pull request | — | jsdom in CI | [axe-core](https://github.com/dequelabs/axe-core) on every page, the consent screen and each sheet; role and name assertions with Testing Library | Must pass |
| 2026-10-22 | 2.0.0 | Chromium device emulation, 360 × 740 to 1280 × 800, light and dark | Visual layout check | See [tested viewports](docs/tested-viewports.md) |

The automated scan runs without a real layout engine, so it can't
measure colour contrast; contrast is checked by hand.

**Not tested yet** (reports are very welcome):

- **Screen readers:** NVDA and JAWS (Windows), VoiceOver (macOS, iOS),
  TalkBack (Android), Orca (Linux).
- **Voice control:** Dragon, Voice Access.
- **On real devices:** Windows contrast themes, and Android system font
  size.

### Manual check before a release

1. **Keyboard only.** Work through every main flow:
   - convert, open a file, download;
   - run a batch to a `.zip`;
   - change options, theme and language;
   - pass the consent screen.

   Check that focus is always visible and never stuck.
2. **Screen reader.** Use Narrator, NVDA or VoiceOver for the same flows.
   Listen for names, states, errors and the conversion state.
3. **Zoom.** Check at 200 % and at 400 % in a 1280 px wide window, plus
   text-only zoom where the browser offers it.
4. **Display settings.** Check with a Windows contrast theme, with reduced
   motion, and in light and dark themes.
5. **Automated scan.** Run `npm test`, which includes the axe-core scan.

## Supported environments

| Surface | Engine | Assistive technology checked |
| --- | --- | --- |
| Website | Current Chrome, Edge, Brave, Firefox and Safari (engine floor: Chromium 111, WebKit of macOS 12) | Narrator with Edge, Brave and Firefox |
| Windows app | Microsoft Edge WebView2 | Narrator |
| macOS app (12+) | WKWebView | — |
| Linux app (Ubuntu 22.04+) | WebKitGTK | — |
| Android app (12+) | Android System WebView, Chromium 111+ | — |

## Known limitations

These are the barriers we know about, with workarounds where one exists.
They are tracked in [`docs/ROADMAP.md`](docs/ROADMAP.md).

1. **Long output in a screen reader's browse mode.** The editor keeps only
   the visible lines in the page, so a virtual cursor can't read a long
   result to the end. *Workaround:* **Copy** or **Download** the output and
   read it in another app.
2. **Tab indents in the input editor.** *Workaround:* press Escape, then
   Tab; or press Ctrl+M (Shift+Alt+M on macOS) to make Tab move focus.
3. **Small or short windows.**
   - Below about 600 CSS px of height, the editors get very short. This
     includes 400 % zoom in a 1280 px window.
   - On phones, only portrait orientation is fully supported.
   - Crossing 768 CSS px of width, for example by zooming, switches between
     the side-by-side and tabbed layouts. The editors are recreated: your
     text is kept, but focus and undo history are not.

   *Workaround:* zoom to 200–300 % instead.
4. **Human check (website only).** Cloudflare Turnstile runs in a
   Cloudflare frame, so its accessibility is Cloudflare's. If it fails or
   takes longer than 20 seconds, **Continue without the check** appears.
5. **Notifications close after 4 seconds.** Screen readers announce them
   when they appear. *Workaround:* hover them, or press Alt+T to focus and
   pause them.
6. **Low non-text contrast.** Text-field and switch outlines are below
   3:1 (WCAG 1.4.11). Every field is labelled, but the field boundary is
   faint.
7. **Unavailable formats.** The reason a format is unavailable is in its
   tooltip. Screen readers get it as the button's description, but touch
   users can't see it.
8. **New tabs aren't announced.** Links that open in a new tab, or in the
   system browser from the apps, don't say so.
9. **Desktop apps.** The smallest window is 800 × 560. Page zoom arrived
   in 2.2.0.
10. **Android app.** It uses the WebView's default handling of system font
    size and pinch-zoom, which hasn't been verified on a real device.
11. **Translations.** The Japanese and Chinese texts, including the
    screen-reader texts, are AI-generated; native speakers' fixes are
    welcome.

## Contributor expectations

Contributors check these for every change to the interface (see also
[CONTRIBUTING.md](CONTRIBUTING.md)):

- **Elements.** Use native elements or the components in
  `src/components/ui/`. Don't put click handlers on `div` or `span`, and
  don't use a positive `tabindex`.
- **Names.** Every control has an accessible name from the locale files,
  in all four languages. Icon-only buttons get `aria-label`, and
  decorative icons get `aria-hidden`.
- **Focus.**
  - Don't use `outline-none` without a `focus-visible:` replacement.
  - A scroll area that takes focus gets `role="region"` and a label.
  - The only exception is an element focused from code with
    `tabIndex={-1}`, such as `<main>`.
- **Motion and colour.** Animations go behind `motion-safe:`. Don't show
  meaning with colour alone.
- **Announcements.** Use the existing live regions, and keep
  announcements short. Don't announce text that changes on every
  keystroke.
- **Testing.**
  - `npm test` must pass, including the axe-core scan in
    `src/app/__tests__/a11y.test.tsx`. Extend the scan for new pages and
    dialogs.
  - Do a keyboard-only pass of what you changed and say so in the pull
    request.
  - A screen-reader spot check is welcome too.
- **This file.** Update it when behaviour or a known limitation changes.

## Reporting accessibility issues

Open an issue with the **[Accessibility
issue](https://github.com/poli0981/jsonPrism/issues/new?template=accessibility.md)**
template. Include:

- what you were trying to do and what happened instead;
- your assistive technology and its version;
- the browser or app version, and your operating system.

You don't need to know the cause.

If you can't or would rather not use GitHub, email
**code@poli0981.dev** with "Accessibility" in the subject. Security
problems go through [SECURITY.md](SECURITY.md) instead.

### Severity

| Severity | Meaning | Example |
| --- | --- | --- |
| Critical | Blocks a core task, with no workaround | You can't convert, open, save or get past the consent screen with your keyboard or screen reader |
| High | Major difficulty, but a workaround exists | An error is never announced, but it shows in the output panel |
| Medium | Inconsistent or confusing, but the task is possible | A wrong or missing label; focus lands in an odd place |
| Low | Minor annoyance | Verbose announcements; an untranslated hint |

### How we respond

- We thank you and ask questions if something is unclear. We never ask
  you to justify why you need an accessibility feature.
- We add the `accessibility` label, set a severity, and triage blockers
  before cosmetic issues.
- We share a workaround as soon as we know one.
- When a fix is ready, we ask you to confirm it, if you are willing. Fixes
  are listed in [CHANGELOG.md](CHANGELOG.md).

### Response times

This is best effort from a one-person project:

| Severity | First response | Fix released |
| --- | --- | --- |
| Critical | within 7 days | next patch release |
| High | within 14 days | next release |
| Medium / Low | within 30 days | when practical, usually the next minor release |

## Ownership and maintenance

Kokone ([@poli0981](https://github.com/poli0981)), the sole maintainer
(see [MAINTAINERS.md](MAINTAINERS.md)), owns accessibility. That covers:

- triaging reports;
- tracking them with the `accessibility` label;
- running the [manual check](#manual-check-before-a-release) before
  releases;
- keeping this statement current, including its review date.

## Feedback

Suggestions for this statement are welcome as an issue or a pull request.

A [Vietnamese translation](docs/i18n/vi/ACCESSIBILITY.md) is available. If
the two differ, this English version prevails.

This statement follows the structure recommended by the Open Source Guides
([Accessibility best practices for your
project](https://opensource.guide/accessibility-best-practices-for-your-project/))
and the [Open Source Accessibility
toolkit](https://github.com/open-source-accessibility/accessibility-toolkit).
