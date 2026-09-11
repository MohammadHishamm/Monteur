import { axios } from "@/lib/api/axios"
import { useMutation } from "@tanstack/react-query"

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