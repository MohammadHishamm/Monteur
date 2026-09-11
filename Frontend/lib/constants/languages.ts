export const LANGUAGES = {
  ar: "العربية",
  en: "English",
  es: "Español",
  fr: "Français",
  ja: "日本語",
  id: "Bahasa Indonesia",
  ms: "Bahasa Melayu",
  ko: "한국어",
  zh: "中文",
} as const

export type LanguageCode = keyof typeof LANGUAGES

export const LANGUAGE_OPTIONS = Object.entries(LANGUAGES).map(([value, label]) => ({
  value,
  label,
}))
