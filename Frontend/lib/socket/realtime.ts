import { appConfig } from "~/config/app"

export type RealtimePayload = {
  type?: string
  notification?: unknown
  error?: string
}

export type RealtimeOptions = {
  reconnect?: boolean
  minReconnectDelayMs?: number
  maxReconnectDelayMs?: number
  maxReconnectAttempts?: number
}

function readCookie(name: string): string {
  if (typeof document === "undefined") return ""
  const match = document.cookie.match(new RegExp(`(?:^|; )${encodeURIComponent(name)}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : ""
}

function getRealtimeBaseURL(): string {
  const fromEnv = process.env.NEXT_PUBLIC_WS_URL?.trim()
  if (fromEnv) return fromEnv

  const httpBase = appConfig.apiDomain
  if (httpBase.startsWith("https://")) {
    return `wss://${httpBase.slice("https://".length)}`
  }
  if (httpBase.startsWith("http://")) {
    return `ws://${httpBase.slice("http://".length)}`
  }
  return "ws://localhost:8000"
}

export function subscribeRealtimeNotifications(
  userID: string,
  onMessage: (payload: RealtimePayload) => void,
  onError?: (error: Event) => void,
  options?: RealtimeOptions,
): () => void {
  if (typeof window === "undefined" || !userID) {
    return () => {}
  }

  const reconnectEnabled = options?.reconnect ?? true
  const minReconnectDelayMs = options?.minReconnectDelayMs ?? 1000
  const maxReconnectDelayMs = options?.maxReconnectDelayMs ?? 20000
  const maxReconnectAttempts = options?.maxReconnectAttempts ?? Infinity

  const token = readCookie("auth-token")
  const params = new URLSearchParams({ user_id: userID })
  if (token) {
    // Browser websocket cannot set custom Authorization headers; token query is fallback.
    params.set("token", token)
  }

  const wsURL = `${getRealtimeBaseURL()}/v1/ws/notifications?${params.toString()}`
  let socket: WebSocket | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let reconnectAttempts = 0
  let stopped = false

  const connect = () => {
    if (stopped) return

    socket = new WebSocket(wsURL)

    socket.onopen = () => {
      reconnectAttempts = 0
    }

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as RealtimePayload
        onMessage(payload)
      } catch {
        // Ignore malformed payloads.
      }
    }

    socket.onerror = (event) => {
      if (onError) onError(event)
    }

    socket.onclose = () => {
      if (stopped || !reconnectEnabled) return
      if (reconnectAttempts >= maxReconnectAttempts) return

      const expDelay = minReconnectDelayMs * (2 ** reconnectAttempts)
      const backoff = Math.min(expDelay, maxReconnectDelayMs)
      const jitter = Math.floor(Math.random() * 250)
      reconnectAttempts += 1

      reconnectTimer = setTimeout(connect, backoff + jitter)
    }
  }

  connect()

  return () => {
    stopped = true
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }

    if (
      socket &&
      (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)
    ) {
      socket.close()
    }
  }
}
