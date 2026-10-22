# Deployment

Maintainer guide for the web app at https://jsonprism.poli0981.dev and for the
desktop / Android releases. Contributors don't need any of this: local setup is
in [dev_env.md](dev_env.md), Tauri details in [TAURI-NOTES.md](TAURI-NOTES.md).

## Quick reference

| Task | How |
| --- | --- |
| Deploy the web app | Merge or push to `main`. Cloudflare Workers Builds deploys it. |
| Check a deploy | GitHub Actions → **Production smoke** (runs on every push to `main`). |
| Roll back the web app | Dashboard → `jsonprism` Worker → **Deployments**, or `npx wrangler rollback`. |
| Preview locally | `npm run preview:cf` → http://localhost:8787 |
| Rotate the Turnstile secret | Rotate it on the widget, then update `TURNSTILE_SECRET` on the Worker. |
| Ship desktop + Android builds | Bump the versions, push a `vX.Y.Z` tag, publish the draft release. |

## Architecture

```
browser ──► jsonprism.poli0981.dev  (Cloudflare Worker "jsonprism")
              ├─ /api/*        → worker/index.ts ──► Turnstile siteverify
              └─ everything    → static assets from dist/
                 else            (_headers, _redirects, SPA fallback to index.html)
```

- One Cloudflare Worker, **`jsonprism`** (Workers Paid plan), configured in
  `wrangler.jsonc`.
- **Static assets**: the Vite build in `dist/`, served by Workers Static Assets
  with `not_found_handling: "single-page-application"`.
- **Worker code** runs only for `/api/*` (`run_worker_first: ["/api/*"]`).
  Conversion never happens on the server.

  | Route | Code | Response |
  | --- | --- | --- |
  | `POST /api/turnstile/verify` | `worker/verify.ts`, `worker/turnstile.ts` | Verifies a Turnstile token — see [Turnstile](#turnstile). |
  | `GET /api/health` | `worker/index.ts` | `{"ok":true,"service":"jsonprism"}` |
  | any other `/api/*` | `worker/index.ts` | JSON 404 |

- `worker/index.ts` may only have a default export: workerd treats every named
  export of the entry module as an entrypoint. Put helpers in other modules.
- API responses set their own headers (`worker/http.ts`: `no-store`,
  `nosniff`, `default-src 'none'`); assets get theirs from `public/_headers`.
- The Worker has its own `tsconfig.worker.json`; its runtime and binding types
  come from `npm run cf:types` (`wrangler types` → gitignored
  `worker-configuration.d.ts`).
- `compatibility_date` is pinned in `wrangler.jsonc`; move it deliberately and
  test with `npm run preview:cf`.

## Workers Builds (automatic deploys)

Configured in the Cloudflare dashboard (the `jsonprism` Worker →
**Settings → Build**), not in the repo:

| Setting | Value |
| --- | --- |
| Repository | `poli0981/jsonPrism` |
| Production branch | `main` |
| Build command | `npm run build` (may also be empty) |
| Deploy command | `npx wrangler deploy` |
| Non-production branch deploy command | `npx wrangler preview` |
| Root directory | repository root |
| Node.js | 26, from `.nvmrc` or the `NODE_VERSION` build variable |

- `wrangler.jsonc` → `build.command` runs `npm run build` before every
  `wrangler deploy`, `preview` and `dev`, so a deploy works even with no build
  command in the dashboard (setting one only builds twice).
- Workers Builds installs dependencies with `npm clean-install` using its own
  npm (10.9.2 at the time of writing). The lockfile must stay installable with
  that npm: a peer-dependency conflict fails the build at the install step
  (this kept `main` undeployable before 2.0.0).

### Previews (pull requests and other branches)

Non-production branches run `npx wrangler preview`, which publishes a
[Worker Preview](https://developers.cloudflare.com/workers/previews/) named
after the branch (`<branch>-jsonprism.<subdomain>.workers.dev` when workers.dev
is enabled) and reports it on the pull request.

- Previews inherit no production vars or bindings. `wrangler.jsonc` → `previews`
  declares them again: a separate rate-limit counter (`namespace_id` 4202) and
  an empty `ALLOWED_HOSTNAMES`. Any binding added at the top level needs a
  preview-safe twin there, or `wrangler preview` fails with "missing a
  `previews` block".
- Previews get no `TURNSTILE_SECRET` (set one with
  `npx wrangler preview base-config secret put` only if you need the check on
  previews), and the production sitekey doesn't run on preview hostnames, so
  the human check reports "unavailable" and testers continue past it. Web
  Analytics never loads there.

- Every push to `main` builds and deploys. No GitHub Action deploys the web
  app, and GitHub holds no Cloudflare credentials.
- The build stamps the short commit (`WORKERS_CI_COMMIT_SHA`) into
  `<meta name="jsonprism-commit">` and the header's version chip; the smoke
  workflow uses it to recognise the new deploy.
- A failed build leaves the previous version live. Build logs exist only in the
  dashboard (the Worker's build history).
- Changes to `wrangler.jsonc` (route, vars, bindings) apply on the next deploy.
  CI's `npm run cf:check` (`wrangler deploy --dry-run`) catches config and
  bundling errors before merge.

## Custom domain

- `routes: [{ "pattern": "jsonprism.poli0981.dev", "custom_domain": true }]`:
  Cloudflare manages the DNS record and certificate for the hostname. The
  `poli0981.dev` zone is on the same account.
- `workers_dev: false` — there is no `*.workers.dev` URL.
- Changing the hostname touches more than the route. Search the repo for
  `jsonprism.poli0981.dev` (`wrangler.jsonc` route and `ALLOWED_HOSTNAMES`,
  `src/lib/analytics.ts`, `src/lib/links.ts`, `index.html`, `public/`,
  `.github/pages-redirect/`, the workflows, the legal docs), then update the
  Turnstile widget's hostnames and the Web Analytics site in the dashboard.

## Secrets and variables

| Name | Kind | Where |
| --- | --- | --- |
| `TURNSTILE_SECRET` | Secret | Worker → **Settings → Variables and Secrets**, or `npx wrangler secret put TURNSTILE_SECRET`. Never in the repo. |
| `ALLOWED_HOSTNAMES` | Variable | `wrangler.jsonc` → `vars`: comma-separated hostnames a Turnstile token may be issued on. |
| `VERIFY_LIMITER` | Binding | `wrangler.jsonc` → `ratelimits` — see [Rate limiting](#rate-limiting). |

- Plain variables added in the dashboard are replaced by `wrangler.jsonc` `vars`
  on every deploy (`keep_vars` is off); secrets are kept. The sitekey needs no
  Worker variable — it is compiled into the frontend.
- Without `TURNSTILE_SECRET`, `/api/turnstile/verify` answers 503 and Workers
  Logs record `outcome: "misconfigured"`; a wrong secret also gives 503
  (`detail: "misconfigured-secret"`). Users can still continue past the check,
  so nothing looks broken — watch the logs after changing it.
- Locally, `.dev.vars` (copied from `.dev.vars.example`) holds Cloudflare's
  always-pass test secret. With it the Worker also accepts loopback and plain
  `http` origins, because `wrangler dev` rewrites the request URL and `Origin`
  to the route host. That secret proves nothing, so nothing is lost.

## Turnstile

- **Widget**: Cloudflare dashboard → **Turnstile** → the JSONPrism widget. The
  sitekey `0x4AAAAAAFgqIzSPBs9hZJnX` is public by design and lives in
  `src/lib/turnstile.ts`; its secret is `TURNSTILE_SECRET`.
- **Hostname management**: the widget's hostname list must contain
  `jsonprism.poli0981.dev` — keep it in step with `ALLOWED_HOSTNAMES`. Localhost
  doesn't need to be listed: on `localhost` / `127.0.0.1` the app uses
  Cloudflare's test sitekey instead.
- **What the Worker checks**: an HTTPS `Origin` from an allowed hostname,
  `Content-Type: application/json`, a body of at most 4 KB, the rate limit,
  then Cloudflare siteverify (8 s timeout, one retry with the same idempotency
  key; the visitor IP is not sent). Tokens are rejected when their hostname is
  not allowed, their action is not `gate`, or they are older than 300 s.
- **Responses**: 200 verified (with `verifiedUntil`, 7 days ahead) · 400 bad
  JSON or token · 403 foreign origin or rejected token · 405 not POST · 413
  body too large · 415 not JSON · 429 rate limited · 503 secret missing or
  Cloudflare unreachable.
- **Client behaviour**: a pass is remembered for 7 days (`jsonprism.humanCheck`
  in localStorage). 400/403 keep the Consent Gate closed; anything else
  (offline, blocked script, 429, 5xx, timeout) lets the user continue after a
  warning, because conversion never needs the network.
- **Rotating the secret**: rotate it on the widget, then update
  `TURNSTILE_SECRET` on the Worker straight away.

## Web Analytics

- Cloudflare dashboard → **Web Analytics** → site `jsonprism.poli0981.dev`.
  Token `f1f718464e5a417997c84170ddbec2b6` (public, in `src/lib/analytics.ts`).
- **Manual beacon**: the app adds `beacon.min.js` itself, and only when all of
  these hold — production hostname, Consent Gate accepted, "Anonymous usage
  analytics" on in the Appearance menu (on by default, off by default when the
  browser sends Global Privacy Control). Never in desktop or Android builds,
  local previews or dev.
- **Keep automatic injection OFF** in the site's Web Analytics settings.
  Automatic setup adds the beacon to every page before consent and ignores the
  user's setting.
- The CSP already allows `static.cloudflareinsights.com` (script) and
  `cloudflareinsights.com` (reports).

## Zone settings to keep off

These zone features rewrite HTML or inject scripts the app doesn't expect; with
the strict CSP they break pages or fill the console with violations. Keep them
off for `poli0981.dev` (or at least for this hostname):

| Setting | Why |
| --- | --- |
| Rocket Loader | Rewrites the app's `<script>` tags and runs them through its own loader. |
| Email Address Obfuscation | Rewrites email addresses and injects a decoder script. |
| Web Analytics automatic injection | Loads the beacon without consent; the app loads it itself. |

HTML is also served with `Cache-Control: no-cache, no-transform`
(`public/_headers`) so Cloudflare shouldn't rewrite it, but don't rely on that
alone. Recheck these settings after any zone-wide change.

## Static headers and redirects

Vite copies `public/` into `dist/`; Workers Static Assets applies `_headers` and
`_redirects` to asset responses.

`public/_headers`:

| Header | Value |
| --- | --- |
| `Content-Security-Policy` | `default-src 'self'`; scripts from self, `static.cloudflareinsights.com` and `challenges.cloudflare.com`; `connect-src` self + `cloudflareinsights.com`; `frame-src` Turnstile; `worker-src 'self'`; `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'`, `upgrade-insecure-requests`. `style-src` keeps `'unsafe-inline'` (CodeMirror, Radix and Sonner inject styles at runtime). |
| `Strict-Transport-Security` | `max-age=31536000`, deliberately without `includeSubDomains` |
| `X-Content-Type-Options`, `X-Frame-Options` | `nosniff`, `DENY` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | camera, microphone, geolocation, motion sensors, payment, USB and Topics all disabled |
| `Cross-Origin-Opener-Policy` | `same-origin` |
| `Cache-Control` | HTML `no-cache, no-transform`; `/assets/*` `public, max-age=31536000, immutable` (hashed file names) |

- A new third-party script, frame or connection needs a CSP change here; check
  the console in `npm run preview:cf` afterwards. The desktop CSP is separate
  (`tauri.conf.json`) and stays free of third-party hosts.
- `public/_redirects`: `/jsonPrism` and `/jsonPrism/*` → 301 to the same path
  without the old GitHub Pages prefix.
- Also in `public/`: `robots.txt`, `sitemap.xml` (update `lastmod` when pages
  change), `.well-known/security.txt` (**expires 2027-10-01 — renew it before
  then**), `og-image.png`, and `theme-init.js` (applies the theme before first
  paint without an inline script).

## Rate limiting

- Binding `VERIFY_LIMITER` (`ratelimits` in `wrangler.jsonc`, `namespace_id`
  `4201`): 30 requests per 60 s per client, keyed on `CF-Connecting-IP`. The IP
  is only the key; it is never logged.
- Over the limit → 429 `rate_limited` with `Retry-After: 60`. The app treats
  that as "check unavailable" and lets the user continue.
- To change it, edit `simple.limit` / `simple.period` and deploy. Keep
  `namespace_id` unique within the Cloudflare account.

## Workers Logs

- `observability.enabled: true`, `head_sampling_rate: 1` (every request). Read
  them in the dashboard (the Worker's logs / observability view) or live with
  `npx wrangler tail`.
- The verify endpoint writes one structured line per request:
  `{"event":"turnstile.verify","outcome":…,"status":…,"colo":…,"ms":…}`, plus
  `codes` for rejections and `detail` when Cloudflare was unavailable.
  Outcomes: `verified`, `rejected`, `bad-origin`, `bad-method`,
  `bad-content-type`, `too-large`, `rate-limited`, `bad-json`, `bad-token`,
  `misconfigured`, `unavailable`.
- Never log IPs, tokens or user content (`logEvent()` in `worker/http.ts`).
  Source maps are not uploaded (`upload_source_maps: false`).

## Local preview

```bash
cp .dev.vars.example .dev.vars   # once
npm run preview:cf               # wrangler dev (builds first) → http://localhost:8787
```

- Serves `dist/` with `_headers`, `_redirects` and the SPA fallback, plus the
  Worker — the closest thing to production. Turnstile uses the test sitekey and
  passes on its own; Web Analytics never loads (wrong hostname).
- `npm run cf:check` is CI's deploy dry run; `npm run cf:types` regenerates
  the Worker types after binding changes.

## Production smoke

`.github/workflows/production-smoke.yml` runs on every push to `main` and on
demand:

1. Waits up to 15 minutes for https://jsonprism.poli0981.dev/ to serve
   `<meta name="jsonprism-commit">` with the pushed commit (skipped on manual
   runs).
2. Checks the CSP, HSTS, `nosniff` and `X-Frame-Options` headers; `/about` → 200
   (SPA fallback); `/jsonPrism/about` → 301 to `/about`; `/api/health`; the
   `security.txt` contact; and that `/api/turnstile/verify` answers 403 to a
   foreign `Origin`.

Failures reach Discord through `notify-ci-failure.yml`. When the wait step times
out, check the build in the Cloudflare dashboard first. Run the workflow by hand
after a rollback or a dashboard change.

## Rollback

- **Dashboard**: the `jsonprism` Worker → **Deployments** → the last good
  version → **Rollback**.
- **CLI**: `npx wrangler deployments list`, then
  `npx wrangler rollback [version-id] -m "reason"` (without an ID it goes back
  to the previous version). Needs `npx wrangler login` with access to the
  account.
- A rollback doesn't touch `main`: revert the bad commit too, or the next push
  deploys it again. Then run **Production smoke** by hand.

## GitHub Pages redirect

- https://poli0981.github.io/jsonPrism/ serves only
  `.github/pages-redirect/index.html` and `404.html` (identical): a script that
  drops the `/jsonPrism` prefix and keeps the rest of the path, the query and
  the hash; a 3-second meta refresh to the home page when JavaScript is off;
  `noindex`.
- Deploy it by hand — Actions → **Pages redirect** → Run workflow — and only
  after changing `.github/pages-redirect/`. Repository Settings → Pages →
  Source must stay **GitHub Actions**.
- Keep it online: old links in YouTube descriptions, Discord and READMEs point
  there.

## SonarQube Cloud

- Organization `poli0981`, project key `poli0981_jsonPrism`, settings in
  `sonar-project.properties`.
- CI-based analysis: job `sonar` in `ci.yml` runs after `web` with the
  `SONAR_TOKEN` repository secret and the coverage artifact
  (`coverage/lcov.info`).
- **Automatic Analysis must stay OFF** (SonarQube Cloud → project →
  Administration → Analysis Method); with it on, the CI scan fails.
- Without `SONAR_TOKEN` (Dependabot and fork PRs) the job skips instead of
  failing. The quality gate is reported, not enforced
  (`sonar.qualitygate.wait=false`).
- CodeQL runs through GitHub's default setup (no workflow file).

## Releases (desktop + Android)

The web app ships continuously from `main`; tags are for the desktop and
Android builds.

1. **Bump the version** on `main`:
   - `npm version X.Y.Z --no-git-tag-version` — updates `package.json` and
     `package-lock.json`; `tauri.conf.json` reads its version from
     `package.json`.
   - `version` in `src-tauri/Cargo.toml`, then refresh `Cargo.lock` (e.g.
     `cargo check` in `src-tauri/`) — CI runs clippy with `--locked`.
   - `bundle.android.versionCode` in `src-tauri/tauri.conf.json`:
     `MAJOR*10000 + MINOR*100 + PATCH` (2.0.0 → 20000).
   - `CHANGELOG.md`.
2. **Tag** the merged commit (signed, like earlier tags) and push the tag:

   ```bash
   git tag -s vX.Y.Z -m "JSONPrism vX.Y.Z"
   git push origin vX.Y.Z
   ```

3. **`release.yml`** checks tag = `package.json` = `Cargo.toml`, runs the
   tests, creates one draft release, builds Windows (`.msi`, NSIS `.exe`),
   macOS universal (`.dmg`, `.app.tar.gz`), Linux (`.deb`, `.rpm`, `.AppImage`)
   and the signed Android APK (`JSONPrism_<version>_android-universal.apk`),
   then adds `SHA256SUMS.txt` and build-provenance attestations. Details in
   [TAURI-NOTES.md](TAURI-NOTES.md#release-workflow).
4. **Review the draft** (every asset present, notes taken from the changelog),
   then **Publish**. Publishing triggers `announce-release.yml` (Discord) and
   `announce-discussion.yml` (Discussions → Announcements).
5. **Rebuild a tag**: Actions → **Release Tauri bundles** → Run workflow with
   the tag. It reuses the draft and refuses once the release is published.

The bundles are not code-signed yet, so Windows SmartScreen and macOS
Gatekeeper warn on first launch.

### Repository secrets

| Secret | Used by |
| --- | --- |
| `SONAR_TOKEN` | `ci.yml` (job `sonar`) |
| `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_PASSWORD`, `ANDROID_KEY_ALIAS` | `release.yml` (job `android`) — see [TAURI-NOTES.md](TAURI-NOTES.md#ci-signing-secrets) |
| `DISCORD_RELEASES_WEBHOOK`, `DISCORD_REPO_WEBHOOK`, `DISCORD_PING_ROLE_ID` | `announce-release.yml` |
| `DISCORD_CI_WEBHOOK` | `notify-ci-failure.yml` (CI and Production smoke failures) |
| `DISCORD_RELEASE_PIPELINE_WEBHOOK` | `notify-release-pipeline.yml` |

The Discord workflows call reusable workflows from `poli0981/.github`, pinned
to a commit, and receive only these secrets (no `secrets: inherit`).
