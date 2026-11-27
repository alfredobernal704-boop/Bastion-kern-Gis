const safeText = (value, max = 240) => String(value ?? '').trim().slice(0, max);

export function normalizeEventFeature(feature, provider) {
  const p = feature?.properties || {};
  const coordinates = feature?.geometry?.type === 'Point' ? feature.geometry.coordinates : p.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length < 2) return null;
  const [lng, lat] = coordinates.map(Number);
  if (!Number.isFinite(lng) || !Number.isFinite(lat) || Math.abs(lng) > 180 || Math.abs(lat) > 90) return null;

  const sourceUrl = safeText(p.sourceUrl || p.url || provider.sourceUrl, 1024);
  if (!/^https:\/\//i.test(sourceUrl)) return null;
  const id = safeText(p.eventId || p.id || feature.id || '', 120);
  const title = safeText(p.title || p.name, 180);
  const startsAt = safeText(p.startsAt || p.startDate || p.starts_at, 48);
  if (!id || !title || !startsAt || Number.isNaN(Date.parse(startsAt))) return null;

  const magnitude = Number(p.magnitude);
  const depthKm = Number(p.depthKm);
  return {
    id,
    title,
    category: safeText(p.category || p.eventCategory || 'Other', 48),
    startsAt,
    endsAt: safeText(p.endsAt || p.endDate || p.ends_at, 48),
    coordinates: [lng, lat],
    sourceName: safeText(provider.name, 100),
    sourceUrl,
    fetchedAt: new Date().toISOString(),
    verified: p.verified === true || provider.verified === true,
    magnitude: Number.isFinite(magnitude) ? magnitude : null,
    magnitudeType: safeText(p.magnitudeType, 12),
    place: safeText(p.place, 180),
    depthKm: Number.isFinite(depthKm) ? depthKm : null,
    alert: safeText(p.alert, 24),
    significance: Number.isFinite(Number(p.significance)) ? Number(p.significance) : null,
    reviewStatus: safeText(p.reviewStatus, 24)
  };
}

export async function fetchOfficialEvents(providers) {
  const eventsByKey = new Map();
  const providerStates = [];

  for (const provider of providers) {
    if (!provider || !provider.name || !provider.endpoint || !/^https:\/\//i.test(provider.sourceUrl || '')) {
      providerStates.push({ name: provider?.name || 'Unknown source', status: 'not-configured', count: 0 });
      continue;
    }
    try {
      // Endpoints should be same-origin backend routes that fetch and normalize official feeds.
      const response = await fetch(provider.endpoint, { headers: { Accept: 'application/geo+json, application/json' }, signal: AbortSignal.timeout(12_000) });
      if (!response.ok) throw new Error('Feed request failed with status ' + response.status);
      const body = await response.json();
      const features = body.type === 'FeatureCollection' ? body.features : body.features || body.events || [];
      const providerResult = Array.isArray(body.providers) ? body.providers.find((item) => item.id === provider.id) : null;
      let count = 0;
      for (const feature of features) {
        const item = normalizeEventFeature(feature, provider);
        if (!item) continue;
        const key = item.sourceName + ':' + item.id;
        if (!eventsByKey.has(key)) { eventsByKey.set(key, item); count += 1; }
      }
      providerStates.push({
        id: provider.id,
        name: provider.name,
        status: providerResult?.status || 'connected',
        count: providerResult?.count ?? count,
        verified: providerResult?.verified ?? provider.verified === true,
        fetchedAt: providerResult?.fetchedAt || null,
        stale: providerResult?.stale === true
      });
    } catch (error) {
      providerStates.push({ id: provider.id, name: provider.name, status: 'error', count: 0, verified: provider.verified === true, fetchedAt: null, error: safeText(error?.message, 140) });
    }
  }

  return { events: [...eventsByKey.values()], providerStates };
}


