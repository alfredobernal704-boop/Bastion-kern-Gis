# Third-party notices and initial inventory

This is an initial source-tree inventory, not a complete license audit. **No license conclusion is made for any entry below.** Verify each exact pinned revision, license file, notices, attribution requirements, and redistribution rights before publishing a release. A root project license cannot relicense third-party repositories or assets.

## Git submodules

The root `.gitmodules` currently references these separate upstream repositories. These are not first-party BASTION-KERN code; review whether each is actually required. Their presence does not indicate endorsement or permission to redistribute their contents under a BASTION-KERN license.

| Path | Upstream | Pinned commit in reviewed tree | License/rights status |
| --- | --- | --- | --- |
| `OSINT-War-Room` | [Hue-Jhan/OSINT-War-Room](https://github.com/Hue-Jhan/OSINT-War-Room) | `17caed4858d841910b6f4ca1d80074bc9d021878` | Not audited; confirm purpose, rights, and content before public release. |
| `Python` | [TheAlgorithms/Python](https://github.com/TheAlgorithms/Python) | `574d100b7181956e9c8384552fd078165e4cc326` | Not audited at pinned revision; do not assume project-level license applies. |
| `Terra-Watch` | [cifertech/Terra-Watch](https://github.com/cifertech/Terra-Watch) | `1967cc4213a6f79605e033db422c8377f671f658` | Not audited; confirm purpose, rights, and content before public release. |
| `awesome-gis` | [sshuair/awesome-gis](https://github.com/sshuair/awesome-gis) | `0f21c1f6aa9fcefb044456827e9eb8363135f392` | Not audited at pinned revision; check individual linked materials too. |
| `disaster_map` | [thedanitor/disaster_map](https://github.com/thedanitor/disaster_map) | `6db23f545e1cb803a7603ee1fa1d4d6c5d37863d` | Not audited; confirm purpose, rights, and content before public release. |
| `iOS` | [home-assistant/iOS](https://github.com/home-assistant/iOS) | `3ae70df5e1b05391047662bf876f3e81cb86be8c` | Not audited; confirm purpose, rights, and content before public release. |
| `ios` | [nextcloud/ios](https://github.com/nextcloud/ios) | `d62f854d282ca93c8a7cde29b606832dbe32a1f1` | Not audited; confirm purpose, rights, and content before public release. |
| `kepler.gl` | [keplergl/kepler.gl](https://github.com/keplergl/kepler.gl) | `e74e5dea0a5e4562815fb53c71a99c0e558f6779` | Not audited at pinned revision; do not assume project-level license applies. |
| `llama.cpp` | [ggml-org/llama.cpp](https://github.com/ggml-org/llama.cpp) | `7d7f0287530bc8981690f361d8c1627dbae1c99a` | Not audited at pinned revision; inspect licenses and model-related materials separately. |
| `mapbox-gl-js` | [mapbox/mapbox-gl-js](https://github.com/mapbox/mapbox-gl-js) | `1f3879df1a166ddb99239fa751425195f9961a28` | Not audited; review its license and any separate service/style terms. |

Before removing or keeping submodules, confirm they are not intentional and consult the maintainers. An uninitialized submodule still has a public repository pointer and pinned commit in this repository.

## Direct dependencies and services identified in manifests/source

This list identifies direct integrations, not a complete transitive dependency inventory. Obtain actual notices and current terms from the dependency lockfiles and upstream providers before release.

| Component | Location | Review needed |
| --- | --- | --- |
| Mapbox GL JS, Search JS Core, Mapbox GL JS CSS | `apps/web/package.json`, web source | Review package license plus Mapbox account, API, style, attribution, and data-use terms. |
| Turf.js | `apps/web/package.json` | Verify exact installed package version and license from lockfile/upstream. |
| PostHog JS | `apps/web/package.json` | Verify package license and analytics processor/privacy configuration. |
| Vite | `apps/web/package.json` | Build-time dependency; verify exact version/license and transitive notices. |
| Mapbox Maps SDK for iOS | `apps/ios/Package.swift` | Verify package license and Mapbox SDK/service terms. |
| PostHog iOS SDK | `apps/ios/Package.swift` | Verify package license and data-processing terms. |
| Mapbox Maps SDK for Android | `apps/android/app/build.gradle.kts` | Verify exact dependency license and Mapbox SDK/service terms. |
| AndroidX, Kotlin/Compose, Android Gradle plugins | Android Gradle build files | Generate a complete dependency/license inventory from the resolved build. |
| USGS earthquake feed | `apps/api/providers.example.json`, iOS client | Verify source terms, attribution, data freshness, and any restrictions for the specific use. |
| NASA EONET feed | `apps/ios/Sources/BastionGIS/BastionEvents.swift` | Verify current endpoint guidance, attribution, and NASA media/data policies. |
| OSRM public demo | Web route fallback in `apps/web/src/main.js` | Public demo is not a production dependency or SLA; review usage policy and do not send sensitive coordinates without an informed user choice. |
| Map style, Figma design, submitted emblem | `apps/web/src/config.js`, `docs/map-style.json`, design references/user submission | Ownership and redistribution rights are unconfirmed. Do not assume project license covers these assets or marks. |

## Release maintenance

For each release, update this inventory from resolved dependency reports, preserve required upstream notices, record review date and reviewer, and identify excluded proprietary/service assets. If an item is removed or replaced, update this file and `.gitmodules` together when appropriate.
