/** Production overrides — replace at deploy time. */
export const environment = {
  production: true,
  apiBaseUrl: '/api-proxy', // reverse-proxied to Flask in production
};
