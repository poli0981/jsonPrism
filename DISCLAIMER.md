# Disclaimer

**Last updated**: 2026-10-22

## Project status

JSONPrism is a **one-person open-source project** maintained by poli0981
(Kokone, [@poli0981](https://github.com/poli0981)), written with
substantial AI assistance. It is published under the Apache 2.0 License
and the source is available on GitHub.

It is **not** a commercial product. There is no SLA, no support contract
and no warranty. See the `LICENSE` file for the exact legal text — the
Apache 2.0 disclaimer-of-warranty clause applies in full.

## Quality expectations

- The maintainer aims for production-grade quality but does not guarantee
  bug-free behaviour, performance or correctness for any particular input.
- Each conversion is implemented to a reasonable interpretation of the
  target format, but edge cases (especially in lossy formats such as XML,
  CSV and Markdown) may differ from other tools you have used.
- If you rely on JSONPrism for a critical workflow, verify the output
  yourself.

## AI-assisted code and translations

This project openly uses AI tools during development:

- **Claude Chat** and **Claude Code** — Claude Opus 4.7 and 4.8 for the 1.x
  releases, Claude Opus 5.5 for 2.0 — used for drafting code,
  refactoring, writing tests and documentation, generating translations
  and reviewing changes.
- All AI-generated code is reviewed by the maintainer before it is merged.
  Errors that slip through are bugs — please report them via
  [GitHub Issues](https://github.com/poli0981/jsonPrism/issues).

### Translations

Non-English locales (Vietnamese, Japanese, Simplified Chinese) are
produced primarily by AI translation. They are **not professionally
reviewed**, so wording, technical terms or idioms may be inaccurate.

If you are a native speaker and spot a translation issue, a pull request
or a Discussion post is very welcome.

## Third-party services

The website relies on Cloudflare for hosting, the Turnstile human check
and cookieless Web Analytics (see [PRIVACY.md](PRIVACY.md)). Their
availability is outside the maintainer's control: if Cloudflare cannot
be reached, the website lets you continue after a warning, because
conversion itself never needs the network. The desktop and Android apps
do not depend on these services.

## What this means in practice

- Do not feed JSONPrism sensitive data and ship the output to production
  without checking it.
- Do not assume that a round trip JSON → format → JSON is byte-perfect for
  lossy formats. Only JSONL, CSV, TSV, YAML, TOML and RESX convert back
  to JSON at all.
- Pin a specific JSONPrism version if you depend on its behaviour; future
  releases may change defaults.

## Reporting concerns

- Bugs: [GitHub Issues](https://github.com/poli0981/jsonPrism/issues)
- Security: [SECURITY.md](SECURITY.md)
- Translation accuracy: [GitHub Discussions](https://github.com/poli0981/jsonPrism/discussions)
- Legal: legal@poli0981.dev
