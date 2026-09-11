"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { AdminSidenav } from "~/components/admin/admin-sidenav"
import { parseCookies } from "~/lib/utils/cookie"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // /admin/login is always public
    if (pathname === "/admin/login") return

    const token = parseCookies(document.cookie)["admin-token"]
    if (!token) {
      router.replace("/admin/login")
    }
  }, [pathname, router])

  // Render the login page without the sidenav shell
  if (pathname === "/admin/login") {
    return <>{children}</>
  }

  return (
    // RTL: first flex child (AdminSidenav) is visually on the RIGHT
    <div dir="rtl" className="flex h-screen overflow-hidden" style={{ background: "#fafafa" }}>
      <AdminSidenav />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
