import axios from 'axios';

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  'http://localhost:4000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor to inject Authorization Bearer token from localStorage
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('kelana_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Turns any thrown value (axios error, Error, string, unknown) into a
 * user-facing Indonesian message. Prefers the backend's `message` field,
 * distinguishes network failures from server errors, and never returns an
 * empty string.
 */
export function getApiErrorMessage(error: unknown, fallback = 'Terjadi kesalahan. Silakan coba lagi.'): string {
  const err = error as { response?: { status?: number; data?: { message?: unknown } }; request?: unknown; message?: unknown };

  if (err?.response) {
    const serverMessage = err.response.data?.message;
    if (Array.isArray(serverMessage) && serverMessage.length > 0) {
      return serverMessage.filter((m) => typeof m === 'string').join(', ');
    }
    if (typeof serverMessage === 'string' && serverMessage.trim()) {
      return serverMessage;
    }
    if (err.response.status === 503) {
      return 'Layanan sedang tidak tersedia. Silakan coba lagi beberapa saat lagi.';
    }
    if (err.response.status && err.response.status >= 500) {
      return 'Server sedang bermasalah. Silakan coba lagi nanti.';
    }
    return fallback;
  }

  if (err?.request) {
    return 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.';
  }

  if (typeof error === 'string' && error.trim()) return error;
  if (typeof err?.message === 'string' && err.message.trim()) return err.message;
  return fallback;
}

// Response Interceptor for automatic Token Refreshing on 401 Unauthorized
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const res = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true },
        );
        const newAccessToken = res.data.data.accessToken;
        localStorage.setItem('kelana_access_token', newAccessToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch (refreshErr) {
        localStorage.removeItem('kelana_access_token');
        return Promise.reject(refreshErr);
      }
    }
    return Promise.reject(error);
  },
);
