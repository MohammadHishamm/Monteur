"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { StudioLogo } from "~/components/brand/studio-logo"
import { axiosAdmin } from "~/lib/axios-admin"

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const res = await axiosAdmin.post<{
        data: { access_token: string; expires_in: number }
      }>("/admin/auth/signin", { email, password })

      const { access_token, expires_in } = res.data.data
      const maxAge = expires_in ?? 8 * 60 * 60
      document.cookie = `admin-token=${access_token}; path=/; max-age=${maxAge}; SameSite=Lax`
      document.cookie = `user-role=admin; path=/; max-age=${maxAge}; SameSite=Lax`

      router.push("/admin")
    } catch {
      setError("البريد الإلكتروني أو كلمة المرور غير صحيحة")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      dir="rtl"
      className="flex min-h-screen items-center justify-center"
      style={{ background: "#111316" }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-8"
        style={{ background: "#1a1d22", border: "1px solid #2a2d34" }}
      >
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <StudioLogo size={48} tone="invert" />
        </div>

        <h1 className="mb-1 text-center text-2xl font-bold text-white">
          لوحة الإدارة
        </h1>
        <p className="mb-8 text-center text-sm" style={{ color: "#64748b" }}>
          تسجيل دخول المدير
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: "#94a3b8" }}>
              البريد الإلكتروني
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              className="h-11 rounded-xl px-4 text-sm text-white outline-none focus:ring-2"
              style={{
                background: "#111316",
                border: "1px solid #2a2d34",
                focusRingColor: "#34d399",
              }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: "#94a3b8" }}>
              كلمة المرور
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-11 rounded-xl px-4 text-sm text-white outline-none focus:ring-2"
              style={{ background: "#111316", border: "1px solid #2a2d34" }}
            />
          </div>

          {error && (
            <p className="rounded-lg px-4 py-2.5 text-center text-sm font-medium text-red-400"
               style={{ background: "#2a1515" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="mt-2 h-11 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            style={{ background: "#10b981" }}
          >
            {loading ? "جاري تسجيل الدخول…" : "دخول"}
          </button>
        </form>
      </div>
    </div>
  )
}
