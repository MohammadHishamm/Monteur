/**
 * Parse a cookie string and return an object of key-value pairs
 */
export function parseCookies(cookieString: string | null): Record<string, string> {
  if (!cookieString) return {}
  
  const cookies: Record<string, string> = {}
  cookieString.split(";").forEach((cookie) => {
    const [name, ...rest] = cookie.trim().split("=")
    if (name) {
      cookies[name] = decodeURIComponent(rest.join("="))
    }
  })
  return cookies
}

/**
 * Get the language from cookies (set by frontend JavaScript)
 * Checks for currentLang, sessionLanguage, or lang in that order
 * These cookies are set by the frontend when the user changes language
 */
export function getLanguageFromCookies(cookieString: string | null): string {
  if (!cookieString) return "ar"
  
  const cookies = parseCookies(cookieString)
  
  // Check in order: currentLang (set by frontend), sessionLanguage (set by frontend), lang (set by frontend)
  // These are all set by frontend JavaScript, not backend
  return cookies.currentLang || cookies.sessionLanguage || cookies.lang || "ar"
}

/**
 * Remove language-related cookies from cookie string for SEO purposes
 * This ensures meta tags are always in Arabic for search engines
 * SEO: Search engines should always see Arabic content, not user's language preference
 */
export function removeLanguageCookies(cookieString: string | null): string | null {
  if (!cookieString) return null
  
  const cookies = parseCookies(cookieString)
  
  // Remove language-related cookies
  delete cookies.currentLang
  delete cookies.sessionLanguage
  delete cookies.lang
  
  // Reconstruct cookie string without language cookies
  const cookiePairs = Object.entries(cookies).map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
  return cookiePairs.length > 0 ? cookiePairs.join("; ") : null
}

