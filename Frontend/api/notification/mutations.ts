import { axios } from "../../lib/api/axios"

export async function markNavbarNotificationRead(notificationId: number, userId: string) {
  await axios.post(`/notifications/${notificationId}/read`, null, {
    params: { user_id: userId },
  })
}
