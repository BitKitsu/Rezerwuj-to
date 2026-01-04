import axios from 'axios';

// Konfiguracja API - używamy API Gateway
const API_GATEWAY_URL = 'http://localhost:5000';
const API_BASE_URL = `${API_GATEWAY_URL}/reservation`;
const IDENTITY_BASE_URL = `${API_GATEWAY_URL}/identity`;
const NOTIFICATION_BASE_URL = `${API_GATEWAY_URL}/notification/notifications`;

const parseJwt = (token) => {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(payload)
        .split('')
        .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join('')
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
};

const isJwtExpired = (token, skewSeconds = 30) => {
  const payload = parseJwt(token);
  const exp = payload?.exp;
  if (!exp || typeof exp !== 'number') return false;
  const now = Math.floor(Date.now() / 1000);
  return exp <= now + skewSeconds;
};

// Token Manager
export const tokenManager = {
  getAccessToken: () => localStorage.getItem('accessToken'),
  getRefreshToken: () => localStorage.getItem('refreshToken'),
  getValidAccessToken: async () => {
    const token = tokenManager.getAccessToken();
    if (token && !isJwtExpired(token)) return token;

    const refreshToken = tokenManager.getRefreshToken();
    if (!refreshToken) return '';

    try {
      const refreshed = await refreshTokensSingleFlight();
      return refreshed?.accessToken || '';
    } catch {
      tokenManager.clearTokens();
      return '';
    }
  },
  setTokens: (accessToken, refreshToken) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  },
  clearTokens: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('authChanged'));
    }
  },
  setUser: (user) => localStorage.setItem('user', JSON.stringify(user)),
  getUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },
  isAuthenticated: () => !!(localStorage.getItem('accessToken') || localStorage.getItem('refreshToken'))
};

let refreshPromise = null;

const refreshTokensSingleFlight = async () => {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = tokenManager.getRefreshToken();
    if (!refreshToken) {
      throw new Error('Refresh token not available');
    }

    const response = await axios.post(`${IDENTITY_BASE_URL}/refreshtoken/refresh`, {
      refreshToken,
    });

    const { accessToken, refreshToken: newRefreshToken } = response.data;
    tokenManager.setTokens(accessToken, newRefreshToken);

    const currentUser = tokenManager.getUser();
    if (currentUser) {
      tokenManager.setUser({
        ...currentUser,
        roles: response.data.roles ?? currentUser.roles,
        companyId: response.data.companyId ?? currentUser.companyId,
        companyRole: response.data.companyRole ?? currentUser.companyRole,
      });
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('authChanged'));
    }

    return { accessToken };
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
};

// Instancja dla ReservationService
const reservationAPI = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Instancja dla IdentityService
const identityAPI = axios.create({
  baseURL: IDENTITY_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Instancja dla NotificationService
const notificationAPI = axios.create({
  baseURL: NOTIFICATION_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Instancja dla Notification Templates (ApiGateway -> NotificationService)
const notificationTemplatesAPIInstance = axios.create({
  baseURL: `${API_GATEWAY_URL}/notification/templates`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor dla ReservationService - dodaj token
reservationAPI.interceptors.request.use(
  (config) => {
    const token = tokenManager.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor dla IdentityService - dodaj token  
identityAPI.interceptors.request.use(
  (config) => {
    const token = tokenManager.getAccessToken();
    if (token && !config.url.includes('/login') && !config.url.includes('/register')) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

notificationAPI.interceptors.request.use(
  (config) => {
    const token = tokenManager.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

notificationTemplatesAPIInstance.interceptors.request.use(
  (config) => {
    const token = tokenManager.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - obsługa wygasłego tokenu
const handleTokenRefresh = async (error, apiInstance) => {
  const originalRequest = error.config;

  if (error.response?.status === 401 && !originalRequest._retry) {
    if (originalRequest?.url?.includes('/refreshtoken/refresh')) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const { accessToken } = await refreshTokensSingleFlight();

      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      return apiInstance(originalRequest);
    } catch (refreshError) {
      tokenManager.clearTokens();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      return Promise.reject(refreshError);
    }
  }

  return Promise.reject(error);
};

reservationAPI.interceptors.response.use(
  (response) => response,
  (error) => handleTokenRefresh(error, reservationAPI)
);

identityAPI.interceptors.response.use(
  (response) => response,
  (error) => handleTokenRefresh(error, identityAPI)
);

notificationAPI.interceptors.response.use(
  (response) => response,
  (error) => handleTokenRefresh(error, notificationAPI)
);

notificationTemplatesAPIInstance.interceptors.response.use(
  (response) => response,
  (error) => handleTokenRefresh(error, notificationTemplatesAPIInstance)
);

// ===== Identity Service =====
export const authAPI = {
  register: (data) => identityAPI.post('/account/register', data),
  verifyEmail: (data) => identityAPI.post('/account/verify-email', data),
  resendEmailVerification: (data) => identityAPI.post('/account/resend-verification', data),
  login: async (data) => {
    const response = await identityAPI.post('/account/login', data);
    if (response.data.accessToken && response.data.refreshToken) {
      tokenManager.setTokens(response.data.accessToken, response.data.refreshToken);
      tokenManager.setUser({
        userId: response.data.userId,
        email: response.data.email,
        firstName: response.data.firstName,
        lastName: response.data.lastName,
        roles: response.data.roles || [],
        companyId: response.data.companyId ?? null,
        companyRole: response.data.companyRole ?? null,
      });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('authChanged'));
      }
    }
    return response;
  },
  logout: async () => {
    try {
      await identityAPI.post('/account/logout');
    } finally {
      tokenManager.clearTokens();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('authChanged'));
        window.location.href = '/login';
      }
    }
  },
  refreshToken: (refreshToken) => identityAPI.post('/refreshtoken/refresh', { refreshToken }),
  getProfile: () => identityAPI.get('/account/profile'),
  updateProfile: (data) => identityAPI.put('/account/profile', data),
  changePassword: (data) => identityAPI.post('/account/change-password', data),
  deleteAccount: () => identityAPI.delete('/account/delete'),
  assignCompany: async (companyId) => {
    const response = await identityAPI.post('/account/assign-company', { companyId });
    if (response.data.accessToken && response.data.refreshToken) {
      tokenManager.setTokens(response.data.accessToken, response.data.refreshToken);
      tokenManager.setUser({
        userId: response.data.userId,
        email: response.data.email,
        firstName: response.data.firstName,
        lastName: response.data.lastName,
        roles: response.data.roles || [],
        companyId: response.data.companyId ?? null,
        companyRole: response.data.companyRole ?? null,
      });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('authChanged'));
      }
    }
    return response;
  },
  unassignCompany: async () => {
    const response = await identityAPI.post('/account/unassign-company');
    if (response.data.accessToken && response.data.refreshToken) {
      tokenManager.setTokens(response.data.accessToken, response.data.refreshToken);
      tokenManager.setUser({
        userId: response.data.userId,
        email: response.data.email,
        firstName: response.data.firstName,
        lastName: response.data.lastName,
        roles: response.data.roles || [],
        companyId: response.data.companyId ?? null,
        companyRole: response.data.companyRole ?? null,
      });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('authChanged'));
      }
    }
    return response;
  },
};

// ===== Company Service =====
export const companiesAPI = {
  getAll: (params) =>
    reservationAPI.get('/companies', {
      params,
    }),
  getById: (id) => reservationAPI.get(`/companies/${id}`),
  create: (data) => reservationAPI.post('/companies', data),
  update: (id, data) => reservationAPI.put(`/companies/${id}`, data),
  delete: (id) => reservationAPI.delete(`/companies/${id}`),
  getCities: (query) =>
    reservationAPI.get('/companies/cities', {
      params: query ? { query } : undefined,
    }),
};

export const companyAuditAPI = {
  getByCompany: (companyId, take = 200) =>
    reservationAPI.get(`/company-audit/company/${companyId}`, { params: { take } }),
};

// ===== Services API =====
export const servicesAPI = {
  getAll: (params) =>
    reservationAPI.get('/services', {
      params,
    }),
  getById: (id) => reservationAPI.get(`/services/${id}`),
  getByCompany: (companyId) => reservationAPI.get(`/services/company/${companyId}`),
  create: (data) => reservationAPI.post('/services', data),
  update: (id, data) => reservationAPI.put(`/services/${id}`, data),
  delete: (id) => reservationAPI.delete(`/services/${id}`),
};

export const branchesAPI = {
  getAll: () => reservationAPI.get('/branches'),
  getById: (id) => reservationAPI.get(`/branches/${id}`),
  getByCompany: (companyId) => reservationAPI.get(`/branches/company/${companyId}`),
  create: (data) => reservationAPI.post('/branches', data),
  update: (id, data) => reservationAPI.put(`/branches/${id}`, data),
  delete: (id) => reservationAPI.delete(`/branches/${id}`),
};

export const branchReviewsAPI = {
  getBranchSummary: (branchId) =>
    reservationAPI.get(`/branchreviews/branch/${branchId}/summary`),
  getBranchReviews: (branchId) =>
    reservationAPI.get(`/branchreviews/branch/${branchId}`),
  getCompanySummary: (companyId) =>
    reservationAPI.get(`/branchreviews/company/${companyId}/summary`),
};

export const auditAPI = {
  getMy: (take = 100) => identityAPI.get('/audit/my', { params: { take } }),
};

// ===== Notification Service =====
export const notificationsAPI = {
  getMyNotifications: (unreadOnly = false, { skip = 0, take = 50 } = {}) =>
    notificationAPI.get('/me', { params: { unreadOnly, skip, take } }),
  getUserNotifications: (userId, unreadOnly = false) =>
    notificationAPI.get(`/user/${userId}`, { params: { unreadOnly } }),
  markAsRead: (id) => notificationAPI.put(`/${id}/read`),
};

export const notificationTemplatesAPI = {
  getAll: (includeInactive = true) =>
    notificationTemplatesAPIInstance.get('', { params: { includeInactive } }),
  getById: (id) => notificationTemplatesAPIInstance.get(`/${id}`),
  create: (data) => notificationTemplatesAPIInstance.post('', data),
  update: (id, data) => notificationTemplatesAPIInstance.put(`/${id}`, data),
  delete: (id) => notificationTemplatesAPIInstance.delete(`/${id}`),
};

export const geocodeAPI = {
  geocode: (query) =>
    reservationAPI.get('/geocode', {
      params: { query },
    }),
};

// ===== Company Users API (Identity) =====
export const companyUsersAPI = {
  getUsers: () => identityAPI.get('/company/users'),
  addUser: (data) => identityAPI.post('/company/users/add', data),
  removeUser: (userId) => identityAPI.delete(`/company/users/${userId}`),
  updateUserRole: (userId, role) => identityAPI.put(`/company/users/${userId}/role`, { role }),
  transferOwnership: (newOwnerUserId) => identityAPI.post('/company/users/transfer-ownership', { newOwnerUserId }),
};

// ===== Appointments API ===== 
export const appointmentsAPI = {
  getAll: () => reservationAPI.get('/appointments'),
  getMy: (take = 200) => reservationAPI.get('/appointments/my', { params: { take } }),
  getByCompany: (companyId, take = 200) =>
    reservationAPI.get(`/appointments/company/${companyId}`, { params: { take } }),
  getById: (id) => reservationAPI.get(`/appointments/${id}`),
  getEvents: (id, take = 200) =>
    reservationAPI.get(`/appointments/${id}/events`, { params: { take } }),
  getAvailableSlots: (serviceId, date) => 
    reservationAPI.get(`/appointments/available-slots`, { 
      params: { serviceId, date } 
    }),
  getPublicAvailableSlots: (serviceId, date) =>
    reservationAPI.get(`/appointments/public/available-slots`, {
      params: { serviceId, date },
    }),
  create: (data) => reservationAPI.post('/appointments', data),
  createPublic: (data) => reservationAPI.post('/appointments/public', data),
  confirm: (id) => reservationAPI.put(`/appointments/${id}/confirm`),
  cancel: (id) => reservationAPI.put(`/appointments/${id}/cancel`),
  cancelMy: (id) => reservationAPI.put(`/appointments/${id}/cancel-my`),
  delete: (id) => reservationAPI.delete(`/appointments/${id}`),
};

// ===== Schedules API =====
export const schedulesAPI = {
  getByCompany: (companyId, params) =>
    reservationAPI.get(`/schedules/company/${companyId}`, { params }),
  create: (data) => reservationAPI.post('/schedules', data),
  update: (id, data) => reservationAPI.put(`/schedules/${id}`, data),
  delete: (id) => reservationAPI.delete(`/schedules/${id}`),
};

export const staffBreaksAPI = {
  getByCompany: (companyId, params) =>
    reservationAPI.get(`/staffbreaks/company/${companyId}`, { params }),
  create: (data) => reservationAPI.post('/staffbreaks', data),
  update: (id, data) => reservationAPI.put(`/staffbreaks/${id}`, data),
  delete: (id) => reservationAPI.delete(`/staffbreaks/${id}`),
};

// ===== Admin API (Identity) =====
export const adminAPI = {
  getUsers: (params) =>
    identityAPI.get('/admin/users', {
      params,
    }),
  grantAdmin: (userId) => identityAPI.post(`/admin/users/${userId}/roles/admin`),
  revokeAdmin: (userId) => identityAPI.delete(`/admin/users/${userId}/roles/admin`),
  deleteUser: (userId) => identityAPI.delete(`/admin/users/${userId}`),
};

export default reservationAPI;
