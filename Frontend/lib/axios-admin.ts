import Axios from "axios"
import { appConfig } from "~/config/app"
import { parseCookies } from "~/lib/utils/cookie"

export const axiosAdmin = Axios.create({
  baseURL: `${appConfig.apiDomain}/v1/`,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
  withCredentials: false,
})

// Attach admin-token as Bearer on every request
axiosAdmin.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = parseCookies(document.cookie)["admin-token"]
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

// On 401, redirect to admin login — no refresh attempt
axiosAdmin.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      window.location.href = "/admin/login"
    }
    return Promise.reject(error)
  },
)
