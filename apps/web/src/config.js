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
// Public token for the local starter. Restrict it to the production host before deployment.
const starterPublicToken = 'pk.eyJ1IjoiYWxmcmVkb2Jlcm5hbDIwMDQiLCJhIjoiY21zYTV6MXJ3MHoxcTMwcTl5YW5ib21vYSJ9.--Mb_RcIFMNhO-F5zUjccQ';
export const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || localConfig.mapboxToken || starterPublicToken;
export const mapboxSearchToken = import.meta.env.VITE_MAPBOX_SEARCH_TOKEN || localConfig.searchToken || mapboxToken;
export const posthogKey = import.meta.env.VITE_POSTHOG_KEY || localConfig.posthogKey || '';
export const posthogHost = import.meta.env.VITE_POSTHOG_HOST || localConfig.posthogHost || 'https://us.i.posthog.com';
const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || localConfig.apiBaseUrl || '').replace(/\/$/, '');
const defaultEventProviders = [{
  id: 'usgs-all-hour',
  name: 'USGS Earthquakes',
  endpoint: `${apiBaseUrl}/api/events?provider=usgs-all-hour`,
  sourceUrl: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php',
  verified: true
}];
export const eventProviders = import.meta.env.VITE_EVENT_PROVIDERS
  ? JSON.parse(import.meta.env.VITE_EVENT_PROVIDERS)
  : (Array.isArray(localConfig.eventProviders) ? localConfig.eventProviders : defaultEventProviders);
