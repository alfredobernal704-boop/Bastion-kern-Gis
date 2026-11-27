# Roadmap

This roadmap describes proposed priorities, not delivery commitments. Priorities may change as maintainers and contributors validate user needs. No feature should be presented as complete until implemented and tested in the relevant app.

## Now — make the starter understandable and safe to evaluate

- [x] Document the current architecture and major release gaps.
- [x] Remove committed web and Android example Mapbox token values; require local/build-time configuration.
- [x] Record a concept-to-implementation plan for the supplied global hazard-map design references; screenshots are not represented as a deployed product.
- [ ] Review every Git submodule, pinned commit, and asset for purpose, license, and redistribution rights; remove unrelated repositories only with maintainer approval.
- [ ] Review all branches and history for secrets and rotate any credentials that were exposed.
- [ ] Make CI reproducible with lockfile-based installs and add focused API/provider and web data-validation tests.
- [ ] Validate configuration, GeoJSON input size/geometry, API timeouts, origin policy, and public deployment protections.
- [ ] Reconcile UI and documentation claims with verified behavior, including analytics consent and location privacy.

## Next — reliable, source-transparent geospatial workflows

- [ ] Validate target users and a non-safety-critical first use case with GIS practitioners and prospective data providers.
- [ ] Define a versioned event-provider contract, provenance/freshness states, and automated fixtures for valid, invalid, stale, and unavailable feeds.
- [ ] Add robust input validation and accessible feedback for GeoJSON imports, search, routing, and event-source status.
- [ ] Prototype global camera modes, clustering, event detail sheets, and filters using synthetic test fixtures first; label simulated data clearly.
- [ ] Evaluate additional hazard/weather sources only after official endpoint, schema, freshness, licensing, attribution, and reuse permission are verified.
- [ ] Document supported browsers/devices, API deployment architecture, operations, rate limits, and recovery procedures.
- [ ] Add privacy-preserving telemetry only after consent and a documented retention/processor review.
- [ ] Build and test iOS and Android on supported toolchains; make platform capability and permission differences explicit.

## Later — production and community readiness

- [ ] Deploy a staging web/API environment with HTTPS, restricted Mapbox tokens, API origin/rate controls, monitoring, and an owner; publish its URL only after a real deployment and smoke checks.
- [ ] Publish per-commit CI, dependency-audit, native-build, feed-freshness, and accessibility evidence for release candidates.
- [ ] Decide licensing and asset scope after rights-holder and third-party review; publish a license only when approved.
- [ ] Complete jurisdiction-specific Privacy Notice and Terms of Use review before public service deployment.
- [ ] Establish release criteria, versioning, support expectations, and a documented security response process.
- [ ] Gather feedback from GIS practitioners and organizations; prioritize documented user needs over speculative feature breadth.

## Ways to contribute

Open an issue for a focused proposal, include the user problem and evidence, and identify any provider, privacy, licensing, or security impact. Small reproducible fixes and tests are especially valuable. See [CONTRIBUTING.md](CONTRIBUTING.md), [GOVERNANCE.md](GOVERNANCE.md), and [`docs/PRODUCT_DIRECTION.md`](docs/PRODUCT_DIRECTION.md).
