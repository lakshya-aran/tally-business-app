import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true, // send the httpOnly session cookie
  timeout: 30000,
  headers: { 'X-Requested-With': 'XMLHttpRequest' }, // required by the API's CSRF guard
});

let onUnauthorized = () => {};
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

const SESSION_CODES = new Set(['UNAUTHORIZED', 'SESSION_EXPIRED', 'SESSION_REVOKED']);

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status;
    const code = error.response?.data?.error?.code;
    const url = error.config?.url ?? '';
    // A mid-session 401 means the cookie expired/was revoked: drop to the login screen.
    if (status === 401 && SESSION_CODES.has(code) && !url.startsWith('/auth/me') && !url.startsWith('/auth/login')) {
      onUnauthorized();
    }
    return Promise.reject(error);
  }
);

/** Normalize any axios/network error into { message, code, fields }. */
export function parseError(error, fallback = 'Something went wrong. Please try again.') {
  if (!error?.response) {
    return { message: 'Cannot reach the server. Check your connection and try again.', code: 'NETWORK_ERROR', fields: {} };
  }
  const e = error.response.data?.error ?? {};
  return { message: e.message || fallback, code: e.code || 'ERROR', fields: e.details || {} };
}

export default api;
