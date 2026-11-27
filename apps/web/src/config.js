export const PALETTE = {
  stone: '#F6F4EF',
  ink: '#23364D',
  sky: '#9DC8DF',
  green: '#D1E3D5',
  copper: '#C47B4C',
  teal: '#3E7C78',
  building: '#D6E0E8'
};

export const MAP_STYLE = 'mapbox://styles/alfredobernal2004/cmw5u5scy010401qpeu7n9yut';
export const MAP_STYLE_FALLBACK = 'mapbox://styles/mapbox/standard';
export const INITIAL_CAMERA = { center: [1.5218, 42.5063], zoom: 12.8, pitch: 52, bearing: -8 };

export const localConfig = window.BASTION_CONFIG || {};
// Public Mapbox tokens are browser-visible. Supply one locally and restrict it to approved origins and scopes.
export const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || localConfig.mapboxToken || '';
export const mapboxSearchToken = import.meta.env.VITE_MAPBOX_SEARCH_TOKEN || localConfig.searchToken || mapboxToken;
export const posthogKey = import.meta.env.VITE_POSTHOG_KEY || localConfig.posthogKey || '';
export const posthogHost = import.meta.env.VITE_POSTHOG_HOST || localConfig.posthogHost || 'https://us.i.posthog.com';
const defaultEventProviders = [{
  id: 'usgs-all-hour',
  name: 'USGS Earthquakes',
  endpoint: '/api/events?provider=usgs-all-hour',
  sourceUrl: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php',
  verified: true
}];
export const eventProviders = import.meta.env.VITE_EVENT_PROVIDERS
  ? JSON.parse(import.meta.env.VITE_EVENT_PROVIDERS)
  : (Array.isArray(localConfig.eventProviders) ? localConfig.eventProviders : defaultEventProviders);
