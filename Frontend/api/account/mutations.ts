import { AxiosError } from "axios"
import { axios } from "../../lib/api/axios"

function errorMessage(e: unknown): string {
  if (e instanceof AxiosError) {
    const msg = e.response?.data?.error ?? e.response?.data?.message
    if (msg) return String(msg)
    return `${e.response?.status ?? "Network error"}`
  }
  if (e instanceof Error) return e.message
  return "حدث خطأ"
}

export async function updateAccount(name: string, email: string): Promise<void> {
  try {
    await axios.put("/me/account", { full_name: name, email })
  } catch (e) {
    throw new Error(errorMessage(e))
  }
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  try {
    await axios.post("/me/password", { current_password: currentPassword, new_password: newPassword })
  } catch (e) {
    throw new Error(errorMessage(e))
  }
}
