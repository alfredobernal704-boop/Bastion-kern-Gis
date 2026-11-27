# Repository setup and release checklist

This repository is a cross-platform GIS starter. The web app and event API are runnable locally; iOS and Android require their platform toolchains and Mapbox credentials.

## Clone

The repository is private. A person can clone it only after the owner grants their GitHub account repository access. Use either HTTPS (GitHub CLI or credential manager recommended) or SSH:

```sh
git clone https://github.com/alfredobernal704-boop/bastion-kern-geospatial-intelligence.git
# Or, if your SSH key is registered with GitHub:
git clone git@github.com:alfredobernal704-boop/bastion-kern-geospatial-intelligence.git
cd bastion-kern-geospatial-intelligence
```

To update an existing checkout:

```sh
git switch main
git pull --ff-only origin main
```

## Web app and event API

Requirements: Node.js 20 or newer and npm. The CI workflow currently uses Node.js 22.

Terminal 1 — start the API:

```sh
cd apps/api
npm ci
npm start
```

Terminal 2 — install and run the web app:

```sh
cd apps/web
npm ci
npm run dev
```

Open the local URL printed by Vite. The web app's `config.local.example.js` documents optional local configuration. Copy it to `config.local.js` when needed; that local file is ignored by Git. Never commit access tokens, `.env` files, or credentials. Public Mapbox tokens used in a browser must be URL-restricted in the Mapbox dashboard.

To build the web app for deployment:

```sh
cd apps/web
npm ci
npm run build
```

The output is in `apps/web/dist/`. The API is a separate Node process; configure the deployment platform to host it and set the web app's API URL as appropriate for the deployment.

## Native apps

- **iOS:** Xcode 16 or newer. Open `apps/ios/Package.swift` in Xcode and provide `MBXAccessToken` through local, untracked configuration.
- **Android:** Android Studio. Open `apps/android`; provide `MAPBOX_DOWNLOADS_TOKEN` through user Gradle properties or the environment and `MAPBOX_ACCESS_TOKEN` in the ignored `apps/android/local.properties`.

Never put Mapbox secret/download tokens in source control, build logs, or public documentation. Follow Mapbox's token-scope guidance and rotate any token that may have been exposed.

## GitHub setup checklist

The default branch is already `main`. Recommended repository settings (some must be enabled by an owner in GitHub Settings and cannot be configured by a committed file):

1. **Access:** grant collaborators only the access they need. The repository is private, so cloning is unavailable to users without permission.
2. **Branches:** protect `main`; require pull requests before merging, require the `Web production build` and `Event API health smoke check` checks to pass, require conversation resolution, and block force-pushes and branch deletion. For a solo maintainer, avoid requiring approvals that nobody else can provide.
3. **Security:** enable Dependabot alerts and security updates, secret scanning and push protection if available for the plan, and dependency graph. This repository includes Dependabot update configuration; alerting and scanning are repository/plan settings.
4. **Actions:** keep workflow permissions read-only by default and approve third-party actions as appropriate. Review workflow changes before merging.
5. **Tags/releases:** create a version tag only for a tested release after CI passes. Use annotated semantic-version tags (for example `v0.1.0`) and publish release notes describing changes and known limitations. Do not tag an untested starter snapshot as production-ready.
6. **Commits:** use descriptive commit messages; sign commits if required by the organization. Changes made through GitHub also create commits and remain subject to branch rules when those rules are enabled.

The repository currently has `main` and `BAASTIO` branches. Review and merge any wanted work from `BAASTIO` through a pull request; do not rename or delete branches without checking their contents and references first.

## Validation

GitHub Actions runs on pushes to `main`, pull requests, and manual dispatch. The workflow builds the web app and checks the API health/feed endpoint. Run the corresponding commands locally before opening a pull request. Native SDK builds may require platform runners and credentials and are not represented by these web/API checks.
