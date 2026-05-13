# Disclaimer

**Last updated**: 2026-05-13

## Project status

JSONPrism is a **one-person open-source project** maintained by
[@poli0981](https://github.com/poli0981) (Kokone), written with substantial
AI assistance. It is published under the Apache 2.0 License and the source
is available on GitHub.

It is **not** a commercial product. There is no SLA, no support contract,
and no warranty. See the `LICENSE` file for the exact legal text — the
Apache 2.0 disclaimer-of-warranty clause applies in full.

## Quality expectations

- The maintainer aims for production-grade quality but does not guarantee
  bug-free behavior, performance, or correctness for any particular input.
- Each conversion is implemented to a reasonable interpretation of the
  target spec, but edge cases (especially around lossy formats like XML
  and Markdown) may differ from other tools you've used.
- If you rely on JSONPrism for a critical workflow, please verify the
  output yourself.

## AI-assisted code & translations

This project openly uses AI tools during development:

- **Claude Chat** + **Claude Code (Opus 4.7, 1M context)** — used for
  drafting code, refactoring, writing tests, generating translations,
  and reviewing PRs.
- All AI-generated code is reviewed by the maintainer before being
  merged. Errors that slip through are bugs — please report them via
  [GitHub Issues](https://github.com/poli0981/jsonprism/issues).

### Translations

Non-English locales (currently Vietnamese, Japanese, Simplified Chinese)
are produced primarily by AI translation. They are **not professionally
reviewed**. Subtle wording, technical jargon, or idiomatic phrasings may
be inaccurate.

If you are a native speaker and spot a translation issue, a PR or a
Discussion post is very welcome. See the `disclaimer.translation` i18n
key — it surfaces this disclaimer to users at runtime.

## What this means in practice

- Do not feed JSONPrism sensitive data and then ship the output to
  production without checking it.
- Do not assume that round-tripping JSON → format → JSON is byte-perfect
  for lossy formats (XML, SQL, Markdown — the app marks these by not
  exposing a reverse converter).
- Pin a specific JSONPrism version if you depend on its behavior; future
  releases may change defaults.

## Reporting concerns

- Bugs: [GitHub Issues](https://github.com/poli0981/jsonprism/issues)
- Security: [Private Security Advisory](https://github.com/poli0981/jsonprism/security/advisories/new)
- Translation accuracy: GitHub Discussions
