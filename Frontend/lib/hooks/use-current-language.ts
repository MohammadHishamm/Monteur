import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import i18n from "~/lib/i18n"

/**
 * Hook to get the current language code for API requests
 * Returns the current i18n language, falling back to localStorage or "ar"
 *
 * This hook is reactive - it will update when the language changes,
 * causing components to re-render and refetch data with the new language.
 */
export function useCurrentLanguage(): string {
  const { i18n } = useTranslation()
  // Hydration safety: Always start with "ar" (server default)
  // and update after mounting in useEffect
  const [currentLang, setCurrentLang] = useState("ar")

  useEffect(() => {
    // Update when i18n language changes
    const handleLanguageChange = () => {
      const newLang = i18n.language || localStorage.getItem("currentLang") || "ar"
      setCurrentLang(newLang)
    }

    // Initialize on mount (after hydration)
    handleLanguageChange()

    // Listen for both i18n events and custom events
    i18n.on("languageChanged", handleLanguageChange)

    const handleCustomLanguageChange = (event: CustomEvent<{ lang: string }>) => {
      setCurrentLang(event.detail.lang)
    }

    window.addEventListener("languageChanged", handleCustomLanguageChange as EventListener)

    return () => {
      i18n.off("languageChanged", handleLanguageChange)
      window.removeEventListener("languageChanged", handleCustomLanguageChange as EventListener)
    }
  }, [i18n])

  return currentLang
}

/**
 * Get the current language code synchronously
 * Useful for non-React contexts or loaders
 */
export function getCurrentLanguage(): string {
  if (typeof window !== "undefined") {
    // Try to get from i18n first (most reliable)
    if (i18n && i18n.language) {
      return i18n.language
    }

    // Fallback to localStorage - check all possible sources
    const lang =
      localStorage.getItem("currentLang") ||
      localStorage.getItem("sessionLanguage") ||
      localStorage.getItem("lang") ||
      "ar"

    // Ensure we always return a valid language code, never empty
    return lang || "ar"
  }
  return "ar"
}
