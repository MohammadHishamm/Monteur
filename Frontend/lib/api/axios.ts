import Axios from "axios"
import { appConfig } from "~/config/app"
import { signOutAndRedirect } from "~/lib/utils/auth-cookies"

type RetryableRequestConfig = {
  _retry?: boolean
  url?: string
}

let refreshRequestPromise: Promise<void> | null = null

async function ensureRefreshedSession() {
  if (!refreshRequestPromise) {
    refreshRequestPromise = axios
      .post("/auth/refresh")
      .then(() => undefined)
      .finally(() => {
        refreshRequestPromise = null
      })
  }

  return refreshRequestPromise
}

export const axios = Axios.create({
  baseURL: `${appConfig.apiDomain}/v1/`,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
  withCredentials: true,
})

// Add request interceptor for gatekeeper headers and FormData cleanup
axios.interceptors.request.use(
  (config) => {
    // If the data is FormData, remove Content-Type header to let browser set it with boundary
    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"]
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Add response interceptor to handle token refresh
axios.interceptors.response.use(
  (response) => {
    return response
  },
  async (error) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined

    if (!originalRequest) {
      return Promise.reject(error)
    }

    const isAuthPage =
      typeof window !== "undefined" &&
      ["/login", "/register", "/forgot-password"].includes(window.location.pathname)

    // Don't try to refresh tokens for auth endpoints (login, signup, refresh, etc.)
    const isAuthEndpoint = originalRequest.url?.includes("/auth/")
    // Don't try to refresh tokens for contact-info endpoints (handle 401 in component)
    const isContactInfoEndpoint = originalRequest.url?.includes("/contact-info")

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isAuthEndpoint &&
      !isContactInfoEndpoint &&
      !isAuthPage
    ) {
      originalRequest._retry = true

      if (typeof window === "undefined") {
        return Promise.reject(error)
      }

      try {
        await ensureRefreshedSession()
        return await axios(originalRequest)
      } catch {
        await signOutAndRedirect()
        // Navigation is in-progress; return a never-settling promise so
        // React Query doesn't process the rejection and throw to the console.
        return new Promise<never>(() => {})
      }
    }

    if (
      error.response?.status === 403 &&
      error.response?.data?.error === "unverified"
    ) {
      if (typeof window !== "undefined") {
        if (window.location.pathname !== "/verify") {
          window.location.href = "/verify"
          return new Promise<never>(() => {})
        }
      }
    }

    return Promise.reject(error)
  }
)
