# Contributing

Thanks for helping improve BASTION-KERN GIS. Please open an issue to discuss substantial changes before starting work.

## Pull requests

- Branch from `main` and use a descriptive branch name.
- Keep changes focused; do not commit credentials, local configuration, generated build output, or unrelated vendored repositories.
- Explain the user-visible change, security/privacy impact, and any required configuration in the PR description.
- Run the web production build (`cd apps/web && npm ci && npm run build`) and API checks (`cd apps/api && npm ci && node --check server.mjs`) when relevant.
- Include screenshots for visual changes when practical. Note if a change requires Mapbox credentials or platform-specific hardware/tooling.
- Ensure the GitHub Actions checks pass and resolve review conversations before merging.

## Secrets and location privacy

Never place credentials in source files or commits. Treat precise location, event reports, and analytics identifiers as sensitive; collect and transmit only what is needed, and preserve the app's consent behavior.
