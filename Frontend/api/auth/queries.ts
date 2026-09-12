import { axios } from "../../lib/api/axios"
import { mapSession, type AppSession } from "../../lib/auth/session"

export async function getNavbarSession(): Promise<AppSession> {
  const res = await axios.get("/auth/session")
  return mapSession(res.data)
}
