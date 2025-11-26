import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";
export const socket = io(SOCKET_URL, { transports: ["websocket"], autoConnect: true });

export const registerSocket = (userId) => {
  if (!userId) return;
  if (!socket.connected) socket.connect();
  socket.emit("register", { userId });
};
