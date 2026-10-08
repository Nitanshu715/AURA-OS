/**
 * AURA-OS Client API Client
 * Async fetch wrapper with authentication header injection.
 * 100% Zero Fake Data.
 */

export const api = {
  token: localStorage.getItem('aura_token') || '',

  setToken(t) {
    this.token = t;
    localStorage.setItem('aura_token', t);
  },

  async request(path, options = {}) {
    const headers = options.headers || {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(options.body);
    }
    options.headers = headers;

    const res = await fetch(path, options);
    if (!res.ok && res.status === 401) {
      window.dispatchEvent(new CustomEvent('aura-auth-required'));
    }
    return res;
  },

  async get(path) {
    const res = await this.request(path);
    return res.json();
  },

  async post(path, body) {
    const res = await this.request(path, { method: 'POST', body });
    return res.json();
  }
};
