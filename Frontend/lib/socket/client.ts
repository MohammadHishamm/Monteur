type MessageListener = (payload: any) => void;

let socket: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempts = 0;
const maxReconnectAttempts = 8;
const listeners = new Set<MessageListener>();

function toWsUrl(apiBase: string): string {
  const normalized = apiBase.replace(/\/$/, "");
  if (normalized.startsWith("https://")) {
    return `${normalized.replace("https://", "wss://")}/v1/ws/notifications`;
  }
  if (normalized.startsWith("http://")) {
    return `${normalized.replace("http://", "ws://")}/v1/ws/notifications`;
  }
  return `ws://${normalized}/v1/ws/notifications`;
}

function notifyListeners(payload: any) {
  for (const listener of listeners) {
    listener(payload);
  }
}

function connectSocketInternal() {
  if (typeof window === "undefined") return;
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return;
  }

  const apiBase =
    process.env.NEXT_PUBLIC_INTERNAL_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:8000";

  socket = new WebSocket(toWsUrl(apiBase));

  socket.onopen = () => {
    reconnectAttempts = 0;
  };

  socket.onmessage = (event) => {
    try {
      notifyListeners(JSON.parse(event.data));
    } catch {
      // Ignore malformed websocket messages.
    }
  };

  socket.onclose = () => {
    socket = null;
    if (reconnectAttempts >= maxReconnectAttempts) return;
    reconnectAttempts += 1;
    reconnectTimer = setTimeout(connectSocketInternal, Math.min(1000 * reconnectAttempts, 5000));
  };
}

export function getSocket(): WebSocket | null {
  connectSocketInternal();
  return socket;
}

export function authenticateSocket(_userId: string) {
  // Backend authenticates websocket via existing session cookie.
  connectSocketInternal();
}

export function addSocketMessageListener(listener: MessageListener): () => void {
  listeners.add(listener);
  connectSocketInternal();
  return () => {
    listeners.delete(listener);
  };
}

export function disconnectSocket() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (socket) {
    socket.close();
    socket = null;
  }
}
