# BASTION-KERN GIS

**An early-stage geospatial intelligence starter for exploring maps, event feeds, routes, and local spatial data.** The project combines a runnable web atlas and a small event-feed API with experimental iOS and Android foundations. It is aimed at developers, researchers, and geospatial teams evaluating a cross-platform GIS foundation—not as an emergency or safety-critical navigation service.

> **Project stage:** prototype. Web and API are the primary runnable surfaces. The native apps, production deployment, governance, licensing, and legal materials require further validation. No project-wide open-source license has been approved; see [licensing status](docs/LICENSING.md). Do not assume the code is licensed for reuse.

[![CI](https://github.com/OFFENTLOGSPOT/bastion-kern-geospatial-intelligence/actions/workflows/ci.yml/badge.svg)](https://github.com/OFFENTLOGSPOT/bastion-kern-geospatial-intelligence/actions/workflows/ci.yml)

## Why BASTION-KERN

Geospatial applications often need maps, data provenance, event overlays, routing, and privacy-conscious location controls to work together. BASTION-KERN explores that integration with a shared visual system and a separation between client apps and a provider-backed API.

### What the current code provides

- **Web atlas:** Mapbox GL JS map with layers, user-initiated browser location, coordinate/place/event search, route planning, area measurement, and local GeoJSON import.
- **Event API:** dependency-free Node.js HTTP service that reads configured providers, fetches GeoJSON or RSS/Atom feeds, normalizes events, limits and caches responses, and exposes health and event endpoints.
- **Event provenance:** USGS earthquakes are the example provider. Event records include source information; additional publishers need independent permission, mapping, and verification.
- **Native foundations:** SwiftUI and Kotlin/Jetpack Compose clients using Mapbox SDKs. These need platform-specific credentials and testing; they are not production-ready apps.
- **Design direction:** a shared visual system documented in [`docs/design-system.md`](docs/design-system.md), with platform code counterparts and an editable [Figma file](https://www.figma.com/design/gqmpiugkCZ7OecQNRk0HkN).

See [architecture](docs/ARCHITECTURE.md), [event provider contract](docs/event-providers.md), [product direction and visual references](docs/PRODUCT_DIRECTION.md), and [public release checklist](docs/PUBLIC_RELEASE_CHECKLIST.md).

## Quick start: web and API

Requirements: Node.js 20+ and npm. The web app needs a **Mapbox public token** for map tiles; optional search/routing tokens may be used for those features. Public tokens are visible to browser users: restrict them to approved origins and minimum required scopes. Never put Mapbox secret/download tokens in client code.

Terminal 1 — API:

```sh
cd apps/api
npm ci
npm start
```

Terminal 2 — web app:

```sh
cd apps/web
npm ci
cp config.local.example.js config.local.js
# Edit config.local.js and set mapboxToken to your restricted public token.
npm run dev
```

Open the Vite URL (normally `http://localhost:4173`). The Vite dev server proxies `/api` requests to the local API at port 8787. `config.local.js` is ignored by Git. Alternatively, configure `VITE_MAPBOX_ACCESS_TOKEN` in the web build environment. The map shows its configuration-needed state until a token is provided.

Build the web app:

```sh
cd apps/web
npm ci
npm run build
```

Check API health:

```sh
curl http://127.0.0.1:8787/health
```

The API uses `apps/api/providers.example.json` unless a local `apps/api/providers.json` or `EVENT_PROVIDER_CONFIG` is configured. Provider allowlists should contain only trusted HTTPS publisher hosts. Do not expose this prototype API publicly without deployment hardening.

## Native development

- **iOS:** Xcode 16+; open `apps/ios/Package.swift` and provide an appropriately scoped Mapbox token through the host app's local configuration.
- **Android:** Android Studio; copy `apps/android/local.properties.example` to the ignored `apps/android/local.properties` and supply a restricted public Mapbox token. The Mapbox downloads credential belongs in a local Gradle property or secure environment variable, never in the repository.

Native projects require platform toolchains and credentials and are not built by the current CI workflow.

## Product direction and safety boundary

The supplied mobile screenshots are **design references, not proof of working features or a deployed app**. Their mock global incident totals, wildfire/weather alerts, impact estimates, severity labels, distance values, and safety instructions are not current BASTION-KERN capabilities and must not be presented as live data. Image files are not included because source and redistribution rights have not been confirmed. See [`docs/PRODUCT_DIRECTION.md`](docs/PRODUCT_DIRECTION.md) for a provenance-first implementation plan.

Feeds may be delayed or incomplete; routes and measurements are not guaranteed safe or authoritative. This is not an emergency service. Use official authorities for emergency instructions.

## Privacy and data handling

- Browser location is requested only after the user activates the location control; keep precise location and route coordinates out of product analytics and logs.
- Place searches, routing requests, map views, and optional analytics may involve third-party services. Review [the privacy notice draft](docs/PRIVACY_NOTICE_DRAFT.md) and provider terms before deployment.
- Optional PostHog analytics is intended to be consent-based. Validate actual consent, SDK behavior, and revocation on every platform before making production privacy claims.
- Imported GeoJSON may contain sensitive information. Treat imports as user-controlled data and only use data you are authorized to process.

## Project documents

- [Architecture and data flow](docs/ARCHITECTURE.md) · [Roadmap](ROADMAP.md) · [Product direction](docs/PRODUCT_DIRECTION.md)
- [Contributing](CONTRIBUTING.md) · [Governance](GOVERNANCE.md) · [Code of Conduct](CODE_OF_CONDUCT.md)
- [Security policy](SECURITY.md) · [Public release checklist](docs/PUBLIC_RELEASE_CHECKLIST.md)
- [Licensing status](docs/LICENSING.md) · [Third-party notices](THIRD_PARTY_NOTICES.md)
- [Terms of Use draft](docs/TERMS_OF_USE_DRAFT.md) · [Privacy Notice draft](docs/PRIVACY_NOTICE_DRAFT.md)
- [Branding and asset policy](docs/BRANDING_AND_ASSETS.md)

**License:** No project-wide license has been approved. See [`docs/LICENSING.md`](docs/LICENSING.md) before copying, modifying, or distributing project materials. Third-party components remain subject to their own terms.

## Ways to help

Useful contributions include reproducible builds and tests, documentation improvements, provider-contract tests, accessibility fixes, native build validation, and deployment/security review. Start with [good first issues](https://github.com/OFFENTLOGSPOT/bastion-kern-geospatial-intelligence/labels/good%20first%20issue) if available, or open a focused issue with the user problem and expected outcome. Do not submit credentials, private location data, or unlicensed assets.

There is no verified sponsorship destination configured. Sponsorship and partner logos will only be listed after an arrangement is confirmed. Organizational interest is welcome through public issues or pull requests; report security vulnerabilities privately using GitHub's repository Security tab, as described in [`SECURITY.md`](SECURITY.md).
