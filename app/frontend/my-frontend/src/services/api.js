// src/services/api.js
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

// ===============================================
// 1. STAŁE URL I KONFIGURACJA API
// ===============================================
const API_GATEWAY_URL = 'http://localhost:5000';
const API_BASE_URL = `${API_GATEWAY_URL}/reservation`; 
const IDENTITY_BASE_URL = `${API_GATEWAY_URL}/identity`; 

// ===============================================
// 2. FUNKCJE POMOCNICZE
// ===============================================

export const decodeToken = (token) => {
    if (!token) return null;
    
    try {
        const decoded = jwtDecode(token);
        
        return {
            userId: decoded.sub || decoded.nameid,
            email: decoded.email,
            firstName: decoded.FirstName,
            lastName: decoded.LastName, 
            companyId: decoded.companyId || null
        };
    } catch (e) {
        console.error("[API] Błąd dekodowania tokena JWT:", e);
        return null;
    }
};

// ===============================================
// 3. TOKEN MANAGER
// ===============================================

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
    
    // Zapisuje obiekt jako ciąg JSON
    setUser: (user) => {
        try {
            localStorage.setItem('user', JSON.stringify(user));
        } catch (e) {
            console.error("[API] Błąd zapisu użytkownika do Local Storage", e);
        }
    },
    
    // Odczytuje obiekt z ciągu JSON
    getUser: () => {
        const user = localStorage.getItem('user');
        if (user) {
            try {
                return JSON.parse(user);
            } catch (e) {
                console.error("[API] Błąd odczytu użytkownika z Local Storage", e);
                localStorage.removeItem('user');
                return null;
            }
        }
        
        // Fallback: dekodujemy z tokena
        const token = tokenManager.getAccessToken();
        if (token) {
            const decodedUser = decodeToken(token);
            if (decodedUser) {
                tokenManager.setUser(decodedUser);
                return decodedUser;
            }
        }
        return null;
    },
    
    // Ulepszone sprawdzanie, czy token jest nie tylko obecny, ale i ważny (opcjonalnie)
    isAuthenticated: () => {
        const token = tokenManager.getAccessToken();
        if (!token) return false;

        try {
            const decoded = jwtDecode(token);
            // Sprawdzenie, czy token nie wygasł (token.exp to czas w sekundach)
            return decoded.exp * 1000 > Date.now();
        } catch (e) {
            return false;
        }
    }
};

// ===============================================
// 4. INSTANCJE AXIOS I INTERCEPTORY
// ===============================================

const reservationAPI = axios.create({
    baseURL: API_BASE_URL,
    headers: { 'Content-Type': 'application/json' },
});

const identityAPI = axios.create({
    baseURL: IDENTITY_BASE_URL,
    headers: { 'Content-Type': 'application/json' },
});

// ----------------------------------------------------------------------
// 🚨 KLUCZOWA POPRAWKA: REQUEST INTERCEPTOR (dołącza token do każdego żądania) 🚨
// ----------------------------------------------------------------------
const applyRequestInterceptor = (apiInstance) => {
    apiInstance.interceptors.request.use(
        (config) => {
            // Wyłączamy dodawanie tokena dla endpointów publicznych (np. /login, /register)
            if (
                config.url.endsWith('/account/login') ||
                config.url.endsWith('/account/register') ||
                config.url.endsWith('/refreshtoken/refresh') 
            ) {
                return config;
            }

            const accessToken = tokenManager.getAccessToken();
            if (accessToken) {
                config.headers.Authorization = `Bearer ${accessToken}`;
            }
            return config;
        },
        (error) => {
            return Promise.reject(error);
        }
    );
};

applyRequestInterceptor(reservationAPI);
applyRequestInterceptor(identityAPI);
// ----------------------------------------------------------------------

// Implementacja handleTokenRefresh (pełna wersja z interfejsu API.js)
const handleTokenRefresh = async (error, apiInstance) => {
    const originalRequest = error.config;

    // Sprawdzamy, czy to błąd 401 i czy nie próbowaliśmy już raz ponowić żądania
    if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        console.warn('[RES] Otrzymano 401. Próbuję odświeżyć token...');

        try {
            const refreshToken = tokenManager.getRefreshToken();
            if (refreshToken) {
                // Wywołujemy endpoint odświeżania tokena
                const response = await axios.post(`${IDENTITY_BASE_URL}/refreshtoken/refresh`, { refreshToken });
                const { accessToken, refreshToken: newRefreshToken } = response.data;
                
                console.log('[DEBUG] Nowy Access Token (początek):', accessToken.substring(0, 30) + '...'); 
                
                // 1. Zapisz nowe tokeny w Local Storage
                tokenManager.setTokens(accessToken, newRefreshToken);
                
                // 2. Opcjonalnie: Wymuś aktualizację obiektu użytkownika w Local Storage
                const userDetails = decodeToken(accessToken);
                if (userDetails) {
                    tokenManager.setUser(userDetails);
                }

                // 3. Użyj nowego tokena do ponowienia oryginalnego żądania
                originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                console.log('[RES] Token odświeżony Pomyślnie. Ponawiam oryginalne żądanie.');
                
                return apiInstance(originalRequest);
            }
        } catch (refreshError) {
            console.error('[RES] BŁĄD ODŚWIEŻANIA TOKENA. Wylogowuję.', refreshError);
            tokenManager.clearTokens();
            // Przekierowanie do logowania w przypadku niepowodzenia odświeżenia
            window.location.href = '/login'; 
            return Promise.reject(refreshError);
        }
    }

    // Jeśli to nie jest błąd 401 lub już ponowiliśmy żądanie, zwróć błąd
    return Promise.reject(error);
};

// Podpinanie interceptorów odpowiedzi
reservationAPI.interceptors.response.use((response) => response, (error) => handleTokenRefresh(error, reservationAPI));
identityAPI.interceptors.response.use((response) => response, (error) => handleTokenRefresh(error, identityAPI));


// ===============================================
// 5. SERWISY API (Eksporty)
// ===============================================

export const authAPI = {
    register: (data) => identityAPI.post('/account/register', data),
    login: async (data) => {
        console.log('[AUTH] Próba logowania...');
        const response = await identityAPI.post('/account/login', data);
        if (response.data.accessToken && response.data.refreshToken) {
            tokenManager.setTokens(response.data.accessToken, response.data.refreshToken);
            const userDetails = decodeToken(response.data.accessToken); 
            if (userDetails) {
                tokenManager.setUser(userDetails); 
            }
        }
        console.log('[AUTH] Logowanie zakończone pomyślnie.');
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
    getById: (userId) => identityAPI.get(`/account/${userId}`),
    
    // 🚨 NOWA FUNKCJA: Do aktualizacji companyId w bazie danych serwera
    updateCompanyId: (userId, companyId) => {
        console.log(`[AUTH] Wysyłam żądanie aktualizacji companyId: ${companyId} dla User: ${userId}`);
        // Wymaga endpointu PUT/PATCH w Identity Service: /identity/account/{userId}/company
        return identityAPI.put(`/account/${userId}/company`, { companyId });
    }
};

export const companiesAPI = {
    getAll: () => reservationAPI.get('/companies'),
    getById: (id) => reservationAPI.get(`/companies/${id}`),
    create: (data) => reservationAPI.post('/companies', data),
    update: (id, data) => reservationAPI.put(`/companies/${id}`, data),
    delete: (id) => reservationAPI.delete(`/companies/${id}`),
};

export const servicesAPI = {
    getAll: () => reservationAPI.get('/services'),
    getById: (id) => reservationAPI.get(`/services/${id}`),
    getByCompany: (companyId) => reservationAPI.get(`/services/company/${companyId}`),
    create: (data) => reservationAPI.post('/services', data), // teraz trafia do /api/services
    update: (id, data) => reservationAPI.put(`/services/${id}`, data),
    delete: (id) => reservationAPI.delete(`/services/${id}`),
};

export const appointmentsAPI = {
    getAll: () => reservationAPI.get('/appointments'),
    getById: (id) => reservationAPI.get(`/appointments/${id}`),
    getAvailableSlots: (serviceId, date) => 
        reservationAPI.get('/appointments/available-slots', { params: { serviceId, date } }),
    create: (data) => reservationAPI.post('/appointments', data),
    confirm: (id) => reservationAPI.put(`/appointments/${id}/confirm`),
    cancel: (id) => reservationAPI.put(`/appointments/${id}/cancel`),
    delete: (id) => reservationAPI.delete(`/appointments/${id}`),
};

export default reservationAPI;