import axios from "axios";

// Base API instance
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  headers: { "Content-Type": "application/json" },
  timeout: 5000,
});

// Helper function to attach JWT token in headers
export const authHeader = (token) => ({
  headers: {
    Authorization: `Bearer ${token}`,
  },
});
