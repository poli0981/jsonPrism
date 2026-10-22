// Applies the saved theme and display preferences before the first paint so
// the page never flashes the wrong theme. Loaded as a blocking external script
// (not inline) so the Content-Security-Policy can stay free of 'unsafe-inline'.
// Mirrors src/lib/theme.tsx and src/stores/preferencesStore.ts — keep the
// storage keys and colors in sync with those files.
(function () {
  var root = document.documentElement;
  var theme = 'system';
  var hideScrollbars = false;
  try {
    var stored = window.localStorage.getItem('jsonprism.theme');
    if (stored === 'light' || stored === 'dark' || stored === 'system') theme = stored;
    var prefs = JSON.parse(window.localStorage.getItem('jsonprism.prefs') || 'null');
    hideScrollbars = !!(prefs && prefs.hideScrollbars === true);
  } catch (e) {
    // Blocked storage: fall back to the system theme.
  }
  // Same default as systemTheme() in src/lib/theme-dom.ts: dark when the
  // browser cannot report a preference.
  var dark =
    theme === 'dark' ||
    (theme === 'system' &&
      (!window.matchMedia || window.matchMedia('(prefers-color-scheme: dark)').matches));
  root.classList.toggle('dark', dark);
  root.style.colorScheme = dark ? 'dark' : 'light';
  if (hideScrollbars) root.setAttribute('data-scrollbars', 'hidden');
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', dark ? '#0b0c14' : '#fbfbfe');
})();
