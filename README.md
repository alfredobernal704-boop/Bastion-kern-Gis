# BASTION-KERN GIS

Cross-platform starter for real-time location, navigation, and geospatial intelligence. The web app is the first runnable surface; native iOS and Android shells live beside it and share the product palette and event schema.

## Included

- `apps/web`: Mapbox GL JS web application with live location, routing, GeoJSON import, area measurement, layers, and an official-event provider adapter interface.
- `apps/ios`: SwiftUI package using Mapbox Maps SDK for iOS, with a native situation map that combines official NASA EONET disasters and USGS earthquakes; PostHog remains optional.
- `apps/android`: Kotlin + Jetpack Compose starter using Mapbox Maps SDK for Android and optional PostHog initialization.
- `apps/api`: dependency-free Node event feed proxy with per-provider HTTPS host allowlists and field mapping.
- `docs`: provider contract, privacy boundaries, and implementation notes.

The editable [Figma design system](https://www.figma.com/design/gqmpiugkCZ7OecQNRk0HkN) contains the Atlas, reusable color/dimension/motion tokens and button states; platform code counterparts are documented in `docs/design-system.md`.

## Web quick start

1. Install Node.js 20+.
2. In one terminal, run `cd apps/api` then `npm start` to start the event proxy.
3. In another terminal, run `cd apps/web`, `npm install`, then `npm run dev`. The starter includes a public Mapbox token for local preview. Copy `config.local.example.js` to `config.local.js` only when adding your Search Box token or PostHog project key. Search Box requires an appropriately scoped public token; coordinates and loaded event titles still work without it. Never put a secret token in browser code.
4. The private custom style is `mapbox://styles/alfredobernal2004/cmw5u5scy010401qpeu7n9yut`. It opens over Andorra la Vella at neighborhood scale with 3D buildings, a faded daytime Standard theme, and the BASTION-KERN sky/stone palette. The editable style specification is in `docs/map-style.json`. If the private style is unavailable to your token, use the public Standard fallback in `src/config.js`.

The global search box supports Mapbox Search Box place suggestions, Andorra event title matching, and latitude/longitude input. Mapbox Search JS manages suggest/retrieve sessions and debouncing; place results are used in memory to fly to the Mapbox map and are not stored or sent to PostHog. The default route adapter uses OSRM's public demo server and is marked as a demo without an SLA. Configure a Mapbox token with `directions:read` before using Mapbox Directions in production. Browser geolocation is requested only after the user selects **Locate me** and requires HTTPS or localhost.

## Events

The default provider is the official USGS all-earthquakes GeoJSON feed for the past hour. The USGS publishes it as a programmatic interface, refreshes it every minute, and supplies geolocated features with stable IDs, millisecond timestamps, magnitude, depth and event-page links. The app refreshes through a same-origin backend every minute and marks cached last-known data as delayed after a source failure. [USGS GeoJSON feed documentation](https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php).

Agenda.ad publishes RSS channels, but its legal notice reserves rights and limits downloaded content to personal use. Keep this provider disabled and unverified for commercial or public production until the publisher confirms reuse and the feed schema is inspected. The app does not scrape calendar HTML or present sample data as live. See `docs/event-providers.md`.

The API uses `providers.example.json` by default and falls back to the ignored `providers.json` when present. The default USGS provider is already configured. For another source, set an HTTPS endpoint, exact field mapping, publisher hostname allowlist, and a documented reuse basis in `providers.json`; set `verified: true` only after source authenticity and data semantics are confirmed. Configure the browser with a same-origin adapter such as `/api/events?provider=<id>`. The API rejects non-HTTPS endpoints, unapproved hosts, redirects, invalid events and oversized responses. It coalesces concurrent requests, honors ETags/Last-Modified, and keeps the last successful dataset in memory for clearly marked stale fallback.

## PostHog

PostHog is opt-in on all three surfaces. Web analytics starts disabled and can be enabled or revoked with the **Analytics off/on** control; set `posthogKey` and `posthogHost` in the ignored local config or matching environment variables. Native hosts call `BastionAnalytics.configure(projectToken:host:consentGranted:)` on iOS or `BastionAnalytics.configure(context, projectToken, host, consentGranted)` on Android after the user grants consent. Feature events are allowlisted; screen/lifecycle capture is disabled and precise location, searches, addresses, and route geometry are never captured.

## Native setup

- iOS: open `apps/ios/Package.swift` with Xcode 16+; supply `MBXAccessToken` locally and do not commit credentials. Embed `BastionSituationView()` from the `BastionGIS` package in the host app to show the native event map. The host app must provide `NSLocationWhenInUseUsageDescription` before enabling Locate me.
- Android: open `apps/android` in Android Studio; add `MAPBOX_DOWNLOADS_TOKEN` to your user Gradle properties or environment and `MAPBOX_ACCESS_TOKEN` to the ignored `apps/android/local.properties` file.

The Figma screen and tokens are in [BASTION-KERN · Geospatial Intelligence](https://www.figma.com/design/gqmpiugkCZ7OecQNRk0HkN). The private Mapbox Standard style is `mapbox://styles/alfredobernal2004/cmw5u5scy010401qpeu7n9yut`.

Current Mapbox SDK versions are pinned from official docs as of November 2026: GL JS 3.33.0, iOS 11.34.2, Android 11.34.2. Review SDK releases before production and keep the lockfiles current. The web starter includes the account's public Mapbox token for local preview; restrict it to the production host before deployment. Android developers can copy `apps/android/local.properties.example` to `local.properties`.

## Status

This is a starter, not a production navigation service. The USGS official feed is configured as the default event source. Production deployment still needs a hosted API, a URL-restricted Mapbox token, Mapbox Directions credentials for Mapbox routing, platform signing, and PostHog project keys if analytics are enabled.


