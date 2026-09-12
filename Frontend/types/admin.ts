export type AdminAnalytics = {
  total_users: number
  activated_users: number
  non_activated_users: number
  total_freelancers: number
  total_clients: number
  total_jobs: number
  total_projects: number
  total_revenue: number
  pending_verifications: number
  open_support_tickets: number
  new_users_this_month: number
  avg_completion_rate: number
}

export type AdminUser = {
  id: string
  name: string
  email: string
  role: "client" | "Freelance"
  status: "active" | "banned" | "inactive"
  joined_at: string
  balance: number
  is_email_verified: boolean
  is_id_verified: boolean
  avatar_color?: string
}

export type AdminVerification = {
  id: string
  user_id: string
  user_name: string
  user_email: string
  id_front_url: string
  id_back_url: string
  selfie_url?: string
  submitted_at: string
  status: "pending" | "approved" | "rejected"
}

export type AdminSupportConversation = {
  id: string
  user_id: string
  user_name: string
  user_email: string
  last_message: string
  last_message_at: string
  unread: number
  status: "open" | "closed"
}

export type AdminSupportMessage = {
  id: string
  sender: "user" | "admin"
  text: string
  sent_at: string
}
