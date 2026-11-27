# Official event provider contract

The browser consumes only same-origin endpoints. Each configured provider entry has a display name, endpoint, canonical HTTPS source URL, and an explicit `verified: true` declaration maintained by the server configuration. Feed records must preserve their source URL and stable event ID.

## Endpoint response

Return GeoJSON `FeatureCollection` (preferred) or `{ "events": [...] }` using this minimum schema:

```json
{
  "type": "Feature",
  "id": "stable-provider-id",
  "geometry": { "type": "Point", "coordinates": [1.5218, 42.5063] },
  "properties": {
    "title": "Event title",
    "category": "Culture",
    "startsAt": "2026-11-06T18:30:00+01:00",
    "endsAt": "2026-11-06T21:00:00+01:00",
    "sourceUrl": "https://official.example/event"
  }
}
```

The browser validates HTTPS source URLs, coordinates, titles, IDs, and timestamps, deduplicates per provider, and links each event to the official page. The server adapter must additionally verify provider ownership/domain, normalize timezone-aware dates, rate limit, cache with `ETag`/`Last-Modified`, expose CORS only to the app origin, and reject redirects to untrusted hosts. Do not label a provider verified just because a URL is HTTPS.

## Provider rollout

### USGS Earthquakes (enabled by default)

The sample configuration uses [`all_hour.geojson`](https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson), an official summary feed documented by the [USGS GeoJSON format page](https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php). The documentation says GeoJSON is intended as a programmatic interface and that past-hour feeds update every minute. Each event is already GeoJSON with a Point geometry; `properties.time` is a Unix timestamp in milliseconds, `properties.title` is the display title, `properties.url` links to the official event page, and the feature has a stable `id`. The provider maps `mag`, `magType`, `place`, `alert`, and `sig` into display metadata. This source is configured `verified: true` because the endpoint is served by `earthquake.usgs.gov`; the app still labels provider freshness separately from provenance.

The browser refreshes every 60 seconds. The API coalesces concurrent requests, caches for 55 seconds, sends conditional `If-None-Match` and `If-Modified-Since` headers when supplied by the publisher, and returns last-successful data as `stale` if the next fetch fails. Stale data is visibly labeled with its last successful fetch time. The cache is per API process and clears on restart.

Agenda.ad publishes official RSS channels for “What are we doing today?” and “This week”: [`/rss/que-fem-avui`](https://www.agenda.ad/rss/que-fem-avui) and [`/rss/que-fem-aquesta-setmana`](https://www.agenda.ad/rss/que-fem-aquesta-setmana). Its [RSS page](https://www.agenda.ad/rss) describes the feeds for use with RSS readers and aggregators. Its [legal notice](https://www.agenda.ad/avis-legal) identifies the shared Government of Andorra and parish ownership, reserves rights, and limits use of downloadable files and images to personal use. An RSS endpoint being official does not itself confirm reuse rights for this app. Keep this provider out of `providers.json` until the publisher confirms the intended reuse and the feed schema has been inspected. The XML feed response is not readable by this project's current research tooling, so event start/end tag mappings cannot yet be specified. Do not map `pubDate` as event start unless the publisher defines it that way. Events without a valid event time or coordinates are omitted. The API supports explicit `mapping` for IDs, titles, dates, URLs, and GeoRSS points once an approved schema is available.

VisitAndorra publishes an [events calendar](https://visitandorra.com/en/agenda/), but no supported machine-readable feed/API has been confirmed. Before using either publisher's event data in production, confirm API/feed terms and any location-data rights with the publisher. Do not scrape calendar HTML. The empty state is intentional until an approved integration is configured.

## Refresh and errors

Configured providers are polled every 60 seconds and on demand. A provider failure is isolated from other providers; retain the last successful dataset only if the backend marks it stale and the UI clearly shows its last-updated time. The current browser adapter does not keep stale results in memory after a failed refresh.

