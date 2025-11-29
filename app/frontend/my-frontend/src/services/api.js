import axios from 'axios';

// Konfiguracja API - używamy API Gateway
const API_GATEWAY_URL = 'http://localhost:5000';
const API_BASE_URL = `${API_GATEWAY_URL}/reservation`;
const IDENTITY_BASE_URL = `${API_GATEWAY_URL}/identity`;

// Token Manager
export const tokenManager = {
  getAccessToken: () => localStorage.getItem('accessToken'),
  getRefreshToken: () => localStorage.getItem('refreshToken'),
  setTokens: (accessToken, refreshToken) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  },
  clearTokens: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  },
  setUser: (user) => localStorage.setItem('user', JSON.stringify(user)),
  getUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },
  isAuthenticated: () => !!localStorage.getItem('accessToken')
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

// Response interceptor - obsługa wygasłego tokenu
const handleTokenRefresh = async (error, apiInstance) => {
  const originalRequest = error.config;

  if (error.response?.status === 401 && !originalRequest._retry) {
    originalRequest._retry = true;

    try {
      const refreshToken = tokenManager.getRefreshToken();
      if (refreshToken) {
        const response = await axios.post(`${IDENTITY_BASE_URL}/refreshtoken/refresh`, {
          refreshToken
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data;
        tokenManager.setTokens(accessToken, newRefreshToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiInstance(originalRequest);
      }
    } catch (refreshError) {
      tokenManager.clearTokens();
      window.location.href = '/login';
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

// ===== Identity Service =====
export const authAPI = {
  register: (data) => identityAPI.post('/account/register', data),
  login: async (data) => {
    const response = await identityAPI.post('/account/login', data);
    if (response.data.accessToken && response.data.refreshToken) {
      tokenManager.setTokens(response.data.accessToken, response.data.refreshToken);
      tokenManager.setUser({
        userId: response.data.userId,
        email: response.data.email,
        firstName: response.data.firstName,
        lastName: response.data.lastName,
        companyId: response.data.companyId || null
      });
    }
    return response;
  },
  logout: async () => {
    try {
      await identityAPI.post('/account/logout');
    } finally {
      tokenManager.clearTokens();
      window.location.href = '/login';
    }
  },
  refreshToken: (refreshToken) => identityAPI.post('/refreshtoken/refresh', { refreshToken }),

  getById: (userId) => identityAPI.get(`/account/${userId}`)
};

// ===== Company Service =====
export const companiesAPI = {
  getAll: () => reservationAPI.get('/companies'),
  getById: (id) => reservationAPI.get(`/companies/${id}`),
  create: (data) => reservationAPI.post('/companies', data),
  update: (id, data) => reservationAPI.put(`/companies/${id}`, data),
  delete: (id) => reservationAPI.delete(`/companies/${id}`),
};

// ===== Services API =====
export const servicesAPI = {
  getAll: () => reservationAPI.get('/services'),
  getById: (id) => reservationAPI.get(`/services/${id}`),
  getByCompany: (companyId) => reservationAPI.get(`/services/company/${companyId}`),
  create: (data) => reservationAPI.post('/services', data),
  update: (id, data) => reservationAPI.put(`/services/${id}`, data),
  delete: (id) => reservationAPI.delete(`/services/${id}`),
};

// ===== Appointments API =====
export const appointmentsAPI = {
  getAll: () => reservationAPI.get('/appointments'),
  getById: (id) => reservationAPI.get(`/appointments/${id}`),
  getAvailableSlots: (serviceId, date) => 
    reservationAPI.get(`/appointments/available-slots`, { 
      params: { serviceId, date } 
    }),
  create: (data) => reservationAPI.post('/appointments', data),
  confirm: (id) => reservationAPI.put(`/appointments/${id}/confirm`),
  cancel: (id) => reservationAPI.put(`/appointments/${id}/cancel`),
  delete: (id) => reservationAPI.delete(`/appointments/${id}`),
};

export default reservationAPI;
