<!--
Thanks for contributing to JSONPrism!

Please fill in the sections below. PRs missing required context (no summary,
no test plan, off-topic preamble) may be closed without review.
See CONTRIBUTING.md → "Auto-ignored contributions" for what gets dismissed.

Fixing an undisclosed security vulnerability? Report it privately first
(SECURITY.md: private advisory or security@poli0981.dev) instead of
describing it in a public PR.
-->

## Summary

<!-- Required. 1–3 bullets describing WHAT changed and WHY. Link related issues. -->

-
-

Closes #

## Test plan

<!--
Required. These are the checks CI runs; tick what you ran locally.
CI must pass before the PR can be merged.
-->

- [ ] `npm run format:check`
- [ ] `npm run lint`
- [ ] `npm run knip`
- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] `npm run cf:check`
- [ ] Rust changed: `cargo fmt --check` and `cargo clippy --all-targets --locked -- -D warnings` in `src-tauri/`
- [ ] Manual smoke (describe what you clicked / loaded, and on which platform: Web / Windows / macOS / Linux / Android)

## Screenshots / recordings (UI changes only)

<!-- Drop images or short clips here. Required for any visual change. -->

## AI-assistance disclosure

<!--
JSONPrism's maintainer uses AI co-authoring openly. If an AI tool helped
with this PR (code, tests, docs or translations), say which tool and how
you used it, so reviewers can calibrate. Either way, you are responsible
for every line you submit.
-->

- [ ] No AI assistance.
- [ ] AI-assisted. Tool(s) and how they were used:

## Checklist

- [ ] My changes follow the conventions in [CLAUDE.md](https://github.com/poli0981/jsonPrism/blob/main/CLAUDE.md) and [CONTRIBUTING.md](https://github.com/poli0981/jsonPrism/blob/main/CONTRIBUTING.md).
- [ ] I added or updated tests where relevant.
- [ ] New or changed UI strings are in all four locales (`en`, `vi`, `ja`, `zh-CN`) and the i18n parity test passes.
- [ ] App code uses no ES2025 runtime APIs (Iterator helpers, `Set` methods, `Promise.try`, …).
- [ ] I updated the docs and `CHANGELOG.md` (under `[Unreleased]`) for user-visible changes.
- [ ] I did not include unrelated drive-by changes.
