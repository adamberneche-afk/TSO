import type { OpenAPIV3 } from 'openapi-types';
import { authApi } from '@/services/authApi';

// Base URL from env or default
const BASE_URL = import.meta.env.VITE_REGISTRY_URL || 'https://tso.onrender.com';

interface RequestInitOverride extends RequestInit {
  headers?: Record<string, string>;
}

async function request<T = any>(
  endpoint: string,
  { method = 'GET', data, params, useAuth = true }: {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    data?: any;
    params?: Record<string, any>;
    useAuth?: boolean;
  } = {}
): Promise<T> {
  // Build URL with query params
  let url = `${BASE_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    if (searchParams.toString()) {
      url += `?${searchParams.toString()}`;
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

   if (useAuth) {
     const token = authApi.getToken();
     if (token) {
       headers['Authorization'] = `Bearer ${token}`;
     }
   }

  const options: RequestInitOverride = {
    method,
    headers,
  };

  if (data && !(data instanceof FormData)) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    let errorMsg = `Request failed: ${response.status}`;
    try {
      const errorData = await response.json();
      errorMsg = errorData.message || errorData.error || errorMsg;
    } catch (e) {
      // ignore
    }
    throw new Error(errorMsg);
  }

  // Return empty body for 204
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const api = {
  get: <T = any>(endpoint: string, config?: { params?: Record<string, any>; useAuth?: boolean }) =>
    request<T>(endpoint, { method: 'GET', ...config }),

  post: <T = any>(endpoint: string, data?: any, config?: { params?: Record<string, any>; useAuth?: boolean }) =>
    request<T>(endpoint, { method: 'POST', data, ...config }),

  put: <T = any>(endpoint: string, data?: any, config?: { params?: Record<string, any>; useAuth?: boolean }) =>
    request<T>(endpoint, { method: 'PUT', data, ...config }),

  patch: <T = any>(endpoint: string, data?: any, config?: { params?: Record<string, any>; useAuth?: boolean }) =>
    request<T>(endpoint, { method: 'PATCH', data, ...config }),

  delete: <T = any>(endpoint: string, config?: { params?: Record<string, any>; useAuth?: boolean }) =>
    request<T>(endpoint, { method: 'DELETE', ...config }),
};

export default api;