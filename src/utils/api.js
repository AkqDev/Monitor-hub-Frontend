// src/utils/api.js
import axios from "axios";

// Base API instance - use environment variable or default
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  headers: { 
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

// Flag to track if we're in initial app load (to suppress expected 401s)
let isInitialLoad = true;
export const setInitialLoadComplete = () => { isInitialLoad = false; };

// Helper function to attach JWT token in headers
export const authHeader = (token) => {
  if (!token) {
    // Don't warn for expected cases where token might not exist yet
    return {};
  }
  
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

// Optional: Add response interceptor for debugging
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Don't log expected 401 errors for token verification during initial load
    const isTokenVerification = error.config?.url?.includes('/api/auth/me');
    const is401 = error.response?.status === 401;
    
    if (isTokenVerification && is401 && isInitialLoad) {
      // This is expected when token is invalid/expired during app startup
      return Promise.reject(error);
    }
    
    // Log other API errors for debugging (but not during initial load for auth endpoints)
    if (!(isInitialLoad && is401)) {
      console.error("API Error:", {
        url: error.config?.url,
        method: error.config?.method,
        status: error.response?.status,
        message: error.message,
      });
    }
    
    return Promise.reject(error);
  }
);