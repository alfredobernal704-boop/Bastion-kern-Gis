# BASTION-KERN architecture

## System shape

BASTION-KERN is currently a small, multi-client GIS starter rather than a deployed production platform. The web client and event API are independently runnable. The iOS and Android directories contain native client foundations and have separate SDK credential/toolchain requirements.

```text
Browser (apps/web)
  ├─ Mapbox GL JS / Search Box / optional Directions
  ├─ local user-selected location and GeoJSON
  └─ same-origin /api/events
           │
           ▼
Node.js event API (apps/api)
  ├─ provider manifest and field mapping
  ├─ HTTPS host allowlist, response/time limits, normalization
  ├─ in-memory request coalescing and short-lived cache
  └─ external publisher feeds (USGS example; others require approval)

Native clients (apps/ios, apps/android)
  ├─ Mapbox platform SDKs
  ├─ direct official event data integrations in iOS starter
  └─ optional analytics integrations
```

## Web runtime

`apps/web/src/main.js` creates the Mapbox map and wires the map controls, search, route, geolocation, area measurement, and file-import flows. `apps/web/src/config.js` reads build-time and ignored local values; no default Mapbox credential is committed after the hardening changes. `apps/web/src/events.js` fetches configured endpoints and validates/normalizes event properties before the UI renders them.

In development, `apps/web/vite.config.js` proxies `/api` to `http://localhost:8787`. The web UI uses DOM text APIs for event/search labels and should continue to treat publisher and imported data as untrusted input.

## Event API

`apps/api/server.mjs` serves `GET /health` and `GET /api/events`, reads the local `providers.json` when present or `providers.example.json` otherwise, fetches enabled providers, normalizes the mapped fields, and returns a GeoJSON FeatureCollection plus provider statuses. It rejects non-HTTPS/unapproved feed hosts and redirects, enforces an upstream timeout and response-size limit, and caches provider responses in memory.

This is not a general-purpose or hardened public proxy. Before public deployment, validate provider configuration rigorously, test DNS and private-address protections, add edge rate limits and observability, configure HTTPS and a strict allowed origin, and test request/response behavior under hostile or malformed inputs. Provider source links and event-feed content must be independently reviewed for rights and accuracy.

## Native clients

- `apps/ios/Sources/BastionGIS/BastionSituationView.swift` and `BastionMapView.swift` provide SwiftUI/Mapbox presentation; `BastionEvents.swift` loads USGS and NASA EONET data directly.
- `apps/android/app/src/main/java/com/bastionkern/gis/MainActivity.kt` is the Compose entry point; the app uses Mapbox Maps and has optional analytics/design-token modules.

The native clients do not currently share the web API event path. Confirm privacy disclosures and feed behavior independently for each app.

## Trust boundaries and sensitive data

- **Browser configuration:** any `VITE_*` value included in a client build is public. Do not place secret tokens there.
- **Publisher feeds:** feed text, coordinates, links, and imported files are untrusted. Validate before display or use; do not make verification claims based solely on client-supplied fields.
- **User location and routes:** treat precise coordinates as sensitive. Avoid analytics, logs, and storage unless a clearly disclosed, user-authorized purpose requires them.
- **Third parties:** Mapbox, routing providers, PostHog, hosting, and data publishers have separate terms and data processing. Inspect actual runtime traffic before publishing privacy promises.
- **Submodules and assets:** root submodules are independent upstream projects and are not automatically covered by a project-level license. See [`THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md).

## Validation and release boundary

The existing CI workflow runs a web build and an API smoke check. It does not currently establish security certification, native build quality, legal readiness, provider permission, production availability, or correctness for safety-critical use. Track expanded test and release work in [`ROADMAP.md`](../ROADMAP.md) and [`docs/PUBLIC_RELEASE_CHECKLIST.md`](PUBLIC_RELEASE_CHECKLIST.md).
