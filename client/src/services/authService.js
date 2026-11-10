import api from './api';

const data = (p) => p.then((r) => r.data);

export const authService = {
  me: () => data(api.get('/auth/me')),
  login: (body) => data(api.post('/auth/login', body)),
  register: (body) => data(api.post('/auth/register', body)),
  logout: () => data(api.post('/auth/logout')),
  logoutAll: () => data(api.post('/auth/logout-all')),
  verifyEmail: (token) => data(api.post('/auth/verify-email', { token })),
  resendVerification: (email) => data(api.post('/auth/resend-verification', { email })),
  forgotPassword: (email) => data(api.post('/auth/forgot-password', { email })),
  resetPassword: (body) => data(api.post('/auth/reset-password', body)),
  updateProfile: (body) => data(api.patch('/auth/me', body)),
  changePassword: (body) => data(api.post('/auth/change-password', body)),
};

export const userService = {
  list: (params) => data(api.get('/users', { params })),
  invite: (body) => data(api.post('/users/invite', body)),
  update: (id, body) => data(api.patch(`/users/${id}`, body)),
};

export const systemService = {
  health: () => data(api.get('/health')),
};
