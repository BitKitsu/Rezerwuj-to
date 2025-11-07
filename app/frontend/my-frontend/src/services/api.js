import axios from 'axios';

// Konfiguracja API
const API_BASE_URL = 'http://localhost:5002/api';
const IDENTITY_BASE_URL = 'http://localhost:5001';

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

// Interceptor do dodawania tokena
reservationAPI.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ===== Identity Service =====
export const authAPI = {
  register: (data) => identityAPI.post('/register', data),
  login: (data) => identityAPI.post('/login', data),
  logout: () => identityAPI.post('/logout'),
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
