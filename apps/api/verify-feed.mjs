const baseUrl = process.env.BASTION_API_URL || 'http://127.0.0.1:8787';
const providerId = process.env.EVENT_PROVIDER_ID || 'usgs-all-hour';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const healthResponse = await fetch(new URL('/health', baseUrl), {
  signal: AbortSignal.timeout(5000)
});
assert(healthResponse.ok, `Health endpoint returned HTTP ${healthResponse.status}`);
const health = await healthResponse.json();
assert(health.ok === true, 'Health endpoint did not return { ok: true }');

const feedUrl = new URL('/api/events', baseUrl);
feedUrl.searchParams.set('provider', providerId);
const feedResponse = await fetch(feedUrl, {
  headers: { Accept: 'application/geo+json, application/json' },
  signal: AbortSignal.timeout(15000)
});
assert(feedResponse.ok, `Event endpoint returned HTTP ${feedResponse.status}`);
const feed = await feedResponse.json();
assert(feed.type === 'FeatureCollection', 'Feed response is not a GeoJSON FeatureCollection');
assert(Array.isArray(feed.features), 'Feed response features must be an array');
assert(Array.isArray(feed.providers), 'Feed response providers must be an array');

const provider = feed.providers.find((item) => item.id === providerId);
assert(provider, `Provider ${providerId} is missing from the response`);
assert(provider.status === 'connected', `Provider status is ${provider.status}, not connected`);
assert(provider.verified === true, 'Provider is not marked verified');
assert(Number.isInteger(provider.count), 'Provider count must be an integer');
assert(provider.count === feed.features.length, 'Provider count does not match the ingested feature count');
assert(feed.features.length > 0, 'Feed returned zero events; live ingestion was not verified');
assert(Number.isFinite(Date.parse(provider.fetchedAt)), 'Provider fetchedAt timestamp is missing or invalid');

for (const [index, feature] of feed.features.entries()) {
  const properties = feature?.properties;
  const coordinates = feature?.geometry?.coordinates;
  assert(feature?.type === 'Feature', `Feature ${index} has an invalid GeoJSON type`);
  assert(typeof feature.id === 'string' && feature.id.length > 0, `Feature ${index} has no stable ID`);
  assert(Array.isArray(coordinates) && coordinates.length >= 2, `Feature ${index} has no point coordinates`);
  const [longitude, latitude] = coordinates.map(Number);
  assert(Number.isFinite(longitude) && Math.abs(longitude) <= 180, `Feature ${index} has invalid longitude`);
  assert(Number.isFinite(latitude) && Math.abs(latitude) <= 90, `Feature ${index} has invalid latitude`);
  assert(typeof properties?.title === 'string' && properties.title.trim().length > 0, `Feature ${index} has no title`);
  assert(Number.isFinite(Date.parse(properties?.startsAt)), `Feature ${index} has an invalid startsAt timestamp`);
  let sourceUrl;
  try { sourceUrl = new URL(properties?.sourceUrl); } catch { throw new Error(`Feature ${index} has an invalid source URL`); }
  assert(sourceUrl.protocol === 'https:', `Feature ${index} source URL is not HTTPS`);
}

console.log(`Verified ${feed.features.length} normalized events from ${provider.name} (${provider.id}).`);
