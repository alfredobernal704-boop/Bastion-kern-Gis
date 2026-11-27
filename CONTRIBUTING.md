# Contributing to BASTION-KERN GIS

Thanks for considering a contribution. The project is an early-stage GIS starter; focused, testable improvements and honest documentation are especially useful.

## Before you begin

- For substantial changes, open an issue first with the user problem, expected outcome, and approach.
- Check the [roadmap](ROADMAP.md), [governance](GOVERNANCE.md), [architecture](docs/ARCHITECTURE.md), and [public release checklist](docs/PUBLIC_RELEASE_CHECKLIST.md).
- Do not submit secrets, private location data, unlicensed assets, or copied upstream code without confirming its license and attribution obligations.
- No project-wide license is currently approved. Do not assume a contribution is cleared for public reuse; licensing and contribution ownership are release blockers to resolve with maintainers.

## Pull requests

- Use a focused branch and keep changes scoped.
- Explain user-visible changes, security/privacy impact, provider/data provenance, and configuration requirements.
- Add or update tests for behavior changes; do not present live/demo/sample data as verified production data.
- Run the relevant checks. For web changes: `cd apps/web && npm ci && npm run build`. For the API: `cd apps/api && npm ci && node --check server.mjs` and test the health/feed behavior when practical.
- Include screenshots for visual changes when useful. State when Mapbox credentials, native toolchains, or hardware are required.
- Resolve review feedback and wait for maintainer approval before merging.

## Security and privacy

Report suspected vulnerabilities privately through the repository Security tab as described in [`SECURITY.md`](SECURITY.md), not in a public issue. Treat location, routes, search terms, imported GIS files, and event reports as sensitive. Do not add them to analytics or logs without a necessary, disclosed, reviewed purpose.

By submitting a contribution, you confirm that you have the right to submit it and that you have identified any third-party materials and their applicable terms. This statement does not replace a future approved contributor agreement or license.
