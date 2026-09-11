// src/i18n.js
import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import arMessages from "~/i18n/ar.json"
import enMessages from "~/i18n/en.json"
import koMessages from "~/i18n/ko.json"
import frMessages from "~/i18n/fr.json"
import esMessages from "~/i18n/es.json"
import zhMessages from "~/i18n/zh.json"
import jaMessages from "~/i18n/ja.json"
import idMessages from "~/i18n/id.json"
import msMessages from "~/i18n/ms.json"

// Get saved language from localStorage or default to Arabic
const getInitialLanguage = () => {
  if (typeof window !== "undefined") {
    // First check if we have a saved language preference
    const savedLang = localStorage.getItem("lang")
    if (savedLang && ["ar", "en", "ko", "fr", "es", "zh", "ja", "id", "ms"].includes(savedLang)) {
      return savedLang
    }

    // If no saved preference, check if we have session language from backend
    const sessionLang = localStorage.getItem("sessionLanguage")
    if (
      sessionLang &&
      ["ar", "en", "ko", "fr", "es", "zh", "ja", "id", "ms"].includes(sessionLang)
    ) {
      return sessionLang
    }
  }
  // Default to Arabic always
  return "ar"
}

// Set initial HTML attributes for language and direction
const setInitialDirection = (lang: string) => {
  if (typeof window !== "undefined") {
    const html = document.documentElement
    html.lang = lang
    html.dir = lang === "ar" ? "rtl" : "ltr"

    // Also set it on the body for extra safety
    document.body.dir = lang === "ar" ? "rtl" : "ltr"
  }
}

const initialLang = getInitialLanguage()
setInitialDirection(initialLang)

i18n.use(initReactI18next).init({
  resources: {
    ar: {
      translation: arMessages,
    },
    en: {
      translation: enMessages,
    },
    ko: {
      translation: koMessages,
    },
    fr: {
      translation: frMessages,
    },
    es: {
      translation: esMessages,
    },
    zh: {
      translation: zhMessages,
    },
    ja: {
      translation: jaMessages,
    },
    id: {
      translation: idMessages,
    },
    ms: {
      translation: msMessages,
    },
  },
  lng: initialLang,
  fallbackLng: "ar",
  interpolation: { escapeValue: false },
})

// Ensure direction is set after i18n is initialized
i18n.on("initialized", () => {
  const currentLang = i18n.language
  setInitialDirection(currentLang)
})

// Listen for language changes and update HTML attributes
i18n.on("languageChanged", (lng) => {
  setInitialDirection(lng)
})

// Function to apply session language
export const applySessionLanguage = (sessionLanguage: string) => {
  console.log("applySessionLanguage: Received language:", sessionLanguage)
  console.log("applySessionLanguage: Current i18n language:", i18n.language)
  console.log("applySessionLanguage: Has manual lang preference:", !!localStorage.getItem("lang"))
  console.log(
    "applySessionLanguage: Has session language stored:",
    !!localStorage.getItem("sessionLanguage")
  )

  if (
    sessionLanguage &&
    ["ar", "en", "ko", "fr", "es", "zh", "ja", "id", "ms"].includes(sessionLanguage)
  ) {
    const hasManualPreference = !!localStorage.getItem("lang")
    const hasStoredSessionLang = localStorage.getItem("sessionLanguage")

    // Apply session language if:
    // 1. User has no manual preference, OR
    // 2. User has manual preference but it's the same as session language, OR
    // 3. This is the first time we're getting session language (no stored sessionLanguage)
    if (
      !hasManualPreference ||
      (hasManualPreference && localStorage.getItem("lang") === sessionLanguage) ||
      !hasStoredSessionLang
    ) {
      console.log("applySessionLanguage: Applying session language:", sessionLanguage)
      localStorage.setItem("sessionLanguage", sessionLanguage)

      // Store current language for API requests (frontend only)
      localStorage.setItem("currentLang", sessionLanguage)

      // Set cookie from frontend so loader can read it (frontend sets cookie, not backend)
      if (typeof window !== "undefined") {
        document.cookie = `currentLang=${sessionLanguage}; path=/; max-age=31536000` // 1 year
      }

      // Change the i18n language
      if (i18n.language !== sessionLanguage) {
        console.log(
          "applySessionLanguage: Changing i18n language from",
          i18n.language,
          "to",
          sessionLanguage
        )
        i18n.changeLanguage(sessionLanguage)

        // Update HTML attributes
        if (typeof window !== "undefined") {
          const html = document.documentElement
          const body = document.body
          html.lang = sessionLanguage
          html.dir = sessionLanguage === "ar" ? "rtl" : "ltr"
          body.dir = sessionLanguage === "ar" ? "rtl" : "ltr"

          console.log(
            "applySessionLanguage: Updated HTML attributes - lang:",
            html.lang,
            "dir:",
            html.dir
          )

          // Dispatch custom event to trigger re-renders
          window.dispatchEvent(
            new CustomEvent("languageChanged", { detail: { lang: sessionLanguage } })
          )
        }
      } else {
        console.log("applySessionLanguage: Language already set to", sessionLanguage)
      }
    } else {
      console.log("applySessionLanguage: User has different manual language preference, skipping")
    }
  } else {
    console.log("applySessionLanguage: Invalid language:", sessionLanguage)
  }
}

export default i18n
