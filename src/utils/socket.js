// src/utils/socket.js
import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

// Create socket instance WITHOUT auto auth - we'll set auth in ChatPanel
export const socket = io(SOCKET_URL, {
  autoConnect: false, // Don't auto-connect
  transports: ['polling', 'websocket'], // Match backend
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
  withCredentials: true,
  forceNew: true // Important: create new connection each time
});

// Helper function to connect with token
export const connectSocket = (token) => {
  if (!token) {
    console.error("❌ No token provided for socket connection");
    return false;
  }

  // Disconnect if already connected
  if (socket.connected) {
    socket.disconnect();
  }

  // Set auth with token
  socket.auth = { token };
  
  // Connect
  socket.connect();
  
  console.log("🔌 Socket connecting with token:", token.substring(0, 20) + "...");
  return true;
};

// Helper function to disconnect
export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
    console.log("🔌 Socket disconnected");
  }
};

export default socket;