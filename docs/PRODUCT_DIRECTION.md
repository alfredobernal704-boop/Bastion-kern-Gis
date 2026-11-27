# Product direction and visual references

## Status of supplied design references

The user supplied mobile UI concept images for a possible global hazards experience. They depict a dark map-first interface, global/local map views, clustered incident markers, event and advisory detail sheets, event provenance, distance/status metadata, and a sample emergency-alert concept. The latest references show a wildfire detail flow with an advisory label, delayed status, event metadata, source link, and explanatory panel; another concept includes suggested actions and an explicit note that the report is illustrative and not verified/live.

These are **design references only**. They do not prove that BASTION-KERN currently has global incident totals, wildfire/weather feeds, impact estimates, severity classification, emergency instructions, user accounts, alert delivery, or a deployed service. Values visible in mockups (including dates, distances, event IDs, counts, severity, and guidance) must never be copied into the app as active data. The images are not stored in this repository because the supplied attachments are not available as repository-ready files and their source, authorship, and redistribution rights have not been established. If the rights holder provides approved files, add them under `docs/assets/` with provenance and license/permission details.

## Product opportunity

The concepts suggest a possible cross-platform, source-transparent geospatial situation map for exploring public hazard/event information. Potential users to interview include GIS practitioners, researchers, civic resilience teams, and data providers. This is a hypothesis to test, not a claim of market demand, endorsement, partnership, or organizational support.

### Concepts to evaluate

- Global, regional, and navigation-focused map views, with readable clustering at different zoom levels.
- A concise event summary and expandable detail sheet that always distinguishes publisher facts from app-derived display values.
- Explicit source name, source link, event ID, issue/observation time, valid time (when supplied), retrieval time, and freshness state.
- Category, time-window, source, and severity filters only when backed by documented provider fields and a clear definition.
- A distance-to-event value only after an explicit user action grants location access; calculate locally where feasible, disclose that it is approximate, and do not send precise coordinates to analytics.
- Accessible mobile navigation, keyboard and screen-reader support, contrast, and reduced-motion behavior.

## Safety and data-provenance rules

- Do not invent counts, severity, impact estimates, affected-area size, confidence, or freshness. Keep provider-reported fields separate from calculated values and clearly label their origin.
- Do not show generic or model-generated text as an official emergency instruction. Safety actions must be sourced from an authorized public authority, retain the source and effective time, and receive qualified review. Otherwise present only a link to current official guidance and state that the app is not an emergency service.
- “Advisory,” “severe,” and similar labels need explicit, documented provider definitions. Never derive them from arbitrary thresholds without domain review.
- Show `live`, `delayed/stale`, `unavailable`, or `no matching records` accurately; use retrieval time and publisher update time distinctly.
- Evaluate every feed for endpoint reliability, schema, geography, timestamp semantics, attribution, reuse rights, source authority, freshness, and operational limits before integration.
- Use synthetic fixtures for UI and automated tests, visibly label them as simulated, and keep them separate from active data.
- Treat imported GeoJSON, coordinates, route endpoints, and user location as sensitive/untrusted. Validate inputs and never log or analyze precise location without a necessary, disclosed, reviewed purpose.

## Gaps versus the current application

The repository is an early-stage starter. The web app is centered on Andorra and configures the USGS all-earthquakes past-hour feed as its example. It does not implement the mockups' worldwide incident totals, pagination, wildfire or weather-alert feeds, impact estimates, safety recommendations, alert delivery, user profile, or operational dashboard. The native clients use separate integrations and are not a unified deployed product. The repository does not establish a public production endpoint or verified operating service.

Do not describe the project as “live,” “deployed,” “verified,” “production-ready,” or suitable for emergency response until the specific environment, data, and checks have evidence. See [architecture](ARCHITECTURE.md) for current implementation shape.

## Evidence-driven implementation path

### 1. Validate the use case

Interview GIS practitioners, researchers, emergency-management professionals, and prospective data providers. Choose a clearly bounded, non-safety-critical first use case. Safety-critical dispatch or evacuation requires a separate qualified engineering, operational, and legal program.

### 2. Establish trustworthy event records

- Define a versioned schema for stable IDs, event type, geometry/uncertainty, source and URL, issue/observation time, valid time, last-updated time, and provenance.
- Model source status and freshness distinctly; test valid, invalid, duplicate, stale, unavailable, and empty feeds.
- Evaluate sources before implementation. Do not mark a provider “official” or “verified” solely because a configuration field says so; document how maintainers verified the source.

### 3. Build the map experience incrementally

- Prototype global camera modes, clustering, event details, and filters with synthetic data first.
- Add source, time, status, and detail fields only when supported by the validated event schema.
- Design location/distance controls with explicit consent and local computation where feasible.
- Test accessibility, mobile layouts, reduced motion, malformed and oversized inputs, and provider failures.

### 4. Verify deployment before claiming it

A public demo requires an approved domain and HTTPS hosting for web and API, restricted Mapbox public tokens, explicit API origin configuration, edge rate limits, provider-host controls, safe monitoring, operational ownership, privacy/terms review, and a rollback plan.

For each candidate release, publish evidence instead of adjectives:

- CI run URL and commit SHA for passing checks.
- Dependency audit date and summary, with accepted risk documented.
- Native build/test evidence for every platform claimed as supported.
- Feed health and freshness checks that do not imply source endorsement.
- Accessibility test coverage and known limitations.
- Deployment environment, service owner, incident expectations, and data-processing disclosures.

## Organizational evaluation

A potential pilot should begin with a documented user workflow, legally usable feed, test geography, acceptance criteria, privacy/security review, and an identified deployment/operations owner. Useful early contributions include schema/provider tests, accessibility fixes, deployment automation, threat modeling, and validated user research. Do not display organization logos or claim sponsorship or endorsement without written permission.

See [roadmap](../ROADMAP.md), [public-release checklist](PUBLIC_RELEASE_CHECKLIST.md), [third-party notices](../THIRD_PARTY_NOTICES.md), [terms draft](TERMS_OF_USE_DRAFT.md), and [privacy draft](PRIVACY_NOTICE_DRAFT.md).
