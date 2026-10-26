# Privacy Policy

**Version**: 2.0 · **Effective**: 2026-10-22 · Replaces the policy of 2026-05-13.

## Short version

- **Your data stays on your device.** JSON, files and output are converted
  in your browser or in the desktop/Android app. They are never uploaded,
  and JSONPrism has no account system, no cloud sync and no error reporting.
- **The website** (<https://jsonprism.poli0981.dev>) is hosted on
  Cloudflare. It runs a quick Cloudflare Turnstile human check when you
  first open it (and again every 7 days), and it counts page views with
  Cloudflare Web Analytics, which uses no cookies. You can switch the
  analytics off under **Appearance**; it starts off if your browser sends
  [Global Privacy Control](https://globalprivacycontrol.org/).
- **The desktop and Android apps** make no network requests of their own
  and use none of the Cloudflare services.

## Who is responsible

JSONPrism is an open-source project maintained by one person, poli0981
(Kokone), who is the controller for the processing described here.
Privacy questions and requests: **privacy@poli0981.dev**.

## What happens on each surface

| Surface | Hosting / runtime | What leaves your device |
|---|---|---|
| Website | Cloudflare Workers (static files plus a small API for the human check) | Standard HTTP request data needed to deliver the site; the Turnstile check; anonymous page-view metrics if analytics is on. Never the data you convert. |
| Windows, macOS, Linux app | Tauri 2, runs locally | Nothing from app code. Links you click open in your browser. |
| Android app | Tauri 2 in the system WebView | Nothing from app code. Links you tap open in your browser. |

### Hosting (website)

Cloudflare, Inc. serves the website and processes the data every web
request carries (IP address, user agent, requested URL, time, TLS details)
to deliver pages and protect the service against abuse. JSONPrism's own
server code answers only the human-check API (`/api/turnstile/verify`) and
a health check, and counts page and API requests against a per-client rate
limit before serving them. It records structured events — outcome, HTTP
status, the Cloudflare data centre code, duration, Turnstile error codes
and refused over-limit requests — in Cloudflare Workers Logs, kept for 7
days. These events never contain IP addresses, Turnstile tokens or anything
you convert. The rate-limit counters are kept by Cloudflare, keyed on your
IP address (for IPv6, its /64 network); JSONPrism does not store the key.

### Human check (website)

[Cloudflare Turnstile](https://www.cloudflare.com/products/turnstile/)
tells people and bots apart without puzzles. When the check runs, your
browser loads Cloudflare's script from `challenges.cloudflare.com`, which
collects signals such as your IP address, TLS fingerprint, user agent and
the site key, as described in Cloudflare's
[Turnstile Privacy Addendum](https://www.cloudflare.com/turnstile-privacy-policy/).
JSONPrism's server then sends the resulting one-time token — not your IP
address — to Cloudflare's verification API. If the check passes, your
browser stores the expiry time (`jsonprism.humanCheck`) and is not asked
again for 7 days.

### Web Analytics (website, optional)

[Cloudflare Web Analytics](https://www.cloudflare.com/web-analytics/)
counts page views and measures load performance (page path, referrer,
browser and device type, timing metrics). It sets no cookies, uses no
local storage and, according to Cloudflare, does not collect or use
visitors' personal data. JSONPrism loads it only on the production
website, only after you have accepted the terms, and only while
**Appearance → Anonymous usage analytics** is on. The setting starts off
when your browser sends Global Privacy Control, and turning it off takes
effect from your next visit.

### Desktop and Android apps

- No telemetry, no analytics, no Turnstile, no update checks.
- Files reach the app only when you pick them in a system dialog or drop
  them onto the window. The app can read files you choose and write only
  where you choose to save; its static file access is limited to your
  Documents, Downloads and Desktop folders and never includes hidden
  files such as `~/.ssh`
  (see [`src-tauri/capabilities/default.json`](src-tauri/capabilities/default.json)).
- The Android app declares the `INTERNET` permission because the Tauri
  WebView runtime requires it; JSONPrism's code makes no network requests.
  Android backups of the app's data are disabled.

## What is stored on your device

The app keeps these entries in your browser's (or the app WebView's)
`localStorage`. They never leave your device.

| Key | Contents |
|---|---|
| `jsonprism.consent` | That you accepted the License, Terms, Privacy Policy and Disclaimer: flag, policy version, time |
| `jsonprism.humanCheck` | Website only: when the passed human check expires |
| `jsonprism.prefs` | Appearance preferences: hide scrollbars, anonymous analytics on/off |
| `jsonprism.theme` | `light`, `dark` or `system` |
| `jsonprism.lang` | Interface language (`en`, `vi`, `ja`, `zh-CN`) |
| `jsonprism.selected_format` | The target format you last selected |
| `jsonprism.direction` | Conversion direction |
| `jsonprism.options.<format>` | Your options for each format |

`sessionStorage` briefly holds `jsonprism.preloadReload` (when the app
last reloaded itself after a new release). Clearing the site's data, or
uninstalling the app, removes all of it.

The app also keeps its most recent 200 log lines in memory, for
**About → Copy diagnostics**. They are never sent anywhere; the button
copies them to your clipboard, together with the version, commit and
platform, so you can choose to paste them into a bug report.

## What JSONPrism never does

- Upload, store or inspect what you convert.
- Use cookies, advertising or cross-site tracking.
- Sell or share personal information.
- Load fonts or scripts from third parties other than the two Cloudflare
  services above (fonts are bundled with the app).
- Report errors to a remote service.

## Legal bases (EU/EEA, UK)

- Hosting, security, abuse prevention and the human check: legitimate
  interests in running a public website safely (GDPR Art. 6(1)(f)).
- Anonymous page-view statistics: legitimate interest in understanding,
  in aggregate, how the website is used, with an easy opt-out and Global
  Privacy Control honoured (Art. 6(1)(f)).
- Preferences stored on your device: strictly necessary to provide the
  features you use.

You may object to processing based on legitimate interests at any time by
writing to privacy@poli0981.dev; for analytics, switching it off in
Appearance is enough.

## International transfers

Cloudflare operates worldwide, so request data may be processed outside
your country, including in the United States. Cloudflare is certified
under the EU-U.S. Data Privacy Framework (and its UK and Swiss
extensions) and its data processing addendum includes the EU Standard
Contractual Clauses. See [Cloudflare's privacy policy](https://www.cloudflare.com/privacypolicy/).

## Retention

- Data on your device: until you clear it; the human check expires after
  7 days, and acceptance is asked again whenever this policy's version
  changes.
- Workers Logs for the human-check API: 7 days.
- Request processing and analytics data held by Cloudflare: according to
  Cloudflare's own retention schedules; Web Analytics shows aggregated
  figures only.

## Your rights

Depending on where you live (for example under the GDPR, UK GDPR or the
California CCPA/CPRA) you may have the right to access, correct, delete,
restrict or object to the processing of personal data about you, to data
portability, and to lodge a complaint with your data protection
authority. JSONPrism itself holds no personal data about you beyond what
Cloudflare processes on its behalf, so most requests are best served by
clearing the site's data; for anything else write to
privacy@poli0981.dev and you will get an answer within 30 days. JSONPrism
does not sell or share personal information and honours Global Privacy
Control.

## Children

JSONPrism is a developer tool and is not directed at children under 13
(or under the age of digital consent where you live).

## Changes to this policy

Changes are listed in [CHANGELOG.md](CHANGELOG.md). When this policy
changes materially its version number increases, and the app asks you to
accept it again before you continue.

## Contact

- Privacy: privacy@poli0981.dev
- Security vulnerabilities: see [SECURITY.md](SECURITY.md)
- Everything else: [GitHub Issues](https://github.com/poli0981/jsonPrism/issues)
