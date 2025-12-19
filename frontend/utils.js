// Utility functions

export function createPageUrl(page, params = '') {
  const routes = {
    'Home': '/',
    'DesignStudio': '/design',
    'Community': '/community',
    'Checkout': '/checkout',
    'Admin': '/admin',
    'About': '/about',
  };
  const baseUrl = routes[page] || '/';
  // Handle both string params and query string format
  if (params && params.includes('=')) {
    return `${baseUrl}?${params}`;
  }
  return params ? `${baseUrl}?${params}` : baseUrl;
}

