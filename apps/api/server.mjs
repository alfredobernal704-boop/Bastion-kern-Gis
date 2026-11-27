import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

const port = Number(process.env.PORT || 8787);
const configPath = process.env.EVENT_PROVIDER_CONFIG || new URL('./providers.json', import.meta.url);
const providerCache = new Map();
const providerInFlight = new Map();

async function loadProviders() {
  try { return JSON.parse(await readFile(configPath, 'utf8')); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    if (process.env.EVENT_PROVIDER_CONFIG) return [];
    return JSON.parse(await readFile(new URL('./providers.example.json', import.meta.url), 'utf8'));
  }
}

const field = (object, path) => String(path || '').split('.').filter(Boolean).reduce((value, key) => value?.[key], object);

function decodeXml(value) {
  return String(value || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16))).replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec))).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'").replace(/&amp;/g, '&');
}

function xmlTag(xml, tagName) {
  if (!tagName) return '';
  const local = String(tagName).split(':').pop().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const opening = new RegExp(`<(?:(?:[\\w.-]+):)?${local}\\b[^>]*>([\\s\\S]*?)<\\/(?:(?:[\\w.-]+):)?${local}\\s*>`, 'i');
  const match = String(xml).match(opening);
  return match ? decodeXml(match[1].replace(/<br\s*\/?\s*>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()) : '';
}

function parseRss(xml, provider) {
  if (!/<(?:[\w.-]+:)?(?:rss|feed)\b/i.test(xml)) throw new Error('Publisher response is not an RSS or Atom feed');
  const items = [...xml.matchAll(/<(?:[\w.-]+:)?item\b[^>]*>([\s\S]*?)<\/(?:[\w.-]+:)?item\s*>/gi)].map(match => match[1]);
  const atomEntries = [...xml.matchAll(/<(?:[\w.-]+:)?entry\b[^>]*>([\s\S]*?)<\/(?:[\w.-]+:)?entry\s*>/gi)].map(match => match[1]);
  const records = items.length ? items : atomEntries;
  const m = provider.mapping || {};
  return records.slice(0, 5000).map(item => {
    const values = {
      id: xmlTag(item, m.id || 'guid') || xmlTag(item, 'id') || xmlTag(item, 'link'),
      title: xmlTag(item, m.title || 'title'),
      start: xmlTag(item, m.start),
      end: xmlTag(item, m.end),
      category: xmlTag(item, m.category || 'category') || 'Other',
      url: xmlTag(item, m.url || 'link'),
      longitude: xmlTag(item, m.longitude),
      latitude: xmlTag(item, m.latitude),
      point: xmlTag(item, m.point || 'georss:point')
    };
    let coordinates;
    if (values.point) {
      const nums = values.point.trim().split(/[\s,]+/).map(Number);
      if (nums.length >= 2 && nums.every(Number.isFinite)) coordinates = m.pointOrder === 'lng-lat' ? [nums[0], nums[1]] : [nums[1], nums[0]];
    }
    if (!coordinates && values.longitude && values.latitude) coordinates = [Number(values.longitude), Number(values.latitude)];
    const props = {};
    for (const [key, value] of Object.entries({
      [m.id || 'id']: values.id,
      [m.title || 'title']: values.title,
      [m.start || 'startsAt']: values.start,
      [m.end || 'endsAt']: values.end,
      [m.category || 'category']: values.category,
      [m.url || 'sourceUrl']: values.url || provider.sourceUrl,
      [m.longitude || 'longitude']: values.longitude,
      [m.latitude || 'latitude']: values.latitude
    })) if (value !== '') props[key] = value;
    return { type:'Feature', id:values.id || undefined, properties:props, geometry:coordinates ? {type:'Point',coordinates} : null };
  });
}

function toIsoDate(value, unit = 'milliseconds') {
  if (value === null || value === undefined || value === '') return null;
  const numeric = typeof value === 'number' || (typeof value === 'string' && /^-?\d+(?:\.\d+)?$/.test(value))
    ? Number(value)
    : null;
  const milliseconds = numeric === null ? NaN : unit === 'seconds' ? numeric * 1000 : numeric;
  const date = numeric === null ? new Date(value) : new Date(milliseconds);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function normalize(record, provider, allowedHosts) {
  const map = provider.mapping || {};
  const props = record?.properties || record || {};
  const coords = record?.geometry?.type === 'Point' ? record.geometry.coordinates : [field(props, map.longitude), field(props, map.latitude)];
  const id = record?.id ?? field(props, map.id);
  const title = field(props, map.title);
  const startsAt = toIsoDate(field(props, map.start), map.timestampUnit || 'milliseconds');
  const sourceUrl = field(props, map.url) || provider.sourceUrl;
  const [lng, lat] = Array.isArray(coords) ? coords.map(Number) : [];
  let sourceHost;
  try { const parsed = new URL(sourceUrl); if (parsed.protocol !== 'https:') return null; sourceHost = parsed.hostname; } catch { return null; }
  if (!id || !title || !startsAt || !Number.isFinite(lng) || !Number.isFinite(lat) || Math.abs(lng)>180 || Math.abs(lat)>90 || !allowedHosts.has(sourceHost)) return null;
  const magnitude = Number(field(props, map.magnitude));
  const depthKm = Number.isFinite(Number(coords[2])) ? Number(coords[2]) : null;
  return { type:'Feature', id:String(id), geometry:{type:'Point',coordinates:[lng,lat]}, properties:{
    eventId:String(id), title:String(title), category:String(field(props,map.category)||'Other'), startsAt,
    endsAt:toIsoDate(field(props,map.end), map.timestampUnit || 'milliseconds') || '',
    sourceName:provider.name, sourceUrl, verified:provider.verified === true,
    magnitude:Number.isFinite(magnitude) ? magnitude : null,
    magnitudeType:String(field(props,map.magnitudeType)||''),
    place:String(field(props,map.place)||''), depthKm,
    alert:String(field(props,map.alert)||''), significance:Number.isFinite(Number(field(props,map.significance))) ? Number(field(props,map.significance)) : null,
    reviewStatus:String(field(props,map.reviewStatus)||'')
  } };
}

async function fetchProvider(provider) {
  const cacheKey = `${provider.id}:${provider.endpoint}`;
  const cached = providerCache.get(cacheKey);
  const now = Date.now();
  const decorate = (entry, status, extra = {}) => ({
    ...entry.data,
    provider: { ...entry.data.provider, status, fetchedAt: new Date(entry.fetchedAt).toISOString(), ...extra }
  });
  if (cached && now < cached.freshUntil) return decorate(cached, 'connected', { cached: true });
  if (providerInFlight.has(cacheKey)) return providerInFlight.get(cacheKey);

  const pending = (async () => {
    try {
      const endpoint = new URL(provider.endpoint);
      const source = new URL(provider.sourceUrl);
      const allowedHosts = new Set([source.hostname, ...(Array.isArray(provider.allowedHosts) ? provider.allowedHosts : [])]);
      if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password || !allowedHosts.has(endpoint.hostname)) throw new Error('Feed host is not in the provider allowlist');
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      try {
        const headers = { Accept: 'application/geo+json, application/json, application/rss+xml, application/atom+xml, application/xml, text/xml' };
        if (cached?.etag) headers['If-None-Match'] = cached.etag;
        if (cached?.lastModified) headers['If-Modified-Since'] = cached.lastModified;
        const response = await fetch(endpoint, { headers, redirect: 'error', signal: controller.signal });
        const ttlSeconds = Math.max(15, Math.min(300, Number(provider.cacheTtlSeconds) || 55));
        if (response.status === 304 && cached) {
          const refreshed = { ...cached, freshUntil: Date.now() + ttlSeconds * 1000 };
          providerCache.set(cacheKey, refreshed);
          return decorate(refreshed, 'connected', { cached: true, notModified: true });
        }
        if (!response.ok) throw new Error(`Feed returned HTTP ${response.status}`);
        const contentLength = Number(response.headers.get('content-length') || 0);
        if (contentLength > 5_000_000) throw new Error('Feed response exceeds 5 MB');
        const raw = await response.text();
        if (raw.length > 5_000_000) throw new Error('Feed response exceeds 5 MB');
        let records;
        const contentType = response.headers.get('content-type') || '';
        if (provider.format === 'rss' || /(?:rss|atom|xml)/i.test(contentType)) records = parseRss(raw, provider);
        else {
          const body = JSON.parse(raw);
          records = body.type === 'FeatureCollection' ? body.features : Array.isArray(body.events) ? body.events : Array.isArray(body.features) ? body.features : [];
        }
        const features = records.slice(0, 5000).map(record => normalize(record, provider, allowedHosts)).filter(Boolean);
        const fetchedAt = Date.now();
        const entry = {
          fetchedAt,
          freshUntil: fetchedAt + ttlSeconds * 1000,
          etag: response.headers.get('etag') || '',
          lastModified: response.headers.get('last-modified') || '',
          data: { type:'FeatureCollection', features, provider:{ id:provider.id, name:provider.name, status:'connected', count:features.length, fetchedAt:new Date(fetchedAt).toISOString(), sourceUrl:provider.sourceUrl, verified:provider.verified === true } }
        };
        providerCache.set(cacheKey, entry);
        return decorate(entry, 'connected', { cached: false });
      } finally { clearTimeout(timer); }
    } catch (error) {
      if (cached) return decorate(cached, 'stale', { stale: true, error: 'Latest refresh failed; showing the last successful update.' });
      throw error;
    }
  })();
  providerInFlight.set(cacheKey, pending);
  try { return await pending; }
  finally { providerInFlight.delete(cacheKey); }
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
  response.setHeader('Content-Type','application/json; charset=utf-8');
  response.setHeader('Cache-Control','no-store');
  response.setHeader('Access-Control-Allow-Origin', process.env.APP_ORIGIN || 'http://localhost:4173');
  if (request.method !== 'GET' || !['/health','/api/events'].includes(url.pathname)) { response.writeHead(404).end(JSON.stringify({error:'Not found'})); return; }
  if (url.pathname === '/health') { response.writeHead(200).end(JSON.stringify({ok:true})); return; }
  try {
    const providers = await loadProviders();
    if (!Array.isArray(providers) || providers.length > 20) throw new Error('Invalid provider configuration');
    const selected = providers.filter(item => item && item.enabled !== false && (!url.searchParams.has('provider') || item.id === url.searchParams.get('provider')));
    if (url.searchParams.has('provider') && !selected.length) { response.writeHead(404).end(JSON.stringify({error:'Provider not configured'})); return; }
    const results = await Promise.all(selected.map(async provider => {
      try { return await fetchProvider(provider); }
      catch { return { type:'FeatureCollection', features:[], provider:{ id:provider.id, name:provider.name, status:'error', count:0, error:'Provider temporarily unavailable.', sourceUrl:provider.sourceUrl, verified:provider.verified === true } }; }
    }));
    response.writeHead(200).end(JSON.stringify({ type:'FeatureCollection', features:results.flatMap(item=>item.features), providers:results.map(item=>item.provider) }));
  } catch (error) { response.writeHead(500).end(JSON.stringify({error:'Provider configuration could not be loaded'})); }
});

server.listen(port, () => console.log(`BASTION-KERN GIS event API listening on ${port}`));

