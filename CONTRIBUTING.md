# Contributing to JSONPrism

Thanks for considering a contribution! JSONPrism is an open-source project under Apache License 2.0.

## Quick start

```bash
git clone https://github.com/poli0981/jsonprism.git
cd jsonprism
npm install
npm run dev
```

Open <http://localhost:5173>.

## Before opening a PR

1. **Run the checks locally**:

   ```bash
   npm run format
   npm run lint
   npm run typecheck
   npm run build
   ```

   CI runs all four. If any fails, your PR can't be merged.

2. **Match the project style.** Read [`CLAUDE.md`](CLAUDE.md) for non-negotiable conventions (converter shape, error handling, i18n requirements).

3. **Keep PRs focused.** One feature or one fix per PR. Refactors as separate PRs.

4. **Write a clear PR description**: what changed, why, screenshots if UI.

## Ways to contribute

### 🐛 Bug reports

Use the [Bug Report](https://github.com/poli0981/jsonprism/issues/new?template=bug_report.md) template. Include:

- Browser + OS
- Steps to reproduce
- Sample JSON that triggers the bug (minimal, please)
- Expected vs actual output

### 💡 Feature requests

Use the [Feature Request](https://github.com/poli0981/jsonprism/issues/new?template=feature_request.md) template. We prioritize features that:

- Fit the "one JSON → many formats" core mission
- Don't require server-side processing (we're client-only by design)
- Have a clear use case from a real workflow

### 🌍 Translations

Currently bundled: **English**, **Tiếng Việt**, **日本語**, **简体中文**.
Non-English locales are AI-generated and not professionally reviewed —
see [DISCLAIMER.md](DISCLAIMER.md). Native-speaker corrections are very
welcome.

To add a new language:

1. Copy `src/i18n/locales/en.json` to `src/i18n/locales/<your-locale>.json`
2. Translate every value
3. Register in `src/i18n/index.ts`
4. Add to the `supportedLngs` array
5. Add the language to `LanguageSwitcher.tsx`
6. Open a PR

### ➕ Adding a new converter

See the **"Adding a new converter — checklist"** section in [`CLAUDE.md`](CLAUDE.md).

Briefly:

1. New file `src/converters/myformat.ts` implementing `Converter<TOptions>`
2. Register in `registry.ts` and `types.ts`
3. Add i18n labels (EN + VI minimum)
4. Update README format tables
5. Mark roadmap entry done

## Commit messages

We follow a relaxed version of [Conventional Commits](https://www.conventionalcommits.org):

```
feat(converter): add TOML converter with smol-toml
fix(csv): escape pipes in cell values
docs: clarify Tauri build steps
chore(deps): bump react to 19.1
```

Prefixes: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `style`.

## Auto-ignored contributions

To keep the maintainer's review queue manageable, the following are
closed without review:

- **PRs with suspicious code.** If a diff looks like obfuscated/minified
  code, hidden network calls, or subtly tampered third-party files, it
  will be flagged. If CodeQL or Dependabot also flag it, the contributor
  will be **banned** without exception. The maintainer may also verify
  suspect sections by hand.
- **PRs / issues posting unknown / random links** (especially shortened
  URLs to "demos", "fixes", etc. with no clear source).
- **Behavior / language violating GitHub's policy** — harassment, hate
  speech, doxxing, NSFW content, etc.
- **Off-topic preamble**, e.g. "Chào buổi sáng, hôm nay là 1 ngày trời
  đẹp…" or any greeting/filler that doesn't immediately address the
  issue. Get to the point: what's wrong, what's the expected behavior,
  what reproduces it.
- **PRs without a meaningful description** or test plan. See the PR
  template — sections marked required are required.

These rules exist because this is a one-person + AI-assisted project
(see [DISCLAIMER.md](DISCLAIMER.md)); time spent triaging low-effort
contributions takes away from real work.

## Code of Conduct

This project adopts the [Contributor Covenant v2.1](CODE_OF_CONDUCT.md).
Be kind. Assume good faith. Disagreements about technical choices are
fine; personal attacks and harassment are not.

Reports to the maintainer via the [private Security Advisory flow](https://github.com/poli0981/jsonprism/security/advisories/new) for sensitive matters, or a private GitHub Discussion otherwise.

## License

By contributing, you agree your contributions will be licensed under [Apache License 2.0](LICENSE).
