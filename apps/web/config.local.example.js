// Copy to config.local.js for a local prototype. config.local.js is gitignored.
window.BASTION_CONFIG = {
  mapboxToken: "",
  // Optional public token scoped to search:read; the map token is used when omitted.
  searchToken: "",
  posthogKey: "",
  posthogHost: "https://us.i.posthog.com",
  // The default USGS provider uses the same-origin /api proxy and the API's committed provider manifest.
  // Override this array only when configuring another approved provider.
  eventProviders: null
};


