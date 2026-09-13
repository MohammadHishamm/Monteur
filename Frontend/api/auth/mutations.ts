import { axios } from "@/lib/api/axios"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useCallback } from "react"

export interface EmailAuthRequest {
  email: string
  password: string
  user_name?: string
  first_name?: string
  last_name?: string
  avatar_url?: string
  user_type?: "client" | "freelancer"
}

export interface User {
  id: string
  email: string
  userName: string
  firstName?: string
  lastName?: string
  avatarURL?: string
  roles: string[]
  user_type: "client" | "freelancer"
  createdAt: string
  updatedAt: string
}

export interface AuthResponse {
  user: User
  accessToken: string
  tokenType: string
  expiresIn: number
}

export function useEmailSignupMutation() {
  return useMutation({
    mutationFn: async (data: EmailAuthRequest) => {
      const response = await axios.post<{ data: AuthResponse }>("/auth/email/signup", data)
      return response.data
    },
  })
}

export function useEmailSigninMutation() {
  return useMutation({
    mutationFn: async (data: Pick<EmailAuthRequest, "email" | "password">) => {
      const response = await axios.post<{ data: AuthResponse }>("/auth/email/signin", data)
      return response.data
    },
  })
}

export function useRefreshTokenMutation() {
  return useMutation({
    mutationFn: async () => {
      const response = await axios.post<{ data: AuthResponse }>("/auth/refresh")
      return response.data
    },
  })
}

export async function signOutNavbar() {
  await axios.post("/auth/signout")
}

/**
 * Sign out and drop the query cache.
 *
 * Everything cached belongs to the user who just left — including the identity
 * the navbar and sidebar render, which is held for five minutes. Navigating to
 * /login is a client-side push, so the QueryClient survives it; without this
 * the next person to sign in on this tab would be shown the previous user's
 * name, photo and tier until the entry went stale.
 *
 * The cache is cleared even when the request fails: the user asked to leave,
 * and their data should not stay in the tab either way.
 */
export function useSignOut() {
  const queryClient = useQueryClient()

  return useCallback(async () => {
    await signOutNavbar().catch(() => {})
    queryClient.clear()
  }, [queryClient])
}