"use client";

import { MessageCircle, Send, Wifi, WifiOff, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ChatEvent = {
  type: "chat" | "presence" | "presence_snapshot" | "notification" | "error";
  from?: string;
  to?: string;
  body?: string;
  userId?: string;
  online?: boolean;
  onlineUsers?: string[];
  sentAt?: string;
  error?: string;
};

type LocalMessage = {
  id: string;
  from: "me" | "support" | "user" | "system";
  text: string;
  at: string;
  userID?: string;
};

const SUPPORT_USER_ID = "support";
const CHAT_STORAGE_KEY = "support-chat-user-id";

function getCookie(name: string): string {
  if (typeof document === "undefined") {
    return "";
  }

  const cookies = document.cookie.split(";");
  const needle = `${name}=`;
  for (const cookie of cookies) {
    const trimmed = cookie.trim();
    if (trimmed.startsWith(needle)) {
      return decodeURIComponent(trimmed.slice(needle.length));
    }
  }

  return "";
}

function makeAnonymousUserID(): string {
  const random = Math.random().toString(36).slice(2, 8);
  return `guest-${random}`;
}

function resolveUserID(): string {
  if (typeof window === "undefined") {
    return "guest";
  }

  const explicitCookie =
    getCookie("chat-user-id") || getCookie("uid") || getCookie("user_id");
  if (explicitCookie) {
    return explicitCookie;
  }

  const role = getCookie("user-role");
  if (role === "admin") {
    return SUPPORT_USER_ID;
  }

  const existing = window.localStorage.getItem(CHAT_STORAGE_KEY);
  if (existing && existing.trim().length > 0) {
    return existing;
  }

  const generated = makeAnonymousUserID();
  window.localStorage.setItem(CHAT_STORAGE_KEY, generated);
  return generated;
}

function getHttpBaseURL(): string {
  const envURL = process.env.NEXT_PUBLIC_BACKEND_URL?.trim();
  if (envURL) {
    return envURL;
  }

  return "http://localhost:8000";
}

function getWebSocketBaseURL(): string {
  const fromEnv = process.env.NEXT_PUBLIC_WS_URL?.trim();
  if (fromEnv) {
    return fromEnv;
  }

  const httpBase = getHttpBaseURL();
  if (httpBase.startsWith("https://")) {
    return `wss://${httpBase.slice("https://".length)}`;
  }

  if (httpBase.startsWith("http://")) {
    return `ws://${httpBase.slice("http://".length)}`;
  }

  return "ws://localhost:8000";
}

function messageTimeLabel(isoTime: string): string {
  const date = new Date(isoTime);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleTimeString("ar-EG", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SupportChatWidget() {
  const pathname = usePathname();

  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isSupportOnline, setIsSupportOnline] = useState(false);
  const [connectionHint, setConnectionHint] = useState(
    "جاري الاتصال بالدعم...",
  );
  const [replyTargetID, setReplyTargetID] = useState("");

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<number | null>(null);
  const initializedRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const userID = useMemo(() => resolveUserID(), []);
  const isSupportAgent = userID === SUPPORT_USER_ID;

  const shouldHide =
    pathname.startsWith("/login") || pathname.startsWith("/register");

  useEffect(() => {
    if (shouldHide) {
      return;
    }

    let closedByCleanup = false;

    const connect = () => {
      const wsURL = `${getWebSocketBaseURL()}/v1/chat/ws?user_id=${encodeURIComponent(userID)}`;
      const socket = new WebSocket(wsURL);
      socketRef.current = socket;

      socket.onopen = () => {
        setIsConnected(true);
        setConnectionHint("متصل الآن");
      };

      socket.onclose = () => {
        setIsConnected(false);
        setConnectionHint("انقطع الاتصال، نحاول إعادة الاتصال...");
        socketRef.current = null;

        if (!closedByCleanup) {
          reconnectRef.current = window.setTimeout(connect, 2000);
        }
      };

      socket.onerror = () => {
        setConnectionHint(
          "تعذر الاتصال. تأكد أن الباك إند يعمل على المنفذ 8000",
        );
      };

      socket.onmessage = (event) => {
        let payload: ChatEvent;
        try {
          payload = JSON.parse(event.data) as ChatEvent;
        } catch {
          return;
        }

        if (
          payload.type === "presence_snapshot" ||
          payload.type === "presence"
        ) {
          const users = payload.onlineUsers ?? [];
          setOnlineUsers(users);
          setIsSupportOnline(users.includes(SUPPORT_USER_ID));
          return;
        }

        if (payload.type === "error") {
          const text = payload.error || "حدث خطأ في الدردشة";
          setMessages((prev) => [
            ...prev,
            {
              id: `err-${Date.now()}`,
              from: "system",
              text,
              at: new Date().toISOString(),
            },
          ]);
          return;
        }

        if (payload.type === "chat") {
          const text = payload.body?.trim();
          if (!text) {
            return;
          }

          const fromID = payload.from ?? "";
          const fromSupport = payload.from === SUPPORT_USER_ID;
          const isOwnEcho = payload.from === userID;

          if (isSupportAgent && fromID && !fromSupport && !isOwnEcho) {
            setReplyTargetID(fromID);
          }

          setMessages((prev) => [
            ...prev,
            {
              id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              from: isOwnEcho
                ? "me"
                : fromSupport
                  ? "support"
                  : isSupportAgent
                    ? "user"
                    : "support",
              text,
              at: payload.sentAt || new Date().toISOString(),
              userID: fromID || undefined,
            },
          ]);

          return;
        }

      };
    };

    connect();
    const fetchOnlineUsers = async () => {
      try {
        const response = await fetch(`${getHttpBaseURL()}/v1/chat/online`, {
          method: "GET",
        });
        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as { onlineUsers?: string[] };
        const users = data.onlineUsers ?? [];
        setOnlineUsers(users);
        setIsSupportOnline(users.includes(SUPPORT_USER_ID));
      } catch {
        // Keep polling; websocket presence will still update when available.
      }
    };

    if (!initializedRef.current) {
      setMessages([
        {
          id: "welcome-1",
          from: "support",
          text: "أهلاً بك في دعم مونتير. أرسل سؤالك وسنرد عليك في أقرب وقت.",
          at: new Date().toISOString(),
        },
      ]);
      initializedRef.current = true;
    }

    fetchOnlineUsers();
    const intervalID = window.setInterval(fetchOnlineUsers, 12000);

    return () => {
      closedByCleanup = true;
      if (reconnectRef.current !== null) {
        window.clearTimeout(reconnectRef.current);
      }
      window.clearInterval(intervalID);
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [isSupportAgent, shouldHide, userID]);

  useEffect(() => {
    if (!scrollRef.current) {
      return;
    }
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isOpen]);

  const sendMessage = () => {
    const content = inputText.trim();
    if (!content) {
      return;
    }

    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      setMessages((prev) => [
        ...prev,
        {
          id: `offline-${Date.now()}`,
          from: "system",
          text: "غير متصل حاليا. حاول مجددا بعد ثواني.",
          at: new Date().toISOString(),
        },
      ]);
      return;
    }

    const targetID = isSupportAgent ? replyTargetID : SUPPORT_USER_ID;
    if (!targetID) {
      setMessages((prev) => [
        ...prev,
        {
          id: `target-${Date.now()}`,
          from: "system",
          text: "انتظر رسالة عميل اولا حتى يتم تحديد المحادثة للرد.",
          at: new Date().toISOString(),
        },
      ]);
      return;
    }

    const outgoing = {
      type: "chat",
      to: targetID,
      body: content,
    };

    socket.send(JSON.stringify(outgoing));
    setInputText("");
  };

  if (shouldHide) {
    return null;
  }

  const onlineCount = onlineUsers.length;

  return (
    <div className="fixed bottom-5 left-5 z-50 flex flex-col items-end gap-3">
      {isOpen ? (
        <section className="w-[min(92vw,24rem)] overflow-hidden rounded-2xl border border-border bg-card shadow-lift">
          <header className="relative overflow-hidden border-b border-border bg-emerald-tint px-4 py-3">
            <div className="relative flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  دعم مونتير
                </p>
                <p className="text-xs text-muted-foreground">
                  {isSupportAgent
                    ? `وضع الدعم مفعل - المتصلون: ${onlineCount}${replyTargetID ? ` - يرد على: ${replyTargetID}` : ""}`
                    : isSupportOnline
                      ? "فريق الدعم متصل الآن"
                      : "فريق الدعم غير متصل حاليا"}
                </p>
              </div>

              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="اغلاق الدردشة"
                onClick={() => setIsOpen(false)}
              >
                <X className="size-4" />
              </Button>
            </div>
          </header>

          <div
            ref={scrollRef}
            className="max-h-[55vh] min-h-64 space-y-2 overflow-y-auto bg-background-subtle px-3 py-3"
          >
            {messages.map((message) => {
              const isMine = message.from === "me";
              const isSystem = message.from === "system";
              const isUserMessage = message.from === "user";
              return (
                <article
                  key={message.id}
                  className={cn(
                    "max-w-[88%] rounded-xl px-3 py-2 text-sm shadow-soft",
                    isSystem &&
                      "mx-auto max-w-full bg-secondary text-secondary-foreground",
                    isMine && "mr-auto bg-primary text-white",
                    isUserMessage && "ml-auto bg-emerald-tint text-foreground",
                    !isMine &&
                      !isSystem &&
                      !isUserMessage &&
                      "ml-auto bg-card text-foreground",
                  )}
                >
                  {isSupportAgent && isUserMessage && message.userID ? (
                    <p className="mb-1 text-[11px] font-medium text-muted-foreground">
                      العميل: {message.userID}
                    </p>
                  ) : null}
                  <p className="leading-relaxed">{message.text}</p>
                  <p className="mt-1 text-[11px] opacity-70">
                    {messageTimeLabel(message.at)}
                  </p>
                </article>
              );
            })}
          </div>

          <footer className="space-y-2 border-t border-border bg-card px-3 py-3">
            <p className="text-[11px] text-muted-foreground">
              {connectionHint}
            </p>
            <div className="flex items-center gap-2">
              <Input
                value={inputText}
                placeholder="اكتب رسالتك هنا..."
                onChange={(event) => setInputText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    sendMessage();
                  }
                }}
              />
              <Button
                variant="clay"
                size="icon"
                aria-label="ارسال"
                onClick={sendMessage}
              >
                <Send className="size-4" />
              </Button>
            </div>
          </footer>
        </section>
      ) : null}


      <div className="flex items-center gap-2">
        <Button
          variant="clay"
          size="lg"
          onClick={() => setIsOpen((prev) => !prev)}
          className="h-11 rounded-full px-4"
        >
          {isConnected ? (
            <Wifi className="size-4" />
          ) : (
            <WifiOff className="size-4" />
          )}
          <MessageCircle className="size-4" />
          <span>دعم مباشر</span>
        </Button>
      </div>
    </div>
  );
}
