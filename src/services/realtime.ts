import { io, Socket } from "socket.io-client";

import { API_BASE_URL } from "../config/api";

let socketInstance: Socket | null = null;

function applyAuth(token: string) {
  if (!socketInstance) {
    return;
  }

  socketInstance.auth = { token };

  if (socketInstance.io?.opts) {
    socketInstance.io.opts.extraHeaders = {
      Authorization: `Bearer ${token}`,
    };
  }
}

export function getRealtimeSocket(token: string): Socket {
  if (!token) {
    throw new Error("Auth token is required for realtime connection");
  }

  if (!socketInstance) {
    socketInstance = io(API_BASE_URL, {
      autoConnect: false,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      timeout: 20000,
      auth: { token },
      extraHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  applyAuth(token);

  if (!socketInstance.connected) {
    socketInstance.connect();
  }

  return socketInstance;
}

export function disconnectRealtimeSocket() {
  if (!socketInstance) {
    return;
  }

  socketInstance.removeAllListeners();
  socketInstance.disconnect();
  socketInstance = null;
}
