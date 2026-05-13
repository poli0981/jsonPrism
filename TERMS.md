# Terms of Service / EULA

**Last updated**: 2026-05-13

JSONPrism is a one-person, AI-assisted open-source project published by
[@poli0981](https://github.com/poli0981) under the [Apache License 2.0](LICENSE).
This page sets out the terms under which you may use the website, the
desktop application, the source repository, and any associated assets
(collectively, "JSONPrism").

By using JSONPrism in any form, you agree to the terms below. If you do
not agree, stop using it.

---

## 1. Acceptance

Accessing the web app at <https://poli0981.github.io/jsonprism/>,
running the Tauri desktop bundle, cloning or downloading the repository,
or otherwise interacting with the project constitutes acceptance of
these terms.

## 2. GitHub Terms of Service

The repository, issues, discussions, releases, and pull requests are
hosted on GitHub. You agree to use them in compliance with:

- [GitHub Terms of Service](https://docs.github.com/en/site-policy/github-terms/github-terms-of-service)
- [GitHub Acceptable Use Policies](https://docs.github.com/en/site-policy/acceptable-use-policies/github-acceptable-use-policies)
- [GitHub Privacy Statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement)

Behavior that violates GitHub's platform rules is also a violation of
these terms.

## 3. License inheritance

JSONPrism source code is licensed under the
[Apache License, Version 2.0](LICENSE). You may use, modify, and
redistribute the code subject to that license — most importantly, you
must preserve copyright notices and the license text in distributions.

The project consumes third-party libraries with their own licenses. See
[THIRD-PARTY.md](THIRD-PARTY.md) for the full list. When redistributing
JSONPrism or a derivative, you are responsible for satisfying the terms
of every upstream dependency.

## 4. No warranty / limitation of liability

JSONPrism is provided **"AS IS"**, without warranty of any kind, express
or implied, including (but not limited to) warranties of merchantability,
fitness for a particular purpose, and non-infringement. The maintainer
is not liable for any claim, damages, or other liability arising from
your use of the software.

This restates the disclaimer in the Apache 2.0 license — see
[DISCLAIMER.md](DISCLAIMER.md) for the project's own framing of the
"one-person + AI-assisted" reality.

## 5. User data ownership

You own everything you paste, drop, type, or generate in JSONPrism.

- The maintainer does not receive, store, transmit, or analyze your
  input or output. The web build is a static GitHub Pages deploy with no
  server-side code; the desktop bundle runs entirely on your machine.
- The only on-disk footprint is a small set of `localStorage` preferences
  (theme, language, selected format, direction, per-format options) —
  documented in [PRIVACY.md](PRIVACY.md).
- You are responsible for the legality of the data you feed in. If you
  paste copyrighted, classified, or otherwise restricted data, the
  responsibility is yours.

## 6. Acceptable use

You may not:

- Use JSONPrism, the repository, or its assets to facilitate activity
  that violates applicable law in your jurisdiction or the jurisdiction
  where the data was sourced.
- Process **regulated personal data** (PHI, PCI, biometric, etc.) on the
  publicly hosted web build. If your environment requires such handling,
  build the Tauri desktop bundle yourself from source and run it
  air-gapped.
- Submit pull requests or content that the maintainer determines
  contains hidden malicious code, obfuscated payloads, or supply-chain
  attack vectors. See [CONTRIBUTING.md](CONTRIBUTING.md) "Auto-ignored
  cases" for the enforcement rules — repeat offenders are banned from
  the repository.
- Reverse-engineer the Tauri desktop bundle's capability scope to bypass
  the filesystem / dialog / shell restrictions configured in
  `src-tauri/capabilities/default.json`. This is enforced by Tauri's
  runtime; circumventing it is a violation of these terms.
- Misrepresent JSONPrism as an official, certified, or guaranteed
  product. It is a one-person indie project (see
  [MAINTAINERS.md](MAINTAINERS.md)).

## 7. Trademarks

"JSONPrism" and the prism logo are project marks of the maintainer.
You may reference the project, but do not imply official endorsement of
your derivative product without prior written permission.

## 8. Modifications

The maintainer may update these terms. Material changes are recorded in
[CHANGELOG.md](CHANGELOG.md) under the corresponding release. Continued
use after a change constitutes acceptance of the updated terms.

## 9. Termination

The maintainer may, at any time and at sole discretion, restrict access
to the repository or block contributions from a user whose behavior
violates these terms or [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). Such
restrictions do not revoke the Apache 2.0 license already granted on
existing distributions.

## 10. Contact

- General contact: see [MAINTAINERS.md](MAINTAINERS.md).
- Security: see [SECURITY.md](SECURITY.md) for the private vulnerability
  reporting flow.
- Privacy questions: see [PRIVACY.md](PRIVACY.md).
