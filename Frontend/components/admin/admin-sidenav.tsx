"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BarChart3,
  Users,
  MessageSquare,
  ShieldCheck,
  LogOut,
} from "lucide-react"
import { StudioLogo } from "~/components/brand/studio-logo"

const NAV_ITEMS = [
  {
    label: "الإحصائيات",
    href: "/admin/analytics",
    icon: BarChart3,
  },
  {
    label: "المستخدمون",
    href: "/admin/users",
    icon: Users,
  },
  {
    label: "دعم العملاء",
    href: "/admin/support",
    icon: MessageSquare,
  },
  {
    label: "التحقق من الهوية",
    href: "/admin/verification",
    icon: ShieldCheck,
  },
]

export function AdminSidenav() {
  const pathname = usePathname()

  return (
    <aside
      className="flex h-screen w-64 shrink-0 flex-col border-s"
      style={{ background: "#111316", borderColor: "#1e2126" }}
    >
      {/* logo */}
      <div className="flex items-center gap-3 border-b px-5 py-4" style={{ borderColor: "#1e2126" }}>
        <StudioLogo tone="invert" />
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#34D399" }}>
            لوحة الإدارة
          </p>
        </div>
      </div>

      {/* nav */}
      <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors"
              style={{
                background: active ? "rgba(52,211,153,0.12)" : "transparent",
                color: active ? "#34D399" : "#94A3B8",
              }}
            >
              <Icon className="size-4 shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* bottom */}
      <div className="border-t px-3 py-3" style={{ borderColor: "#1e2126" }}>
        <Link
          href="/dashboard/freelancer"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors hover:bg-white/5"
          style={{ color: "#64748B" }}
        >
          <LogOut className="size-4 shrink-0" />
          العودة للموقع
        </Link>
      </div>
    </aside>
  )
}
