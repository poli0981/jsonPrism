# Security policy

## Supported versions

JSONPrism follows [Semantic Versioning](https://semver.org/). Only the
latest minor of the current major receives security fixes.

| Version | Supported |
|---|---|
| 1.x   | ✅ |
| < 1.0 | ❌ |

## Reporting a vulnerability

**Please do not open a public GitHub Issue for security reports.**

Use GitHub's private vulnerability reporting:

→ <https://github.com/poli0981/jsonPrism/security/advisories/new>

This routes the report directly to the maintainer through a private
channel. You can include a proof-of-concept, suggested fix, and your
disclosure timeline preference.

If GitHub's private reporting is unavailable for any reason, contact
[@poli0981](https://github.com/poli0981) via the email listed on the
GitHub profile.

## Response expectations

JSONPrism is a one-person open-source project (see
[DISCLAIMER.md](DISCLAIMER.md)). Response times are best-effort:

| Severity | Initial response | Fix released |
|---|---|---|
| Critical (RCE, data exfil, auth bypass) | within 48h | best-effort patch ASAP |
| High (information disclosure, persistent XSS) | within 7 days | next release |
| Medium / Low | within 30 days | next minor release |

For the **client-side, no-server** nature of JSONPrism, "critical" issues
are realistically: malicious-input parsing crashes that lead to RCE
inside the Tauri WebView, supply-chain compromise of a dependency, or
prototype-pollution-style flaws in a converter that affects downstream
consumers of the output.

## Scope

In scope:
- Vulnerabilities in `src/` (React app, converters, batch processor).
- Vulnerabilities in `src-tauri/` (Rust shell, plugin config, CSP).
- Vulnerabilities introduced by build tooling that end up in the
  published bundle (`dist/` on GitHub Pages, Tauri release artifacts).
- Auth/identity vulnerabilities — not applicable; the app has no
  accounts, no server, no telemetry.

Out of scope:
- GitHub Pages or GitHub Actions platform issues — report to GitHub.
- WebView2 / WebKitGTK / WKWebView host bugs — report to Microsoft /
  the GTK / Apple WebKit teams. JSONPrism inherits whatever is on the
  user's system.
- Issues that require an attacker to already have local code execution
  on the user's machine.

## Acknowledgements

Reporters are credited in the published advisory unless they request
otherwise. Contributors of accepted fixes are credited in the release
notes.
