"use client"

import { LoadingScreen } from "@/components/common/loading-screen"
import { authenticateSocket } from "@/lib/socket/client"
import { type PropsWithChildren, useEffect, useState } from "react"
import { appConfig } from "~/config/app"

export function AppLoader({ children }: PropsWithChildren) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let mounted = true

    async function checkSession() {
      try {
        // Best-effort warmup only. Middleware/queries handle auth routing.
          const res = await fetch(`${appConfig.apiDomain}/v1/auth/session`, {
          credentials: "include",
        })
        
          // If user is authenticated, authenticate the socket for real-time notifications
          if (res.ok) {
            const json = await res.json()
            if (json?.data?.user_id) {
              authenticateSocket(json.data.user_id)
            }
          }
      } catch {
        // Network error — don't block rendering.
      } finally {
        if (mounted) {
          setReady(true)
        }
      }
    }

    checkSession()

    return () => {
      mounted = false
    }
  }, [])

  if (!ready) return <LoadingScreen />
  return <>{children}</>
}
