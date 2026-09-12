import { addSocketMessageListener } from "@/lib/socket/client";
import { useEffect } from "react";

export interface RealtimeNotification {
  id: string;
  type: "verification" | "warning" | "info" | "error";
  title: string;
  message: string;
  timestamp: number;
}

export function useRealtimeNotifications(
  onNotification?: (notification: RealtimeNotification) => void
) {
  useEffect(() => {
    // Handle generic message events from backend
    const handleMessage = (msg: any) => {
      if (!msg) return;

      // Handle verification updates
      if (msg.type === "verification:updated" && msg.data) {
        const data = msg.data;
        const notification: RealtimeNotification = {
          id: `verif-${data.user_id}-${Date.now()}`,
          type: data.status === "approved" ? "info" : "error",
          title:
            data.status === "approved"
              ? "✅ تم قبول التحقق"
              : "❌ تم رفض التحقق",
          message:
            data.status === "approved"
              ? "تم التحقق من هويتك بنجاح! يمكنك الآن الوصول لكل المميزات."
              : `تم رفض طلب التحقق${data.reason ? ": " + data.reason : ""}`,
          timestamp: Date.now(),
        };
        onNotification?.(notification);
      }

      // Handle dashboard warnings
      if (msg.type === "dashboard:warning" && msg.data) {
        const data = msg.data;
        const notification: RealtimeNotification = {
          id: `warning-${Date.now()}`,
          type: data.severity === "error" ? "error" : "warning",
          title: "⚠️ تحذير",
          message: data.message,
          timestamp: Date.now(),
        };
        onNotification?.(notification);
      }
    };

    const unsubscribe = addSocketMessageListener(handleMessage);
    return unsubscribe;
  }, [onNotification]);
}
