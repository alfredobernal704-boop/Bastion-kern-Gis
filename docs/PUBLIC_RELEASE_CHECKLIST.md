# Public release readiness and security review

This checklist records source-level findings from the repository review. It is not a penetration test, dependency audit, legal review, or certification that the application is secure for production. Complete the required owner-side and deployment checks before changing repository visibility or announcing a public production service.

## Changes made on this branch

- Removed the committed Mapbox public access token fallback from the web app. Developers now provide a token through ignored local configuration or an environment variable.
- Replaced the real token in the Android local-properties example with a clearly nonfunctional placeholder.
- Simplified the dev container from a very large collection of unrelated, third-party features to the project image and its Node dependency installation. This reduces supply-chain surface and makes container startup relevant to the actual project.

A Mapbox `pk` token is a public/browser token, not a secret credential. Its prior presence is still a configuration risk: restrict it by permitted URLs and minimum required scopes, monitor usage, and rotate/revoke it if it was not intended to be public or shows unexpected use. Never put a Mapbox secret/download token in browser code or a committed example.

## Findings to resolve before public production

### High priority

- **Mapbox access and style:** `apps/web/src/config.js` referenced a public token, and the custom style in that file and `docs/map-style.json` is described as private. Confirm the style is intentionally shareable, set URL restrictions and least-privilege scopes on public tokens, and validate the app using a newly issued token. The app now displays its existing missing-token state until configured.
- **Repository contents and submodules:** `.gitmodules` registers numerous unrelated upstream projects (including OSINT, generic Python algorithms, iOS apps, `llama.cpp`, and Mapbox GL JS). Review every submodule's purpose, license, pinned commit, and public redistribution implications. Remove unneeded entries only after the maintainers confirm they are not intentional dependencies; do not blindly publish vendored or unrelated repositories.
- **Production API exposure:** `apps/api/server.mjs` is a small unauthenticated event-feed proxy with in-memory caching. Before exposing it publicly, deploy behind HTTPS and appropriate network controls, define a strict `APP_ORIGIN`, rate-limit requests at the edge, monitor resource usage, and test the provider allowlist against redirects, DNS/private-address behavior, malformed configuration, and oversized responses. The code currently rejects redirects and caps response size, but this review did not execute adversarial tests.
- **Public data/privacy terms:** verify the terms and attribution requirements of every feed, map, routing, search, and analytics service. The UI sends place searches to Mapbox and explicitly discloses that the public OSRM demo receives route coordinates. Do not treat the public OSRM demo as a production service. Keep precise user location and routes out of analytics and server logs.

### Important

- Inspect the complete Git history and all branches for secrets before making the repository public. Removing a token from the current tree does not erase it from prior commits. Use GitHub secret scanning/push protection where available; rotate any actual secret found in history.
- Review all committed files, Git LFS objects, releases, Actions artifacts, and submodule references for credentials, personal information, internal URLs, and material that cannot be redistributed. A source-tree review cannot certify history or external submodules.
- Run dependency vulnerability checks against the lockfiles and update vulnerable dependencies. `apps/web/package-lock.json` and `apps/api/package-lock.json` exist; this review did not run `npm audit` or inspect live advisory data.
- The CI workflow currently runs `npm install` rather than `npm ci` for the web app. Prefer reproducible lockfile installs and make CI fail if the health endpoint never becomes ready. Confirm current Actions versions and pin third-party actions to reviewed immutable SHAs for a higher-assurance public supply chain.
- Validate GeoJSON size, feature count, and geometry before passing imported data to the map. The current import path parses the selected file and sends the collection to Mapbox; impose limits appropriate to supported devices and test malformed and excessively large files.
- Audit Android/iOS builds, runtime permissions, token handling, privacy disclosures, and consent revocation on actual platforms. Web/API checks do not validate native apps.

## Owner release checklist

- [ ] Decide whether the repository itself should become public. This branch does not change repository visibility or settings.
- [ ] Review `.gitmodules` and each pinned upstream project; remove unrelated entries only with maintainer approval and document retained dependencies/licenses.
- [ ] Scan all branches and history for secrets and sensitive content; rotate credentials where needed.
- [ ] Configure fresh, origin-restricted Mapbox public tokens and confirm the custom style's visibility and licensing.
- [ ] Enable branch protection/rulesets for the default branch, require reviewed pull requests and passing checks, and restrict workflow permissions.
- [ ] Enable secret scanning, push protection, Dependabot alerts/updates, and dependency review where available.
- [ ] Use reproducible dependency installs; run web build, API smoke/feed checks, audit, and platform-specific builds/tests.
- [ ] Deploy the API behind HTTPS with explicit origin policy, edge rate limits, monitoring, provider allowlists, and an incident/rollback plan.
- [ ] Publish accurate privacy, attribution, data-source, and service-availability disclosures. Do not represent this starter as a safety-critical or production navigation service.

## Checks performed for this branch

The branch changes are configuration/documentation changes. No local checkout, package installation, native toolchain, live build, dependency audit, secret-history scan, or penetration test was available/performed through this repository editing workflow. Require CI and maintainer validation before merging.
