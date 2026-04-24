import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  withCredentials: true, // Send httpOnly cookies with every request
  headers: {
    'Content-Type': 'application/json',
  },
});

const apiBaseURL = String(import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');

// Request interceptor: attach Bearer token + org header
api.interceptors.request.use((config) => {
  try {
    const stored = localStorage.getItem('argus-auth');
    if (stored) {
      const { state } = JSON.parse(stored);
      if (state?.accessToken) {
        config.headers['Authorization'] = `Bearer ${state.accessToken}`;
      }
      // Resolve org id — handle nested object, plain UUID string, or selectedOrgId
      let orgId: string | null = state?.selectedOrgId || null;
      if (!orgId) {
        const org = state?.user?.organization;
        if (org && typeof org === 'object') orgId = org.id || null;
        else if (org && typeof org === 'string') orgId = org; // legacy plain UUID
      }
      if (orgId) {
        config.headers['X-Organization-Id'] = orgId;
      }
    }
  } catch {}
  return config;
});

// Response interceptor: handle 401 refresh
let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: unknown) => void; reject: (r: unknown) => void }> = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach(({ resolve, reject }) => error ? reject(error) : resolve(token));
  failedQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // MFA enforcement: redirect to MFA setup if org requires it
    if (error.response?.status === 403 && error.response?.data?.code === 'MFA_REQUIRED') {
      if (window.location.pathname !== '/settings/mfa') {
        window.location.href = '/settings/mfa?required=true';
      }
      return Promise.reject(error);
    }

    const originalRequest = error.config;
    if (error.response?.status !== 401 || originalRequest._retry) return Promise.reject(error);

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then(() => api(originalRequest));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const stored = localStorage.getItem('argus-auth');
      const refreshToken = stored ? JSON.parse(stored)?.state?.refreshToken : null;
      const refreshRes = await axios.post(`${apiBaseURL}/auth/refresh`,
        refreshToken ? { refresh: refreshToken } : {},
        {
          withCredentials: true,
          headers: { 'Content-Type': 'application/json' },
        }
      );

      // Save new tokens from refresh response
      const refreshPayload = refreshRes.data?.data || refreshRes.data || {};
      const newAccess = refreshPayload.access;
      const newRefresh = refreshPayload.refresh;
      if (newAccess && stored) {
        const parsed = JSON.parse(stored);
        parsed.state.accessToken = newAccess;
        if (newRefresh) parsed.state.refreshToken = newRefresh;
        localStorage.setItem('argus-auth', JSON.stringify(parsed));
      } else {
        // If refresh failed, clear auth and redirect to login
        localStorage.removeItem('argus-auth');
        window.location.href = '/login';
        return Promise.reject(new Error('Token refresh failed'));
      }

      processQueue(null);
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError);
      localStorage.removeItem('argus-auth');
      window.location.href = '/login';
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
