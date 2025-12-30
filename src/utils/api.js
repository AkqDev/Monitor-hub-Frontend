import axios from "axios";

// Base API instance
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  headers: { "Content-Type": "application/json" },
  timeout: 10000, // Increased timeout
});

// Helper function to attach JWT token in headers
export const authHeader = (token) => {
  if (!token) {
    console.error("No token provided to authHeader");
    return {};
  }
  
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

// utils/api.js
import axios from "axios";

export const api = axios.create({
  baseURL: "http://localhost:5000/api", // Make sure this matches your backend port
});

export const authHeader = (token) => ({
  headers: { Authorization: `Bearer ${token}` },
});