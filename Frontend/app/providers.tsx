"use client"

import { DirectionProvider } from "@radix-ui/react-direction"
import { Theme } from "@radix-ui/themes"
import {
  QueryClientProvider as BaseQueryClientProvider,
} from "@tanstack/react-query"
import type { AxiosError } from "axios"
import { ThemeProvider as ThemeProviderBase } from "next-themes"
import { type PropsWithChildren, useEffect, useState } from "react"
import { I18nextProvider as I18nextProviderBase, useTranslation } from "react-i18next"

import { useGetQueryClient } from "../lib/hooks/query-client"
import i18n from "../lib/i18n"

export function ThemeProvider({ children }: PropsWithChildren) {
  return (
    <ThemeProviderBase attribute="class">
      <Theme accentColor="violet" radius="large">
        <DynamicDirectionProvider>{children}</DynamicDirectionProvider>
      </Theme>
    </ThemeProviderBase>
  )
}

function DynamicDirectionProvider({ children }: PropsWithChildren) {
  const { i18n } = useTranslation()
  const [direction, setDirection] = useState<"ltr" | "rtl">("rtl") // Default to RTL

  useEffect(() => {
    // Get the current language and set direction
    const updateDirection = () => {
      const currentLang = i18n.language || localStorage.getItem("lang") || "ar"
      const newDirection = currentLang === "ar" ? "rtl" : "ltr"
      setDirection(newDirection)
      
      // Also update HTML attributes
      if (typeof window !== "undefined") {
        const html = document.documentElement
        html.lang = currentLang
        html.dir = newDirection
      }
    }

    // Set initial direction
    updateDirection()

    // Listen for language changes
    const handleLanguageChange = () => {
      updateDirection()
    }

    // Listen for custom language change events
    const handleCustomLanguageChange = (event: CustomEvent) => {
      const lang = event.detail.lang
      const newDirection = lang === "ar" ? "rtl" : "ltr"
      setDirection(newDirection)
      
      if (typeof window !== "undefined") {
        const html = document.documentElement
        html.lang = lang
        html.dir = newDirection
      }
    }

    // Set up listeners
    i18n.on('languageChanged', handleLanguageChange)
    window.addEventListener('languageChanged', handleCustomLanguageChange as EventListener)

    return () => {
      i18n.off('languageChanged', handleLanguageChange)
      window.removeEventListener('languageChanged', handleCustomLanguageChange as EventListener)
    }
  }, [i18n])
  
  return (
    <DirectionProvider dir={direction}>
      {children}
    </DirectionProvider>
  )
}

declare module "@tanstack/react-query" {
  interface Register {
    defaultError: AxiosError<{ error: string | string[] }>
  }
}

export function QueryClientProvider({ children }: PropsWithChildren) {
  const queryClient = useGetQueryClient()

  return (
    <BaseQueryClientProvider client={queryClient}>
      {children}
    </BaseQueryClientProvider>
  )
}

export function I18nextProvider({ children }: PropsWithChildren) {
  return <I18nextProviderBase i18n={i18n}>{children}</I18nextProviderBase>
}
