# Deployment guide

This repository is a cross-platform starter, not a single deployable binary. Use the deployment target that matches each app surface. The machine-readable language and target inventory is in [`deployment/languages.json`](../deployment/languages.json).

| Languages | App | Deployment target | Build / run |
| --- | --- | --- | --- |
| JavaScript, HTML | `apps/web` | Static web host (for example, any host that serves Vite output) | `npm ci && npm run build`; publish `apps/web/dist/` |
| JavaScript | `apps/api` | Node.js 20+ service or Docker-compatible host | `npm start`; container definition: `apps/api/Dockerfile` |
| Swift | `apps/ios` | Apple platforms using Xcode 16+ | Build/archive the Swift package in the host iOS app; sign for App Store or enterprise distribution |
| Kotlin | `apps/android` | Android using Android Studio / Gradle | Build a signed app bundle or APK; distribute through Google Play or managed distribution |

## Web and API deployment

Deploy the web app and API as separate services, or configure the hosting platform to route `/api` requests to the API service. For separate origins, set `VITE_API_BASE_URL` on the web build to the API's public origin (for example, `https://api.example.com`, without a trailing slash). The default is empty, which preserves the same-origin `/api` behavior used by local development. Vite embeds `VITE_*` values into the public frontend at build time; never put secrets in them.

Set `APP_ORIGIN` on the API to the exact deployed web origin so its CORS response allows the web app. The API listens on `PORT` (defaults to `8787`) and exposes `GET /health`. For container hosting, build with `docker build -t bastion-gis-api apps/api` from the repository root and run the image with the platform-provided `PORT` and `APP_ORIGIN` environment variables.

For the static web build, configure the host's build command as `cd apps/web && npm ci && npm run build`, with `apps/web/dist` as the publish directory. Rebuild whenever the API origin or public Mapbox/PostHog settings change.

## Native app requirements and credentials

- **iOS (Swift):** use Xcode 16 or newer and provide the Mapbox access token through local or CI secret configuration. Create/sign the host application using Apple certificates and provisioning profiles; those are not included in this library package.
- **Android (Kotlin):** use the Android SDK/Gradle toolchain and provide `MAPBOX_DOWNLOADS_TOKEN` and `MAPBOX_ACCESS_TOKEN` through protected CI secrets or ignored local configuration. Sign release artifacts with a protected Android signing key.
- Store credentials in the deployment platform's secret manager. Do not commit Mapbox download tokens, signing keys, or production secrets. A public Mapbox browser token is embedded in the frontend and must be restricted to the deployed web origins.

## Language inventory

The repository's reported code composition is JavaScript 54.5%, Swift 26.8%, HTML 10.9%, and Kotlin 7.8%. JavaScript and HTML serve the browser app; JavaScript/Node powers the event API; Swift and Kotlin are native app source languages. HTML is shipped as part of the static web build and is not deployed as a separate server runtime.
