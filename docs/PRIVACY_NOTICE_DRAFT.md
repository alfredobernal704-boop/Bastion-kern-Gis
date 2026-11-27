# Privacy Notice — review draft

> **Draft only.** This is a technical inventory and publication template, not legal advice or a final privacy notice. Confirm behavior in the deployed web and native apps, SDK configurations, hosting logs, and provider contracts before publication. Obtain jurisdiction-specific review.

**Last updated:** [DATE]  
**Controller / operator:** [LEGAL NAME / ORGANIZATION]  
**Privacy contact:** [CONTACT]  
**Service URL:** [PRODUCTION URL]

## Data flows to verify and disclose

The source code reviewed for this draft indicates the following potential data flows. Production configuration may change them:

- **Mapbox maps:** the web app uses Mapbox GL JS. Map requests may disclose network and device information and the map area being viewed to Mapbox. Confirm the exact SDK behavior, token configuration, and applicable Mapbox privacy terms.
- **Place search:** Mapbox Search Box requests include the query and a proximity derived from the current map center; an optional bounding box is used for area search. Search text is not intentionally sent to BASTION-KERN's PostHog analytics by the current web code, but it is sent to the search provider when place search is used.
- **Routing:** when configured, Mapbox Directions receives the origin, destination, and selected travel profile. If Mapbox routing is unavailable or not configured, the web app asks before using the public OSRM demo, which receives the route coordinates. Do not use the demo for a production service.
- **Device location:** the web app requests location only after the user activates “Locate me” and uses fixes to update the map on-device. The code reviewed does not intentionally send GPS fixes to the BASTION event API or analytics. Map SDK network requests can still reveal viewed map areas; verify actual network behavior before making a broader privacy claim.
- **Optional analytics:** PostHog is opt-in in the web interface and is configured without autocapture, pageview capture, or session recording. The application sends feature events only after consent. Confirm native consent UX, SDK defaults, event properties, retention, and revocation behavior before claiming equivalent controls across all platforms.
- **Official event feeds:** the web app requests configured events from the same-origin API. The API fetches configured external providers. The operator's hosting provider may process request metadata and logs; configure, document, and limit those logs.
- **Imported GeoJSON:** the web app reads selected files in the browser and renders them on the map. This draft does not establish that imported files are transmitted or retained; test production behavior and describe it accurately.

## Complete before publication

1. Identify the legal operator and the applicable controller/processor roles.
2. Inspect real production network traffic on web, iOS, and Android, including Mapbox and PostHog SDK traffic, proxy logs, hosting, error reporting, and backups.
3. List data categories, purposes, legal bases where applicable, recipients/processors, international transfers, retention periods, and user rights for each jurisdiction served.
4. Explain analytics consent, withdrawal, and the consequences of opting out. Ensure no optional analytics run before valid consent where required.
5. State how precise location, route endpoints, search queries, imported files, and server logs are handled. Do not claim that location “never leaves the device” unless verified against all SDK and network behavior.
6. Document cookies/local storage and any identifiers; the web app stores the analytics consent choice in local storage.
7. Provide a contact channel, effective date, process for changes, and legally required notices/choices.
8. Review data-provider and Mapbox/PostHog terms and confirm data use, attribution, retention, and permitted commercial/public deployment.
9. Have qualified privacy counsel review the final notice for every intended market, including applicable location, child-user, and consumer privacy requirements.

## User choices

The final notice must explain the available controls (including optional analytics and device-location permission), how to change or withdraw them, and how to submit privacy requests. Do not promise rights, deletion, or response times until the operator has an operational process to fulfill them.

## Contact

[PRIVACY CONTACT DETAILS — REQUIRED BEFORE PUBLICATION]
