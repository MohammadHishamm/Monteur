"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TierBadge } from "@/components/ui/tier-badge";
import { cn } from "@/lib/utils";
import {
    Bell,
    Briefcase,
    CheckCircle2,
    Clapperboard,
    CreditCard,
    DollarSign,
    FileText,
    FolderOpen,
    Gift,
    LayoutDashboard,
    MessageSquare,
    PlusCircle,
    Search,
    Settings,
    Star,
    User,
    Users,
    X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

interface DashboardSidebarProps {
  userRole: "client" | "freelancer";
  user?: {
    name: string;
    email: string;
    avatar?: string;
    tier?: "bronze" | "silver" | "gold" | "platinum";
    verified: boolean;
  };
  onClose?: () => void;
  /** Always visible on lg+ screens — hides the close button there. */
  persistent?: boolean;
}

const clientNavItems = [
  { title: "لوحة التحكم", href: "/client", icon: LayoutDashboard },
  { title: "نشر وظيفة", href: "/post-job", icon: PlusCircle, highlight: true },
  { title: "وظائفي", href: "/projects", icon: FolderOpen },
  { title: "تصفّح المونتيرين", href: "/video-editors", icon: Users },
  { title: "الرسائل", href: "/messages", icon: MessageSquare },
  { title: "المدفوعات", href: "/payments", icon: CreditCard },
  { title: "ملفي الشخصي", href: "/client/profile", icon: User },
];

const freelancerNavItems = [
  { title: "لوحة التحكم", href: "/freelancer", icon: LayoutDashboard },
  { title: "تصفّح الوظائف", href: "/video-jobs", icon: Search, highlight: true },
  { title: "عروضي", href: "/proposals", icon: FileText },
  { title: "المشاريع النشطة", href: "/projects", icon: Briefcase },
  { title: "الرسائل", href: "/messages", icon: MessageSquare },
  { title: "الأرباح", href: "/payments", icon: DollarSign },
  { title: "أعمالي", href: "/freelancer/portfolio", icon: Clapperboard },
  { title: "ملفي الشخصي", href: "/freelancer/profile", icon: User },
];

const commonNavItems = [
  { title: "الإشعارات", href: "/notifications", icon: Bell },
  { title: "الإحالات", href: "/referrals", icon: Gift },
  { title: "الإعدادات", href: "/settings", icon: Settings },
];

export function DashboardSidebar({ userRole, user, onClose, persistent = false }: DashboardSidebarProps) {
  const pathname = usePathname();
  const navItems = userRole === "client" ? clientNavItems : freelancerNavItems;

  const userData = {
    name: "مستخدم",
    email: "",
    tier: undefined,
    verified: false,
    ...user,
  };
  const initials = userData.name.split(" ").map((n) => n[0]).join("");

  const renderItem = (item: {
    title: string;
    href: string;
    icon: React.ElementType;
    highlight?: boolean;
  }) => {
    const Icon = item.icon;
    // Exact match OR sub-route, but don't let "/" prefix match everything
    const isActive =
      pathname === item.href ||
      (item.href !== "/client" && item.href !== "/freelancer" && pathname.startsWith(`${item.href}/`));
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onClose}
        className={cn(
          "flex h-auto w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
          isActive
            ? "bg-primary/10 font-medium text-primary"
            : "text-muted-foreground hover:bg-accent hover:text-foreground"
        )}
      >
        <Icon className="size-4 shrink-0" strokeWidth={isActive ? 2.3 : 1.9} />
        <span>{item.title}</span>
        {item.highlight && !isActive && (
          <span className="ms-auto size-1.5 rounded-full bg-primary" />
        )}
      </Link>
    );
  };

  return (
    <div className="flex h-full flex-col">
      {/* Close button header */}
      <div
        className={cn(
          "border-b border-border px-3 py-3 flex items-center justify-end",
          persistent && "lg:hidden"
        )}
      >
        <button
          onClick={onClose}
          className="inline-flex size-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          aria-label="إغلاق القائمة"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {/* User chip */}
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5">
          <div className="relative shrink-0">
            <Avatar className="size-9">
              <AvatarImage src={userData.avatar} />
              <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            {userData.verified && (
              <span className="absolute -bottom-0.5 -inset-e-0.5 flex size-3.5 items-center justify-center rounded-full bg-card">
                <CheckCircle2 className="size-3 text-primary" strokeWidth={2.5} />
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium leading-none text-foreground">
              {userData.name}
            </p>
            <div className="mt-1 flex items-center gap-1.5">
              {userRole === "freelancer" && userData.tier && (
                <TierBadge tier={userData.tier} size="sm" showIcon={false} />
              )}
              <span className="text-[11px] text-muted-foreground">
                {userRole === "freelancer" ? "مونتير" : "عميل"}
              </span>
            </div>
          </div>
        </div>

        {/* Main nav */}
        <div>
          <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            الرئيسية
          </p>
          <div className="space-y-0.5">{navItems.map(renderItem)}</div>
        </div>

        {/* Account nav */}
        <div>
          <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            الحساب
          </p>
          <div className="space-y-0.5">{commonNavItems.map(renderItem)}</div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border px-5 py-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Star className="size-3 fill-yellow-400 text-yellow-400" />
            4.9 / 5
          </span>
          <span>+10K مستخدم</span>
        </div>
      </div>
    </div>
  );
}

