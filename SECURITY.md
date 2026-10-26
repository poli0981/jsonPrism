# Security policy

## Supported versions

JSONPrism follows [Semantic Versioning](https://semver.org/). Only the
latest release of the current major version receives security fixes; the
website always runs the latest code on `main`.

| Version | Supported |
|---|---|
| 2.x   | ✅ |
| < 2.0 | ❌ |

## Reporting a vulnerability

**Please do not open a public GitHub Issue for security reports.**

Use GitHub's private vulnerability reporting:

→ <https://github.com/poli0981/jsonPrism/security/advisories/new>

This reaches the maintainer through a private channel. Include a
proof of concept, a suggested fix if you have one, and your preferred
disclosure timeline.

If you cannot use GitHub, email **security@poli0981.dev**. The same
contacts are published in
[`/.well-known/security.txt`](https://jsonprism.poli0981.dev/.well-known/security.txt).

## Response expectations

JSONPrism is a one-person open-source project (see
[DISCLAIMER.md](DISCLAIMER.md)). Response times are best effort:

| Severity | Initial response | Fix released |
|---|---|---|
| Critical (code execution, data exfiltration, supply-chain compromise) | within 48 h | as soon as possible |
| High (information disclosure, persistent XSS, CSP bypass) | within 7 days | next release |
| Medium / Low | within 30 days | next minor release |

Conversion runs entirely on the user's device, so realistic critical
issues are: malicious input that achieves code execution in the browser
or the Tauri WebView, a compromised dependency, a converter flaw that
produces output dangerous to downstream consumers (for example SQL or
CSV injection beyond what the options document), or a weakness in the
website's edge configuration.

## Scope

In scope:

- `src/` — the React app, converters and batch processor.
- `worker/` — the Cloudflare Worker (per-client rate limits for the whole
  site, `/api/turnstile/verify`, `/api/health`): rate limiting, origin
  checks, request validation.
- Website edge configuration: `public/_headers` (CSP and security
  headers), `public/_redirects`, `wrangler.jsonc`.
- `src-tauri/` — the Rust shell, capabilities, file-system scope and CSP.
- Build and release tooling whose output ships to users: the website
  build, Tauri release artifacts and `.github/workflows/`.

Out of scope:

- Cloudflare, GitHub Pages or GitHub Actions platform issues — report them
  to Cloudflare or GitHub.
- WebView2 / WebKitGTK / WKWebView / Android System WebView bugs — report
  them to their vendors. JSONPrism uses whatever is installed on the
  user's system.
- Turnstile bypasses that only affect Cloudflare's challenge itself.
- Attacks that require existing local code execution on the user's
  machine.
- Missing best-practice headers with no demonstrable impact.

## Verifying releases

Every GitHub release includes `SHA256SUMS.txt` and build-provenance
attestations generated in GitHub Actions:

```bash
sha256sum -c SHA256SUMS.txt --ignore-missing
gh attestation verify JSONPrism_2.0.0_x64-setup.exe --repo poli0981/jsonPrism
```

The desktop installers are not yet code-signed, so Windows SmartScreen
and macOS Gatekeeper may warn on first launch.

## Acknowledgements

Reporters are credited in the published advisory unless they ask
otherwise. Contributors of accepted fixes are credited in the release
notes.
