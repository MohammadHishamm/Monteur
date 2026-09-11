// Determine if we're running on the server (SSR) or client (browser)
const isServer = typeof window === "undefined"

// For server-side (SSR in Docker), use the backend service name
// For client-side (browser), use the public API URL (localhost from browser perspective)
const getInternalApiDomain = () => {
  if (isServer && process.env.NEXT_PUBLIC_INTERNAL_API_URL) {
    return process.env.NEXT_PUBLIC_INTERNAL_API_URL
  }
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
}

// Always use the public API URL for URLs that will be rendered in the browser (images, links, etc.)
const getPublicApiDomain = () => {
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
}

export const appConfig = {
  appName: "منصة مونتير",
  apiDomain: getInternalApiDomain(),
  publicApiDomain: getPublicApiDomain(),
  websiteDomain: process.env.NEXT_PUBLIC_FRONTEND_URL ?? "",
  apiBasePath: "v1",
}
