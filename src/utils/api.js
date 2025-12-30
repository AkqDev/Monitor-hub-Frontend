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

// Helper function to attach JWT token in headers
export const authHeader = (token) => {
  if (!token) {
    console.warn("No token provided to authHeader");
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
    console.error("API Error:", {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      message: error.message,
    });
    return Promise.reject(error);
  }
);