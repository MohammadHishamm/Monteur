"use client";

import { useRealtimeNotifications, type RealtimeNotification } from "@/lib/socket/hooks";
import { X } from "lucide-react";
import { useCallback, useState } from "react";

export function RealtimeNotificationProvider() {
  const [notifications, setNotifications] = useState<RealtimeNotification[]>([]);

  const handleNotification = useCallback((notification: RealtimeNotification) => {
    setNotifications((prev) => [...prev, notification]);

    // Auto-remove after 5 seconds
    const timer = setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  useRealtimeNotifications(handleNotification);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-3 max-w-md">
      {notifications.map((notif) => (
        <div
          key={notif.id}
          className="rounded-lg shadow-lg p-4 border animate-in fade-in slide-in-from-bottom-4 duration-300"
          style={{
            background:
              notif.type === "error"
                ? "#fee2e2"
                : notif.type === "warning"
                  ? "#fef3c7"
                  : "#d1fae5",
            borderColor:
              notif.type === "error"
                ? "#fca5a5"
                : notif.type === "warning"
                  ? "#fcd34d"
                  : "#6ee7b7",
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p
                className="font-bold text-sm"
                style={{
                  color:
                    notif.type === "error"
                      ? "#dc2626"
                      : notif.type === "warning"
                        ? "#d97706"
                        : "#059669",
                }}
              >
                {notif.title}
              </p>
              <p
                className="text-xs mt-1"
                style={{
                  color:
                    notif.type === "error"
                      ? "#7f1d1d"
                      : notif.type === "warning"
                        ? "#78350f"
                        : "#065f46",
                }}
              >
                {notif.message}
              </p>
            </div>
            <button
              onClick={() =>
                setNotifications((prev) =>
                  prev.filter((n) => n.id !== notif.id)
                )
              }
              className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
