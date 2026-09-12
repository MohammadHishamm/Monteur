import { isServer } from "@tanstack/react-query"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { defaultsConfig } from "../config/defaults"

export type TParsedListingSearchParams = {
  page: {
    prev: number
    next: number
    current: number
  }
  offset: number
  limit: number
}
export function parseListingSearchParams({ page }: { page: number }): TParsedListingSearchParams {
  return {
    page: {
      current: page,
      prev: Math.max(1, page - 1),
      next: page + 1,
    },
    offset: (page - 1) * defaultsConfig.listing.limit,
    limit: defaultsConfig.listing.limit,
  }
}

export function converUnixToDate(mills: number) {
  return new Date(mills)
}

// Map language codes to locale codes for date formatting
function getLocaleForDate(language?: string): string {
  const lang =
    language || (typeof window !== "undefined" ? localStorage.getItem("currentLang") : null) || "ar"
  const langMap: Record<string, string> = {
    // Use ar-EG (Egypt) which defaults to Gregorian calendar, or use Unicode extension for Gregorian
    // ar-SA-u-ca-gregory forces Gregorian calendar for Saudi Arabia locale
    ar: "ar-EG", // Egypt locale defaults to Gregorian calendar (ميلادي)
    en: "en-US",
    ko: "ko-KR",
    fr: "fr-FR",
    es: "es-ES",
    zh: "zh-CN",
    ja: "ja-JP",
    id: "id-ID",
    ms: "ms-MY",
  }
  return langMap[lang] || "en-US"
}

export function convertLocaleDate(date: string | Date, language?: string) {
  const lang =
    language || (typeof window !== "undefined" ? localStorage.getItem("currentLang") : null) || "ar"

  // For Arabic, use Unicode extension to force Gregorian calendar (ميلادي) instead of Hijri (هجري)
  // ar-SA-u-ca-gregory explicitly sets the calendar to Gregorian for Saudi Arabia locale
  const locale = lang === "ar" ? "ar-SA-u-ca-gregory" : getLocaleForDate(language)

  return new Date(date).toLocaleDateString(locale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

/**
 * Generates a random integer between min and max (inclusive)
 */
export function generateRandomInt(min: number, max: number) {
  min = Math.ceil(min)
  max = Math.floor(max)

  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function logger(message?: any, ...optionalParams: any[]) {
  if (process.env.NODE_ENV !== "development") {
    return
  }

  console.log(message, ...optionalParams)
}

export function loggerServer(message?: any, ...optionalParams: any[]) {
  if (!isServer && process.env.NODE_ENV !== "development") {
    return
  }

  console.log(message, ...optionalParams)
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
