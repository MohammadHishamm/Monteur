import { axios } from "../../lib/api/axios"
import type { NavbarNotification } from "../../types/notification"

export type { NavbarNotification }

export async function getNavbarNotifications(userId: string, limit = 30) {
  const res = await axios.get<{ notifications?: NavbarNotification[] }>("/notifications", {
    params: { user_id: userId, limit },
  })
  return res.data.notifications ?? []
}
