export interface Review {
  id: string
  project_id: string
  reviewer_id: string
  reviewee_id: string
  rating: number
  body: string
  created_at: string

  // Joined
  reviewer_name: string
  reviewer_avatar?: string | null
}

export interface ReviewCreateInput {
  rating: number
  body: string
}
