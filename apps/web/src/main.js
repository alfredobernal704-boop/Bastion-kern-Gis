import mapboxgl from 'mapbox-gl';
import * as turf from '@turf/turf';
import posthog from 'posthog-js';
import { SearchBoxCore, SearchSession } from '@mapbox/search-js-core';
import { MAP_STYLE, MAP_STYLE_FALLBACK, INITIAL_CAMERA, mapboxToken, mapboxSearchToken, posthogKey, posthogHost, eventProviders } from './config.js';
import { fetchOfficialEvents } from './events.js';
import 'mapbox-gl/dist/mapbox-gl.css';

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const cssToken = (name, fallback) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
const PALETTE = {
  stone: cssToken('--bk-color-canvas', '#F6F4EF'), ink: cssToken('--bk-color-text-strong', '#23364D'),
  sky: cssToken('--bk-color-brand-sky', '#9DC8DF'), green: cssToken('--bk-color-brand-meadow', '#D1E3D5'),
  copper: cssToken('--bk-color-brand-copper', '#C47B4C'), teal: cssToken('--bk-color-brand-teal', '#3E7C78'),
  building: cssToken('--bk-color-map-building', '#D6E0E8')
};
const readAnalyticsConsent = () => { try { return window.localStorage.getItem('bastion-analytics-consent') === 'granted'; } catch { return false; } };
const state = { mode: 'explore', profile: 'walking', origin: null, destination: null, watchId: null, track: [], drawing: false, areaPoints: [], events: [], providerStates: [], refreshingEvents: false, analyticsConsent: readAnalyticsConsent(), lightPreset: 'day', mapReady: false, importedVisible: true, eventsVisible: true, camera3d: true, eventLayerAdded: false, routeLayerAdded: false, fallbackTried: false, searchMarker: null, searchPopup: null };

function capture(name, properties = {}) {
  if (posthogKey && state.analyticsConsent) posthog.capture(name, properties);
}

if (posthogKey) {
  posthog.init(posthogKey, {
    api_host: posthogHost,
    defaults: '2026-08-30',
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: false,
    disable_session_recording: true,
    opt_out_capturing_by_default: true,
    persistence: 'memory',
    person_profiles: 'identified_only'
  });
  if (state.analyticsConsent) posthog.opt_in_capturing();
}

function updateAnalyticsControl() {
  const button = $('#analytics-consent');
  if (!button) return;
  button.textContent = state.analyticsConsent ? 'Analytics on' : 'Analytics off';
  button.setAttribute('aria-pressed', String(state.analyticsConsent));
  button.setAttribute('aria-label', state.analyticsConsent ? 'Disable optional product analytics' : 'Enable optional product analytics');
}

updateAnalyticsControl();
$('#analytics-consent')?.addEventListener('click', () => {
  state.analyticsConsent = !state.analyticsConsent;
  try { window.localStorage.setItem('bastion-analytics-consent', state.analyticsConsent ? 'granted' : 'denied'); } catch { /* Consent remains session-only if storage is unavailable. */ }
  if (posthogKey) {
    if (state.analyticsConsent) posthog.opt_in_capturing();
    else posthog.opt_out_capturing();
  }
  updateAnalyticsControl();
  toast(state.analyticsConsent ? 'Optional product analytics enabled.' : 'Optional product analytics disabled.');
});

const toast = (message) => {
  const region = $('#toast-region');
  const item = document.createElement('div');
  item.className = 'toast';
  item.textContent = message;
  region.append(item);
  window.setTimeout(() => item.remove(), 4200);
};

let noticeTimeout;
function mapNotice(message) {
  const node = $('#map-notice');
  node.textContent = message;
  node.classList.add('is-visible');
  window.clearTimeout(noticeTimeout);
  noticeTimeout = window.setTimeout(() => node.classList.remove('is-visible'), 3200);
}

function setStatus(status, label) {
  $('#connection-label').textContent = label;
  const dot = document.querySelector('.connection .pulse-dot');
  dot.classList.toggle('is-live', status === 'live');
  $('#sync-state').textContent = label;
}

function coordString(point) {
  if (!point) return '';
  return point[1].toFixed(5) + ', ' + point[0].toFixed(5);
}

function parseCoordinates(value) {
  const match = String(value || '').trim().match(/^(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const first = Number(match[1]);
  const second = Number(match[2]);
  // Search inputs are latitude, longitude; route coordinates use Mapbox [lng, lat].
  const lat = first;
  const lng = second;
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return [lng, lat];
}

function pointFeature(point, role) {
  return { type: 'Feature', properties: { role }, geometry: { type: 'Point', coordinates: point } };
}

function updateRouteEndpoints() {
  $('#origin-input').value = state.origin ? coordString(state.origin) : '';
  $('#destination-input').value = state.destination ? coordString(state.destination) : '';
  const features = [];
  if (state.origin) features.push(pointFeature(state.origin, 'origin'));
  if (state.destination) features.push(pointFeature(state.destination, 'destination'));
  const fc = { type: 'FeatureCollection', features };
  if (state.mapReady && map.getSource('bk-endpoints')) map.getSource('bk-endpoints').setData(fc);
}

function addMapSources() {
  if (!map.getSource('bk-route')) map.addSource('bk-route', { type: 'geojson', data: { type: 'FeatureCollection', features: [] }, lineMetrics: true });
  if (!map.getSource('bk-endpoints')) map.addSource('bk-endpoints', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  if (!map.getSource('bk-area')) map.addSource('bk-area', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  if (!map.getSource('bk-location')) map.addSource('bk-location', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  if (!map.getSource('bk-events')) map.addSource('bk-events', { type: 'geojson', data: { type: 'FeatureCollection', features: [] }, cluster: true, clusterRadius: 44, clusterMaxZoom: 13 });
  if (!map.getSource('bk-imports')) map.addSource('bk-imports', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });

  if (!map.getLayer('bk-route-halo')) map.addLayer({ id: 'bk-route-halo', type: 'line', source: 'bk-route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': PALETTE.teal, 'line-width': 10, 'line-opacity': 0.18, 'line-blur': 2, 'line-trim-offset': [0, 1] } });
  if (!map.getLayer('bk-route-line')) map.addLayer({ id: 'bk-route-line', type: 'line', source: 'bk-route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': PALETTE.teal, 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 3, 15, 4], 'line-opacity': 0.96, 'line-blur': 0.15, 'line-trim-offset': [0, 1] } });
  if (!map.getLayer('bk-area-fill')) map.addLayer({ id: 'bk-area-fill', type: 'fill', source: 'bk-area', paint: { 'fill-color': PALETTE.teal, 'fill-opacity': 0.13 } });
  if (!map.getLayer('bk-area-outline')) map.addLayer({ id: 'bk-area-outline', type: 'line', source: 'bk-area', paint: { 'line-color': PALETTE.teal, 'line-width': 2, 'line-dasharray': [2, 1.5] } });
  if (!map.getLayer('bk-endpoints')) map.addLayer({ id: 'bk-endpoints', type: 'circle', source: 'bk-endpoints', paint: { 'circle-radius': 7, 'circle-color': ['match', ['get', 'role'], 'origin', PALETTE.teal, PALETTE.copper], 'circle-stroke-color': '#fffefa', 'circle-stroke-width': 2.5 } });
  if (!map.getLayer('bk-location-trail')) map.addLayer({ id: 'bk-location-trail', type: 'line', source: 'bk-location', paint: { 'line-color': PALETTE.copper, 'line-width': 2, 'line-opacity': .6, 'line-dasharray': [1, 1.5] } });
  if (!map.getLayer('bk-location-dot')) map.addLayer({ id: 'bk-location-dot', type: 'circle', source: 'bk-location', filter: ['==', ['geometry-type'], 'Point'], paint: { 'circle-radius': 7, 'circle-color': PALETTE.teal, 'circle-stroke-color': '#fffefa', 'circle-stroke-width': 3 } });
  if (!map.getLayer('bk-events-cluster')) map.addLayer({ id: 'bk-events-cluster', type: 'circle', source: 'bk-events', filter: ['has', 'point_count'], paint: { 'circle-color': PALETTE.ink, 'circle-radius': ['step', ['get', 'point_count'], 14, 10, 19, 30, 24], 'circle-stroke-color': '#fffefa', 'circle-stroke-width': 2 } });
  if (!map.getLayer('bk-events-cluster-count')) map.addLayer({ id: 'bk-events-cluster-count', type: 'symbol', source: 'bk-events', filter: ['has', 'point_count'], layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 10, 'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'] }, paint: { 'text-color': '#fffefa' } });
  if (!map.getLayer('bk-events-point')) map.addLayer({ id: 'bk-events-point', type: 'circle', source: 'bk-events', filter: ['!', ['has', 'point_count']], paint: { 'circle-color': PALETTE.copper, 'circle-radius': ['interpolate', ['linear'], ['coalesce', ['get', 'magnitude'], 1], 0, 5, 3, 8, 5, 11, 7, 15], 'circle-stroke-color': '#fffefa', 'circle-stroke-width': 2 } });
  if (!map.getLayer('bk-import-fill')) map.addLayer({ id: 'bk-import-fill', type: 'fill', source: 'bk-imports', filter: ['in', ['geometry-type'], ['literal', ['Polygon', 'MultiPolygon']]], paint: { 'fill-color': PALETTE.sky, 'fill-opacity': .28, 'fill-outline-color': PALETTE.teal } });
  if (!map.getLayer('bk-import-line')) map.addLayer({ id: 'bk-import-line', type: 'line', source: 'bk-imports', filter: ['in', ['geometry-type'], ['literal', ['LineString', 'MultiLineString']]], paint: { 'line-color': PALETTE.teal, 'line-width': 2 } });
  if (!map.getLayer('bk-import-point')) map.addLayer({ id: 'bk-import-point', type: 'circle', source: 'bk-imports', filter: ['==', ['geometry-type'], 'Point'], paint: { 'circle-color': PALETTE.teal, 'circle-radius': 6, 'circle-stroke-color': '#fffefa', 'circle-stroke-width': 2 } });
  state.mapReady = true;
  updateRouteEndpoints();
  syncLayerVisibility();
}

function syncLayerVisibility() {
  if (!state.mapReady) return;
  const visibility = (id, show) => { if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', show ? 'visible' : 'none'); };
  ['bk-events-cluster', 'bk-events-cluster-count', 'bk-events-point'].forEach((id) => visibility(id, state.eventsVisible));
  ['bk-import-fill', 'bk-import-line', 'bk-import-point'].forEach((id) => visibility(id, state.importedVisible));
}

const map = mapboxToken ? new mapboxgl.Map({
  accessToken: mapboxToken,
  container: 'map',
  style: MAP_STYLE,
  center: INITIAL_CAMERA.center,
  zoom: INITIAL_CAMERA.zoom,
  pitch: INITIAL_CAMERA.pitch,
  bearing: INITIAL_CAMERA.bearing,
  projection: 'globe',
  attributionControl: false,
  antialias: true,
  maxPitch: 75,
  cooperativeGestures: true
}) : null;

if (!map) {
  $('#map-empty').hidden = false;
  setStatus('off', 'Token needed');
} else {
  map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right');
  map.on('load', () => {
    try {
      map.setConfigProperty('basemap', 'theme', 'faded');
      map.setConfigProperty('basemap', 'lightPreset', 'day');
      map.setConfigProperty('basemap', 'show3dObjects', true);
    } catch (error) { console.info('Using saved basemap configuration.', error?.message); }
    addMapSources();
    renderEvents();
    map.on('click', 'bk-events-point', (event) => {
      const feature = event.features?.[0];
      if (feature) showFeature(feature.properties || {});
    });
    map.on('click', 'bk-events-cluster', (event) => {
      const feature = event.features?.[0];
      if (!feature) return;
      const clusterId = feature.properties.cluster_id;
      map.getSource('bk-events').getClusterExpansionZoom(clusterId, (error, zoom) => {
        if (!error && Number.isFinite(zoom)) map.easeTo({ center: feature.geometry.coordinates, zoom, duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 350 });
      });
    });
    map.on('mouseenter', 'bk-events-point', () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', 'bk-events-point', () => { map.getCanvas().style.cursor = ''; });
    map.on('mouseenter', 'bk-events-cluster', () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', 'bk-events-cluster', () => { map.getCanvas().style.cursor = ''; });
    setStatus('live', 'Map ready');
    $('#map-empty').hidden = true;
  });
  map.on('error', (event) => {
    const message = event?.error?.message || 'Map request failed';
    if (!state.mapReady && !state.fallbackTried && /style|token|401|403/i.test(message)) {
      state.fallbackTried = true;
      map.setStyle(MAP_STYLE_FALLBACK);
      mapNotice('Private style unavailable. Loading the public Standard style.');
      return;
    }
    setStatus('off', 'Map error');
    if (!state.mapReady && /style|token|401|403/i.test(message)) {
      $('#map-empty').hidden = false;
      $('#map-empty p').textContent = 'Check your local public token and style access. The public Standard fallback also failed.';
    }
    console.warn('Mapbox error:', message);
  });
  map.on('mousemove', (event) => {
    const { lng, lat } = event.lngLat;
    $('#cursor-coords').innerHTML = lat.toFixed(4) + '° ' + (lat < 0 ? 'S' : 'N') + '&nbsp; ' + Math.abs(lng).toFixed(4) + '° ' + (lng < 0 ? 'W' : 'E');
  });
  map.on('click', (event) => {
    const point = [event.lngLat.lng, event.lngLat.lat];
    if (state.drawing) {
      state.areaPoints.push(point);
      updateDrawing();
      return;
    }
    if (state.mode === 'navigate') {
      if (!state.origin) { state.origin = point; mapNotice('Origin set. Select a destination.'); }
      else if (!state.destination) { state.destination = point; mapNotice('Destination set. Find your route.'); }
      else { state.origin = point; state.destination = null; mapNotice('Route reset. Select a destination.'); }
      updateRouteEndpoints();
      return;
    }
    const features = map.queryRenderedFeatures(event.point);
    if (features.length) {
      const feature = features.find((item) => item.properties?.title || item.properties?.name || item.properties?.id);
      if (feature) showFeature(feature.properties);
    }
  });
}

function showFeature(properties) {
  const title = properties.title || properties.name || 'Map feature';
  $('.feature-empty').innerHTML = '<span>✳</span><p></p><small></small>';
  $('.feature-empty p').textContent = title;
  const magnitude = Number.isFinite(Number(properties.magnitude)) ? ' · M ' + Number(properties.magnitude).toFixed(1) : '';
  const place = properties.place ? ' · ' + properties.place : '';
  const review = properties.reviewStatus === 'reviewed' ? ' · Reviewed event' : properties.reviewStatus === 'automatic' ? ' · Automatic solution' : '';
  $('.feature-empty small').textContent = (properties.sourceName ? 'Official source · ' + properties.sourceName : 'Feature details from the selected layer.') + magnitude + review + place;
}

function updateDrawing() {
  if (!state.mapReady) return;
  const points = state.areaPoints;
  const features = [];
  if (points.length >= 2) {
    features.push({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: points } });
  }
  if (points.length >= 3) {
    const ring = [...points, points[0]];
    features.push({ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [ring] } });
  }
  map.getSource('bk-area').setData({ type: 'FeatureCollection', features });
  $('#finish-area').disabled = points.length < 3;
  $('#area-result').textContent = points.length + (points.length === 1 ? ' point selected' : ' points selected');
}

function closeRing(points) { return points.length > 0 ? [...points, points[0]] : []; }

function areaOfPolygon(points) {
  const ring = closeRing(points);
  if (ring.length < 4) return 0;
  const polygon = turf.polygon([ring]);
  return turf.area(polygon);
}

function formatArea(sqMeters) {
  if (sqMeters < 1000000) return (sqMeters / 10000).toFixed(2) + ' ha';
  return (sqMeters / 1000000).toFixed(2) + ' km²';
}

function formatDistance(meters) { return meters >= 1000 ? (meters / 1000).toFixed(1) + ' km' : Math.round(meters) + ' m'; }
function formatDuration(seconds) { const mins = Math.max(1, Math.round(seconds / 60)); return mins >= 60 ? Math.floor(mins / 60) + ' h ' + (mins % 60) + ' min' : mins + ' min'; }

function revealRoute(geometry) {
  const source = map.getSource('bk-route');
  const feature = { type: 'Feature', properties: {}, geometry };
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    source.setData(feature);
    map.setPaintProperty('bk-route-halo', 'line-trim-offset', [1, 1]);
    map.setPaintProperty('bk-route-line', 'line-trim-offset', [1, 1]);
    return;
  }
  map.setPaintProperty('bk-route-halo', 'line-trim-offset', [0, 1]);
  map.setPaintProperty('bk-route-line', 'line-trim-offset', [0, 1]);
  source.setData(feature);
  const started = performance.now();
  const drawFrame = (now) => {
    const motionMs = Number.parseFloat(cssToken('--bk-motion-control', '240ms')) || 240;
    const t = Math.min(1, (now - started) / motionMs);
    const eased = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    map.setPaintProperty('bk-route-halo', 'line-trim-offset', [eased, 1]);
    map.setPaintProperty('bk-route-line', 'line-trim-offset', [eased, 1]);
    if (t < 1) requestAnimationFrame(drawFrame);
  };
  requestAnimationFrame(drawFrame);
}

function setActiveMode(mode) {
  state.mode = mode;
  $$('.mode-tab').forEach((button) => button.classList.toggle('is-active', button.dataset.mode === mode));
  $('#route-section').classList.toggle('is-emphasized', mode === 'navigate');
  capture('mode_changed', { mode });
  if (mode === 'navigate') mapNotice('Choose an origin and destination on the map.');
}

$$('.mode-tab').forEach((button) => button.addEventListener('click', () => setActiveMode(button.dataset.mode)));
$$('.profile').forEach((button) => button.addEventListener('click', () => {
  state.profile = button.dataset.profile;
  $$('.profile').forEach((item) => item.classList.toggle('is-selected', item === button));
}));

const searchSession = mapboxSearchToken ? new SearchSession(new SearchBoxCore({ accessToken: mapboxSearchToken }), 300) : null;
const searchInput = $('#coordinate-search');
const searchResults = $('#search-results');
let visibleSearchItems = [];
let highlightedSearchItem = -1;
let searchSequence = 0;

function closeSearchResults() {
  visibleSearchItems = [];
  highlightedSearchItem = -1;
  searchResults.replaceChildren();
  searchResults.hidden = true;
  searchInput.setAttribute('aria-expanded', 'false');
  searchInput.removeAttribute('aria-activedescendant');
}

function renderSearchResults(items) {
  visibleSearchItems = items;
  highlightedSearchItem = -1;
  searchResults.replaceChildren();
  for (const [index, item] of items.entries()) {
    const option = document.createElement('button');
    option.className = 'search-result';
    option.type = 'button';
    option.id = 'search-result-' + index;
    option.setAttribute('role', 'option');
    option.setAttribute('aria-selected', 'false');
    const title = document.createElement('strong'); title.textContent = item.title;
    const description = document.createElement('small'); description.textContent = item.description;
    option.append(title, description);
    option.addEventListener('mousedown', (event) => event.preventDefault());
    option.addEventListener('click', () => selectSearchItem(item));
    searchResults.append(option);
  }
  searchResults.hidden = items.length === 0;
  searchInput.setAttribute('aria-expanded', String(items.length > 0));
}

async function updateSearch(query, { currentArea = false } = {}) {
  const sequence = ++searchSequence;
  const term = query.trim();
  if (term.length < 2 || parseCoordinates(term)) { closeSearchResults(); return; }
  const matchingEvents = state.events
    .filter((item) => (item.title + ' ' + item.category).toLocaleLowerCase().includes(term.toLocaleLowerCase()))
    .slice(0, 3)
    .map((event) => ({ kind: 'event', event, title: event.title, description: event.category + ' · ' + event.sourceName }));
  if (!searchSession) { renderSearchResults(matchingEvents); return; }
  try {
    const center = map?.getCenter()?.toArray() || [1.5218, 42.5063];
    const options = { country: 'AD', language: 'en', proximity: center, types: new Set(['address', 'poi', 'place']) };
    if (currentArea && map && state.mapReady) options.bbox = map.getBounds().toArray().flat();
    const response = await searchSession.suggest(term, options);
    if (sequence !== searchSequence) return;
    const placeItems = (response.suggestions || []).slice(0, 5).map((suggestion) => ({
      kind: 'place', suggestion,
      title: suggestion.name || suggestion.name_preferred || term,
      description: suggestion.place_formatted || suggestion.full_address || suggestion.description || 'Place in Andorra'
    }));
    renderSearchResults([...matchingEvents, ...placeItems].slice(0, 6));
  } catch (error) {
    if (sequence !== searchSequence) return;
    renderSearchResults(matchingEvents);
    if (!matchingEvents.length) toast(/401|403|token|scope/i.test(error?.message || '') ? 'Mapbox Search needs a public token scoped to search:read.' : 'Place search is unavailable. Try coordinates or check the search token.');
  }
}

async function selectSearchItem(item) {
  closeSearchResults();
  let point;
  let details;
  if (item.kind === 'event') {
    point = item.event.coordinates;
    details = item.event.title;
  } else {
    try {
      const result = await searchSession.retrieve(item.suggestion);
      const feature = result.features?.[0];
      point = feature?.geometry?.coordinates;
      details = feature?.properties?.full_address || feature?.properties?.place_formatted || feature?.properties?.name || item.title;
    } catch (error) { toast('Could not retrieve that place. Check the search token and try again.'); return; }
  }
  if (!point || !map) { toast('Load the Mapbox map before opening a search result.'); return; }
  if (state.mode === 'navigate' && state.origin) { state.destination = point; updateRouteEndpoints(); }
  if (state.searchMarker) state.searchMarker.remove();
  if (state.searchPopup) state.searchPopup.remove();
  state.searchMarker = new mapboxgl.Marker({ color: item.kind === 'event' ? PALETTE.copper : PALETTE.teal }).setLngLat(point).addTo(map);
  const popupText = document.createElement('div');
  popupText.className = 'search-popup';
  popupText.textContent = details;
  state.searchPopup = new mapboxgl.Popup({ offset: 18, closeButton: true }).setLngLat(point).setDOMContent(popupText).addTo(map);
  map.flyTo({ center: point, zoom: 15, duration: 850 });
  searchInput.value = item.title;
}

searchInput.addEventListener('input', (event) => updateSearch(event.currentTarget.value));
searchInput.addEventListener('keydown', async (event) => {
  if (event.key === 'ArrowDown' && visibleSearchItems.length) {
    event.preventDefault();
    highlightedSearchItem = (highlightedSearchItem + 1) % visibleSearchItems.length;
  } else if (event.key === 'ArrowUp' && visibleSearchItems.length) {
    event.preventDefault();
    highlightedSearchItem = highlightedSearchItem <= 0 ? visibleSearchItems.length - 1 : highlightedSearchItem - 1;
  } else if (event.key === 'Escape') {
    closeSearchResults(); return;
  } else if (event.key === 'Enter') {
    event.preventDefault();
    if (highlightedSearchItem >= 0) { await selectSearchItem(visibleSearchItems[highlightedSearchItem]); return; }
    if (visibleSearchItems.length) { await selectSearchItem(visibleSearchItems[0]); return; }
    const point = parseCoordinates(event.currentTarget.value);
    if (!point) { await updateSearch(event.currentTarget.value); return; }
    if (!map) { toast('Load the Mapbox map before searching coordinates.'); return; }
    map.flyTo({ center: point, zoom: 15, duration: 850 });
    event.currentTarget.blur();
  } else return;
  [...searchResults.children].forEach((option, index) => {
    option.setAttribute('aria-selected', String(index === highlightedSearchItem));
  });
  if (highlightedSearchItem >= 0) searchInput.setAttribute('aria-activedescendant', 'search-result-' + highlightedSearchItem);
});
searchInput.addEventListener('blur', () => window.setTimeout(closeSearchResults, 120));
$('#search-this-area').addEventListener('click', () => {
  if (!searchInput.value.trim()) { mapNotice('Search for a place, coordinate, or event in this area.'); searchInput.focus(); return; }
  updateSearch(searchInput.value, { currentArea: true });
});
$('#show-filters').addEventListener('click', () => $('.layers-block').scrollIntoView({ behavior: 'smooth', block: 'start' }));

$('#origin-input').addEventListener('change', (event) => { state.origin = parseCoordinates(event.target.value); updateRouteEndpoints(); });
$('#destination-input').addEventListener('change', (event) => { state.destination = parseCoordinates(event.target.value); updateRouteEndpoints(); });

$('#build-route').addEventListener('click', async () => {
  if (!map || !state.mapReady) { toast('Load the map token before routing.'); return; }
  const origin = parseCoordinates($('#origin-input').value) || state.origin;
  const destination = parseCoordinates($('#destination-input').value) || state.destination;
  if (!origin || !destination) { setActiveMode('navigate'); toast('Choose an origin and destination on the map or enter coordinates.'); return; }
  state.origin = origin; state.destination = destination; updateRouteEndpoints();
  const directionsToken = import.meta.env.VITE_MAPBOX_DIRECTIONS_TOKEN || window.BASTION_CONFIG?.directionsToken || '';
  let route = null;
  let providerLabel = '';
  if (directionsToken) {
    try {
      const profile = state.profile === 'walking' ? 'walking' : state.profile === 'cycling' ? 'cycling' : 'driving';
      const url = 'https://api.mapbox.com/directions/v5/mapbox/' + profile + '/' + origin.join(',') + ';' + destination.join(',') + '?geometries=geojson&overview=full&access_token=' + encodeURIComponent(directionsToken);
      const response = await fetch(url);
      if (!response.ok) throw new Error('Mapbox Directions unavailable (' + response.status + ').');
      const body = await response.json();
      route = body.routes?.[0];
      providerLabel = 'Mapbox Directions';
    } catch (error) { toast(error.message + ' Falling back to demo routing.'); }
  }
  if (!route) {
    const disclosure = 'The OSRM public demo service will receive the route origin and destination coordinates. Its service has no SLA. Continue?';
    if (!window.confirm(disclosure)) return;
    try {
      const profile = state.profile === 'walking' ? 'foot' : state.profile === 'cycling' ? 'cycling' : 'driving';
      const endpoint = 'https://router.project-osrm.org/route/v1/' + profile + '/' + origin.join(',') + ';' + destination.join(',') + '?overview=full&geometries=geojson&steps=false';
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error('Demo router unavailable.');
      const body = await response.json();
      route = body.routes?.[0];
      providerLabel = 'OSRM demo · no SLA';
    } catch (error) { toast(error.message); return; }
  }
  if (!route?.geometry?.coordinates?.length) { toast('No route was returned for these points.'); return; }
  revealRoute(route.geometry);
  map.fitBounds(turf.bbox(turf.lineString(route.geometry.coordinates)), { padding: 90, maxZoom: 15, duration: 240 });
  $('#route-result').textContent = formatDistance(route.distance) + ' · ' + formatDuration(route.duration) + ' · ' + providerLabel;
  capture('route_requested', { profile: state.profile, provider: directionsToken && providerLabel === 'Mapbox Directions' ? 'mapbox' : 'osrm_demo' });
});

$('#toggle-3d').addEventListener('change', (event) => {
  try { map?.setConfigProperty('basemap', 'show3dObjects', event.target.checked); } catch { toast('This style does not expose the 3D object setting.'); }
  capture('layer_toggled', { layer: '3d_objects', enabled: event.target.checked });
});
$('#toggle-events').addEventListener('change', (event) => { state.eventsVisible = event.target.checked; syncLayerVisibility(); capture('layer_toggled', { layer: 'events', enabled: event.target.checked }); });
$('#toggle-places').addEventListener('change', (event) => {
  try { map?.setConfigProperty('basemap', 'showPointOfInterestLabels', event.target.checked); }
  catch { toast('Places labels are not configurable in this style.'); }
  capture('layer_toggled', { layer: 'places', enabled: event.target.checked });
});

$('#theme-toggle').addEventListener('click', () => {
  state.lightPreset = state.lightPreset === 'day' ? 'night' : 'day';
  try { map?.setConfigProperty('basemap', 'lightPreset', state.lightPreset); } catch { toast('Lighting is controlled by the active Mapbox style.'); }
  $('#theme-toggle').setAttribute('aria-label', state.lightPreset === 'day' ? 'Switch to night lighting' : 'Switch to day lighting');
});

$('#zoom-in').addEventListener('click', () => map?.zoomTo(map.getZoom() + 1, { duration: 250 }));
$('#zoom-out').addEventListener('click', () => map?.zoomTo(map.getZoom() - 1, { duration: 250 }));
$('#reset-bearing').addEventListener('click', () => map?.easeTo({ bearing: 0, duration: 350 }));
$('#reset-view').addEventListener('click', () => {
  if (!map) return;
  state.camera3d = true;
  $('#toggle-camera').setAttribute('aria-pressed', 'true');
  map.flyTo({ ...INITIAL_CAMERA, duration: 850 });
});
$('#toggle-camera').addEventListener('click', () => {
  if (!map) { toast('Load the map before changing the camera.'); return; }
  state.camera3d = !state.camera3d;
  $('#toggle-camera').setAttribute('aria-pressed', String(state.camera3d));
  map.easeTo({
    pitch: state.camera3d ? 58 : 0,
    bearing: state.camera3d ? -12 : 0,
    duration: 350,
    easing: (t) => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
  });
});
$('#collapse-left').addEventListener('click', () => $('#left-panel').classList.toggle('is-collapsed'));
$('#collapse-right').addEventListener('click', () => $('#right-panel').classList.toggle('is-collapsed'));

$('#locate-me').addEventListener('click', () => {
  if (!navigator.geolocation) { toast('Geolocation is not available in this browser.'); return; }
  if (state.watchId !== null) {
    navigator.geolocation.clearWatch(state.watchId);
    state.watchId = null;
    $('#location-state').textContent = 'OFF';
    $('#fix-title').textContent = 'Location off';
    $('#fix-detail').textContent = 'Choose Locate me to begin';
    $('#fix-track').textContent = 'OFF';
    $('#fix-accuracy').textContent = '—';
    document.querySelector('.live-chip .pulse-dot')?.classList.remove('is-live');
    toast('Live location paused on this device.');
    return;
  }
  $('#location-state').textContent = 'WAIT';
  navigator.geolocation.getCurrentPosition((position) => {
    const { longitude, latitude, accuracy } = position.coords;
    const point = [longitude, latitude];
    state.track.push(point);
    updateLocation(point);
    map?.flyTo({ center: point, zoom: 15, pitch: 58, duration: 900 });
    $('#fix-accuracy').textContent = '±' + Math.round(accuracy) + ' m';
    $('#fix-title').textContent = 'Location active';
    $('#fix-detail').textContent = 'Coordinates remain on this device';
    $('#fix-track').textContent = 'ON';
    $('#location-state').textContent = 'ON';
    document.querySelector('.live-chip .pulse-dot')?.classList.add('is-live');
    state.watchId = navigator.geolocation.watchPosition((next) => {
      const p = [next.coords.longitude, next.coords.latitude];
      state.track.push(p);
      if (state.track.length > 2000) state.track.splice(0, state.track.length - 2000);
      updateLocation(p);
      $('#fix-accuracy').textContent = '±' + Math.round(next.coords.accuracy) + ' m';
    }, (error) => toast(error.message), { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 });
    capture('location_tracking_started');
  }, (error) => { $('#location-state').textContent = 'OFF'; toast('Location permission or fix unavailable: ' + error.message); }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 1000 });
});

function updateLocation(point) {
  if (!state.mapReady) return;
  const features = [pointFeature(point, 'user')];
  if (state.track.length > 1) features.push({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [...state.track] } });
  map.getSource('bk-location').setData({ type: 'FeatureCollection', features });
}

$('#draw-area').addEventListener('click', () => {
  if (!map || !state.mapReady) { toast('Load the map before drawing.'); return; }
  state.drawing = true;
  state.areaPoints = [];
  $('#finish-area').disabled = true;
  map.getCanvas().style.cursor = 'crosshair';
  mapNotice('Tap points around the area, then select Finish.');
});
$('#finish-area').addEventListener('click', () => {
  if (state.areaPoints.length < 3) return;
  state.drawing = false;
  map.getCanvas().style.cursor = '';
  const area = areaOfPolygon(state.areaPoints);
  const perimeter = turf.length(turf.lineString(closeRing(state.areaPoints)), { units: 'kilometers' });
  $('#area-result').textContent = formatArea(area) + ' · ' + perimeter.toFixed(2) + ' km perimeter';
  $('#finish-area').disabled = true;
  capture('area_measured', { vertices: state.areaPoints.length });
});

$('#import-geojson').addEventListener('click', () => $('#geojson-file').click());
$('#geojson-file').addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const collection = data.type === 'FeatureCollection' ? data : data.type === 'Feature' ? { type: 'FeatureCollection', features: [data] } : null;
    if (!collection || !Array.isArray(collection.features)) throw new Error('Choose a GeoJSON Feature or FeatureCollection.');
    const bbox = turf.bbox(collection);
    if (bbox.some((value) => !Number.isFinite(value))) throw new Error('The GeoJSON has invalid coordinate bounds.');
    map.getSource('bk-imports').setData(collection);
    $('#import-count').textContent = collection.features.length + ' feature' + (collection.features.length === 1 ? '' : 's') + ' · ' + file.name;
    map.fitBounds(bbox, { padding: 80, maxZoom: 15, duration: 800 });
    capture('geojson_imported', { feature_count: collection.features.length });
  } catch (error) { toast(error.message || 'Could not read this GeoJSON file.'); }
  event.target.value = '';
});

function renderEvents() {
  const features = state.events.map((item) => ({ type: 'Feature', id: item.id, properties: { title: item.title, category: item.category, sourceName: item.sourceName, sourceUrl: item.sourceUrl, startsAt: item.startsAt, verified: item.verified, magnitude: item.magnitude, magnitudeType: item.magnitudeType, place: item.place, depthKm: item.depthKm, alert: item.alert, reviewStatus: item.reviewStatus }, geometry: { type: 'Point', coordinates: item.coordinates } }));
  if (state.mapReady) map.getSource('bk-events').setData({ type: 'FeatureCollection', features });
  const connected = state.providerStates.filter((source) => source.status === 'connected');
  const stale = state.providerStates.filter((source) => source.status === 'stale');
  const failed = state.providerStates.filter((source) => source.status === 'error');
  const activeSources = connected.length + stale.length;
  const verifiedSourceCount = [...connected, ...stale].filter((source) => source.verified).length;
  const usgsStatus = state.providerStates.find((source) => source.id === 'usgs-all-hour')?.status || 'ready';
  const usgsLabel = usgsStatus === 'connected' ? 'LIVE' : usgsStatus === 'stale' ? 'DELAYED' : usgsStatus === 'error' ? 'OFFLINE' : 'READY';
  $$('[data-provider-status="usgs-all-hour"]').forEach((node) => {
    node.textContent = usgsLabel;
    node.classList.toggle('is-connected', usgsStatus === 'connected');
    node.classList.toggle('is-delayed', usgsStatus === 'stale');
  });
  $('#event-count').textContent = `${state.events.length} event${state.events.length === 1 ? '' : 's'} · ${activeSources} source${activeSources === 1 ? '' : 's'}${stale.length ? ' · delayed' : ''}`;
  $('#event-layer-status').textContent = state.events.length ? `${state.events.length} live event${state.events.length === 1 ? '' : 's'}${stale.length ? ' · delayed' : ''}` : activeSources ? 'Live feed connected · no recent events' : 'Feed connection unavailable';
  $('.event-card-kicker').textContent = stale.length ? `DELAYED · LAST UPDATE ${new Date(stale[0].fetchedAt).toLocaleTimeString()}` : activeSources ? `${verifiedSourceCount} VERIFIED SOURCE${verifiedSourceCount === 1 ? '' : 'S'} · LIVE GEOJSON` : failed.length ? 'SOURCE UNAVAILABLE · RETRYING' : 'SOURCE STATUS · AWAITING FEED';
  $('#event-card-title').textContent = state.events.length ? 'Live geospatial events' : activeSources ? 'No events in this feed window' : 'Official feed unavailable';
  $('.event-card-description').textContent = state.events.length ? 'Tap an event to locate it on the map. Each record links to its source.' : activeSources ? 'No records were returned for this time window.' : 'The map remains available while feeds reconnect.';
  const list = $('#event-list');
  list.replaceChildren();
  for (const item of state.events) {
    const card = document.createElement('article');
    card.className = 'event-card';
    const title = document.createElement('strong'); title.textContent = item.title;
    const magnitude = Number.isFinite(item.magnitude) ? `M ${item.magnitude.toFixed(1)}${item.magnitudeType ? ` ${item.magnitudeType}` : ''}` : item.category;
    const meta = document.createElement('small'); meta.textContent = `${magnitude} · ${new Date(item.startsAt).toLocaleString()}`;
    const review = item.reviewStatus === 'reviewed' ? 'Reviewed event' : item.reviewStatus === 'automatic' ? 'Automatic solution' : '';
    const provenance = document.createElement('small'); provenance.textContent = `${item.verified ? 'Official source' : 'Source link · verification pending'}${review ? ' · ' + review : ''}${item.place ? ' · ' + item.place : ''}${Number.isFinite(item.depthKm) ? ' · ' + item.depthKm.toFixed(1) + ' km depth' : ''}`;
    const focus = document.createElement('button'); focus.className = 'event-focus-button'; focus.type = 'button'; focus.textContent = 'Locate on map';
    focus.addEventListener('click', () => {
      map?.flyTo({ center: item.coordinates, zoom: 7.5, pitch: 48, duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 620 });
      showFeature({ title: item.title, sourceName: item.sourceName, magnitude: item.magnitude, place: item.place, reviewStatus: item.reviewStatus });
    });
    const link = document.createElement('a'); link.href = item.sourceUrl; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = 'Open publisher page';
    card.append(title, meta, provenance, focus, link); list.append(card);
  }
  const empty = $('.empty-note');
  empty.hidden = state.events.length > 0;
  empty.querySelector('span:last-child').textContent = activeSources ? 'No event records were returned for the current feed window.' : 'Official event data appears when a source is connected.';
}

async function refreshEvents() {
  if (state.refreshingEvents) return;
  state.refreshingEvents = true;
  $('#refresh-events').textContent = 'Loading…';
  try {
    const result = await fetchOfficialEvents(eventProviders);
    state.events = result.events;
    state.providerStates = result.providerStates;
    renderEvents();
    const successCount = result.providerStates.filter((source) => source.status === 'connected' || source.status === 'stale').length;
    const errorCount = result.providerStates.filter((source) => source.status === 'error').length;
    if (errorCount) toast('One or more event providers could not refresh.');
    capture('provider_refresh_result', { connected_sources: successCount, event_count: state.events.length, error_count: errorCount });
  } finally {
    state.refreshingEvents = false;
    $('#refresh-events').textContent = 'Refresh feed →';
  }
}
$('#refresh-events').addEventListener('click', () => {
  if (!eventProviders.length) {
    $('#provider-details').open = true;
    $('#provider-details').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    return;
  }
  refreshEvents();
});

// Small panels remain operational on narrow screens; close the panels only, not the map state.
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && state.drawing) {
    state.drawing = false; state.areaPoints = []; map?.getCanvas().style && (map.getCanvas().style.cursor = ''); updateDrawing(); $('#finish-area').disabled = true;
  }
});

refreshEvents();
if (eventProviders.length) window.setInterval(() => { if (!document.hidden) refreshEvents(); }, 60_000);


