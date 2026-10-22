# Maintainers

| Name | GitHub | Contact | Scope |
|---|---|---|---|
| Kokone | [@poli0981](https://github.com/poli0981) | [code@poli0981.dev](mailto:code@poli0981.dev) | Solo maintainer — code review, releases, translations review, community |

JSONPrism is co-authored with AI tooling — see [DISCLAIMER.md](DISCLAIMER.md)
for details. The maintainer is the single point of human review for every
merged PR.

## Responsibilities

- **Code review** — reviews and merges every PR, including AI-assisted
  changes and the weekly grouped Dependabot updates, and doesn't merge on
  red CI.
- **Releases** — tags `v*` releases; `release.yml` builds the Windows,
  macOS, Linux and Android packages into a draft GitHub Release with
  `SHA256SUMS.txt` and build-provenance attestations, which the maintainer
  reviews and publishes. The website deploys itself from `main` through
  Cloudflare Workers Builds.
- **Translations review** — the AI-generated Japanese and Simplified
  Chinese strings and the partly AI-generated Vietnamese ones.
- **Community** — issues, Discussions and the Discord server, and
  enforcement of the [Code of Conduct](CODE_OF_CONDUCT.md). Vulnerability
  reports are triaged as described in [SECURITY.md](SECURITY.md).

## Contact

- Bug reports & feature requests: [GitHub Issues](https://github.com/poli0981/jsonPrism/issues)
- Discussion / Q&A: [GitHub Discussions](https://github.com/poli0981/jsonPrism/discussions)
- Community chat: [Discord](https://discord.gg/2aNR3aVt)
- Project, maintainer & Code of Conduct: [code@poli0981.dev](mailto:code@poli0981.dev)
- Security: [Private Security Advisory](https://github.com/poli0981/jsonPrism/security/advisories/new) or [security@poli0981.dev](mailto:security@poli0981.dev) — never a public issue

## Becoming a maintainer

JSONPrism is small-by-design. Additional maintainers may be added when a
contributor has demonstrated:

- Multiple high-quality merged PRs.
- Familiarity with the conventions in [CLAUDE.md](CLAUDE.md) and
  [CONTRIBUTING.md](CONTRIBUTING.md).
- Willingness to review others' PRs and respond to issues.

Until then, the project runs as a single-maintainer indie project.
