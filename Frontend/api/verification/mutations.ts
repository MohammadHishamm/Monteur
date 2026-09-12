import { axios } from "@/lib/api/axios"

export interface VerificationSubmitInput {
  id_front_url: string
  id_back_url: string
  selfie_url: string
}

export interface VerificationRecord {
  id: string
  user_id: string
  id_front_url: string
  id_back_url: string
  selfie_url: string
  status: "pending" | "approved" | "rejected"
  rejection_reason?: string | null
  created_at: string
  updated_at: string
}

export async function submitVerification(data: VerificationSubmitInput): Promise<VerificationRecord> {
  const res = await axios.post<{ data: VerificationRecord }>("/users/verification", data)
  return res.data.data
}

export async function uploadVerificationDoc(file: File): Promise<string> {
  const form = new FormData()
  form.append("file", file)
  const res = await axios.post<{ data: { url: string } }>("/upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
  })
  return res.data.data.url
}
