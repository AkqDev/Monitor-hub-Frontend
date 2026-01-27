// src/utils/socket.js - Keep your existing structure but add these functions:

import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  transports: ['polling', 'websocket'],
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
  withCredentials: true,
  forceNew: true
});

export const connectSocket = (token) => {
  if (!token) {
    console.error("❌ No token provided for socket connection");
    return false;
  }

  if (socket.connected) {
    socket.disconnect();
  }

  socket.auth = { token };
  socket.connect();
  
  console.log("🔌 Socket connecting with token");
  return true;
};

export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
    console.log("🔌 Socket disconnected");
  }
};

// Add notification room join function
export const joinNotificationRoom = (userId) => {
  if (socket.connected && userId) {
    socket.emit('joinMeetingRoom', { 
      meetingId: 'notifications', 
      userId 
    });
    console.log(`📢 User ${userId} joined notification room`);
  }
};

// Meeting notification listeners
export const setupNotificationListeners = (callbacks) => {
  // Remove existing listeners
  socket.off("newMeetingScheduled");
  socket.off("meetingStartingSoon");
  socket.off("meetingCancelled");
  socket.off("meetingEnded");

  // Setup new listeners
  if (callbacks.onNewMeeting) {
    socket.on("newMeetingScheduled", callbacks.onNewMeeting);
  }
  
  if (callbacks.onMeetingStartingSoon) {
    socket.on("meetingStartingSoon", callbacks.onMeetingStartingSoon);
  }
  
  if (callbacks.onMeetingCancelled) {
    socket.on("meetingCancelled", callbacks.onMeetingCancelled);
  }
  
  if (callbacks.onMeetingEnded) {
    socket.on("meetingEnded", callbacks.onMeetingEnded);
  }
};

// Generic connection status
socket.on("connect", () => {
  console.log("✅ Socket connected:", socket.id);
  
  // Auto-join notification room if user ID exists
  const userId = localStorage.getItem('userId');
  if (userId) {
    socket.emit('joinMeetingRoom', { 
      meetingId: 'notifications', 
      userId 
    });
  }
});

socket.on("disconnect", (reason) => {
  console.log("❌ Socket disconnected:", reason);
});

socket.on("connect_error", (error) => {
  console.error("🔴 Socket connection error:", error.message);
});

export default socket;