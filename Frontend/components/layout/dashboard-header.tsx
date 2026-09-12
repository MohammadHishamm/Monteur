"use client";

import { getNavbarSession } from "@/api/auth/queries";
import { markNavbarNotificationRead } from "@/api/notification/mutations";
import {
    getNavbarNotifications,
    type NavbarNotification,
} from "@/api/notification/queries";
import { StudioLogo } from "@/components/brand/studio-logo";
import { subscribeRealtimeNotifications } from "@/lib/socket/realtime";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import {
    Bell,
    Briefcase,
    CreditCard,
    FilePenLine,
    Gift,
    Grid3X3,
    HelpCircle,
    LayoutDashboard,
    LogOut,
    Menu,
    MessageSquare,
    Plus,
    Search,
    Settings,
    User,
    Vibrate,
    Volume2,
    X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { signOutNavbar } from "~/api/auth/mutations";
import { userKeys } from "~/api/user/keys";

interface DashboardHeaderProps {
  userRole: "client" | "freelancer";
  user?: {
    name: string;
    email: string;
    avatar?: string;
    verified: boolean;
  };
  notifications?: number;
  onMenuClick?: () => void;
  /** Hide the menu button on lg+ screens, where the sidebar is always visible. */
  persistentSidebar?: boolean;
}

export function DashboardHeader({
  userRole,
  user,
  notifications = 0,
  onMenuClick,
  persistentSidebar = false,
}: DashboardHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const userData = user ?? { name: "مستخدم", email: "", verified: false };
  const initial = userData.name.trim()[0]?.toUpperCase() ?? "؟";

  const [dropOpen, setDropOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [userId, setUserId] = useState("");
  const [notifs, setNotifs] = useState<NavbarNotification[]>([]);
  const [messageToast, setMessageToast] = useState<{ id: number; href: string } | null>(null);
  const [proposalToast, setProposalToast] = useState<{ id: number; title: string; href: string } | null>(null);
  const [messageSoundEnabled, setMessageSoundEnabled] = useState(() => {
    if (typeof window === "undefined") return true;
    const pref = window.localStorage.getItem("msg-alert-sound");
    return pref === null ? true : pref === "1";
  });
  const [messageVibrationEnabled, setMessageVibrationEnabled] = useState(() => {
    if (typeof window === "undefined") return false;
    const pref = window.localStorage.getItem("msg-alert-vibration");
    return pref === null ? false : pref === "1";
  });
  const dropRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);

  const topLinks = [
    { icon: Plus, label: "أضف مشروع", href: "/post-job" },
    { icon: Briefcase, label: "تصفح المشاريع", href: "/video-jobs" },
    { icon: FilePenLine, label: "عروضي", href: "/proposals" },
    { icon: Briefcase, label: "مشاريعي", href: "/projects" },
  ];

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropOpen(false);
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const session = await getNavbarSession();
        if (cancelled) return;

        const uid = session.userId ?? "";
        setUserId(uid);

        if (!uid) return;
        const notificationsList = await getNavbarNotifications(uid, 30);
        if (!cancelled) setNotifs(notificationsList);
      } catch {
        if (!cancelled) {
          setUserId("");
          setNotifs([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const triggerIncomingMessageAlert = useCallback(() => {
    if (typeof window === "undefined") return;

    if (messageSoundEnabled) {
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = "sine";
          osc.frequency.value = 880;
          gain.gain.value = 0.035;

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.1);

          setTimeout(() => {
            void ctx.close();
          }, 160);
        }
      } catch {
        // Ignore browser autoplay/permission issues.
      }
    }

    if (messageVibrationEnabled && "vibrate" in navigator) {
      navigator.vibrate([80, 40, 80]);
    }
  }, [messageSoundEnabled, messageVibrationEnabled]);

  useEffect(() => {
    if (!userId) return;

    return subscribeRealtimeNotifications(userId, (payload) => {
      if (payload.type === "notification" && payload.notification && typeof payload.notification === "object") {
        const n = payload.notification as Partial<NavbarNotification>;
        const id = n.id;
        if (typeof id !== "number") return;

        setNotifs((prev) => {
          if (prev.some((item) => item.id === id)) return prev;
          return [
            {
              id,
              title: n.title ?? "إشعار",
              message: n.message ?? "",
              type: n.type ?? "notification",
              priority: n.priority ?? "normal",
              isRead: n.isRead ?? false,
              createdAt: n.createdAt ?? new Date().toISOString(),
            },
            ...prev,
          ];
        });
      }

      if (payload.type === "new_message") {
        const conversationID =
          payload.notification && typeof payload.notification === "object"
            ? (payload.notification as { conversation_id?: string }).conversation_id
            : undefined;

        if (!pathname?.startsWith("/messages")) {
          triggerIncomingMessageAlert();
          const href = conversationID
            ? `/messages?c=${encodeURIComponent(conversationID)}`
            : "/messages";
          setMessageToast({ id: Date.now(), href });
        }
      }

      // New proposal received (client) — notification type emitted by backend after submit
      if (payload.type === "notification" && payload.notification && typeof payload.notification === "object") {
        const n = payload.notification as Partial<NavbarNotification & { type?: string }>;
        if (n.type === "new_proposal") {
          triggerIncomingMessageAlert();
          setProposalToast({ id: Date.now(), title: "عرض جديد على وظيفتك", href: "/client" });
          // Immediately refresh the client dashboard so new proposal appears in the list
          void queryClient.invalidateQueries({ queryKey: userKeys.dashboard.client() });
        }
        if (n.type === "offer_accepted") {
          triggerIncomingMessageAlert();
          setProposalToast({ id: Date.now(), title: n.title ?? "تم قبول عرضك!", href: "/projects" });
          // Refresh freelancer dashboard so project appears immediately
          void queryClient.invalidateQueries({ queryKey: userKeys.dashboard.freelancer() });
        }
      }
    });
  }, [pathname, triggerIncomingMessageAlert, userId]);

  useEffect(() => {
    if (!messageToast) return;
    const timer = setTimeout(() => setMessageToast(null), 4500);
    return () => clearTimeout(timer);
  }, [messageToast]);

  useEffect(() => {
    if (!proposalToast) return;
    const timer = setTimeout(() => setProposalToast(null), 5000);
    return () => clearTimeout(timer);
  }, [proposalToast]);

  const unreadCount = notifs.filter((n) => !n.isRead).length;
  const badgeCount = unreadCount > 0 ? unreadCount : notifications;

  const markRead = async (id: number) => {
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    if (!userId) return;
    try {
      await markNavbarNotificationRead(id, userId);
    } catch {
      // Keep optimistic update.
    }
  };

  const markAllRead = () => {
    setNotifs((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  async function handleSignOut() {
    await signOutNavbar().catch(() => {});
    router.push("/login");
  }

  return (
    <header dir="rtl" className="border-b border-border bg-card text-foreground shadow-sm">
      {messageToast && (
        <div className="fixed bottom-4 inset-e-4 z-90 w-[min(24rem,calc(100vw-2rem))] rounded-xl border border-border bg-white p-3 shadow-xl">
          <div className="flex items-start gap-3">
            <div className="mt-1 size-2 rounded-full bg-primary" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">رسالة جديدة</p>
              <p className="mt-0.5 text-xs text-muted-foreground">وصلك رد جديد. افتح المحادثة الآن.</p>
            </div>
            <button
              type="button"
              onClick={() => setMessageToast(null)}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary"
              aria-label="إغلاق"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="mt-2 flex justify-end">
            <Link
              href={messageToast.href}
              onClick={() => setMessageToast(null)}
              className="inline-flex h-8 items-center rounded-lg bg-primary px-3 text-xs font-semibold text-white transition-opacity hover:opacity-90"
            >
              فتح الرسائل
            </Link>
          </div>
        </div>
      )}

      {proposalToast && (
        <div className="fixed bottom-4 inset-e-4 z-90 w-[min(24rem,calc(100vw-2rem))] rounded-xl border border-primary/20 bg-white p-3 shadow-xl">
          <div className="flex items-start gap-3">
            <div className="mt-1 size-2 rounded-full bg-primary" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">{proposalToast.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">اضغط للاطلاع على التفاصيل.</p>
            </div>
            <button
              type="button"
              onClick={() => setProposalToast(null)}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary"
              aria-label="إغلاق"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="mt-2 flex justify-end">
            <Link
              href={proposalToast.href}
              onClick={() => setProposalToast(null)}
              className="inline-flex h-8 items-center rounded-lg bg-primary px-3 text-xs font-semibold text-white transition-opacity hover:opacity-90"
            >
              عرض التفاصيل
            </Link>
          </div>
        </div>
      )}

      <div className="flex h-16 items-center justify-between gap-3 px-3 lg:px-6">
        {/* Right side — menu + logo + primary links */}
        <div className="flex min-w-0 items-center gap-2 lg:gap-4">
          <button
            onClick={onMenuClick}
            className={`inline-flex size-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground${persistentSidebar ? " lg:hidden" : ""}`}
            aria-label="فتح القائمة"
          >
            <Menu className="size-4" />
          </button>

          <StudioLogo tone="default" className="shrink-0" />

          <nav className="hidden items-center gap-1 md:flex">
            {topLinks.map(({ icon: Icon, label, href }) => (
              <Link
                key={href}
                href={href}
                className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
              >
                <Icon className="size-4 text-muted-foreground" />
                <span>{label}</span>
              </Link>
            ))}
          </nav>

          <div className="relative hidden w-72 items-center xl:flex">
            <Search className="pointer-events-none absolute inset-e-3 size-4 text-muted-foreground" />
            <input
              placeholder="ابحث عن مشروع أو مونتير"
              className="h-10 w-full rounded-full border border-input bg-background pe-10 ps-4 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary/45"
            />
          </div>
        </div>

        {/* Left side — quick actions + avatar */}
        <div className="flex items-center gap-2">
          <button className="inline-flex size-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground xl:hidden">
            <Search className="size-4" />
          </button>

          <Link
            href="/messages"
            className="inline-flex size-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="الرسائل"
          >
            <MessageSquare className="size-4" />
          </Link>

          <div className="relative" ref={bellRef}>
            <button
              type="button"
              onClick={() => {
                setBellOpen((v) => !v);
                setDropOpen(false);
              }}
              className="relative inline-flex size-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              aria-label="الإشعارات"
            >
              <Bell className="size-4" />
              {badgeCount > 0 && (
                <span className="absolute -inset-e-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-white">
                  {badgeCount > 9 ? "9+" : badgeCount}
                </span>
              )}
            </button>

            {bellOpen && (
              <div className="absolute inset-e-0 top-full z-50 mt-2 w-80 origin-top-end rounded-xl border border-border bg-white shadow-lg">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">الإشعارات</p>
                    <p className="text-xs text-muted-foreground">
                      {unreadCount > 0 ? `${unreadCount} غير مقروءة` : "كل الإشعارات مقروءة"}
                    </p>
                  </div>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={markAllRead}
                      className="text-xs font-semibold text-primary transition-opacity hover:opacity-70"
                    >
                      قراءة الكل
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto">
                  {notifs.length === 0 ? (
                    <p className="px-4 py-6 text-center text-sm text-muted-foreground">لا توجد إشعارات.</p>
                  ) : (
                    notifs.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => markRead(n.id)}
                        className={cn(
                          "flex cursor-pointer items-start gap-3 border-b border-border px-4 py-3 transition-colors last:border-0 hover:bg-secondary/40",
                          !n.isRead && "bg-primary/5"
                        )}
                      >
                        <span
                          className={cn(
                            "mt-1.5 size-2 shrink-0 rounded-full",
                            n.isRead ? "bg-transparent" : "bg-primary"
                          )}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-foreground">{n.title || n.type}</p>
                          {n.message && (
                            <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                              {n.message}
                            </p>
                          )}
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {new Date(n.createdAt).toLocaleString("ar-EG", {
                              hour: "2-digit",
                              minute: "2-digit",
                              day: "numeric",
                              month: "short",
                            })}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            className="inline-flex size-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="التطبيقات"
          >
            <Grid3X3 className="size-4" />
          </button>

          {/* Avatar dropdown */}
          <div className="relative" ref={dropRef}>
            <button
              type="button"
              onClick={() => {
                setDropOpen((v) => !v);
                setBellOpen(false);
              }}
              className="flex items-center gap-2 rounded-full p-0.5 transition-colors hover:bg-secondary"
            >
              {userData.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={userData.avatar}
                  alt={userData.name}
                  className="size-9 rounded-full border border-border object-cover"
                />
              ) : (
                <span className="flex size-9 items-center justify-center rounded-full border border-border bg-primary/10 text-xs font-bold text-primary">
                  {initial}
                </span>
              )}
            </button>

            {dropOpen && (
              <div className="absolute inset-e-0 top-full z-50 mt-2 w-52 origin-top-end rounded-xl border border-border bg-white shadow-lg">
                <div className="border-b border-border px-4 py-3">
                  <p className="truncate text-sm font-semibold text-foreground">{userData.name || "…"}</p>
                  <p className="truncate text-xs text-muted-foreground">{userData.email}</p>
                </div>
                <div className="p-1.5 flex flex-col gap-0.5">
                  {[
                    { icon: User, label: "الملف الشخصي", href: "/dashboard/profile" },
                    { icon: LayoutDashboard, label: "لوحة التحكم", href: userRole === "freelancer" ? "/freelancer" : "/client" },
                    { icon: Settings, label: "الإعدادات", href: "/settings" },
                    { icon: CreditCard, label: "الفواتير", href: "/settings/billing" },
                    { icon: Gift, label: "الإحالات", href: "/settings/referrals" },
                    { icon: HelpCircle, label: "المساعدة", href: "/help" },
                  ].map(({ icon: Icon, label, href }) => (
                    <Link
                      key={label}
                      href={href}
                      onClick={() => setDropOpen(false)}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-secondary"
                    >
                      <Icon className="size-4 text-muted-foreground" />
                      {label}
                    </Link>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      const next = !messageSoundEnabled;
                      setMessageSoundEnabled(next);
                      if (typeof window !== "undefined") {
                        window.localStorage.setItem("msg-alert-sound", next ? "1" : "0");
                      }
                    }}
                    className="flex w-full items-center justify-between gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-secondary"
                  >
                    <span className="flex items-center gap-2.5">
                      <Volume2 className="size-4 text-muted-foreground" />تنبيه صوتي للرسائل
                    </span>
                    <span className={cn("text-xs font-semibold", messageSoundEnabled ? "text-primary" : "text-muted-foreground")}>
                      {messageSoundEnabled ? "مفعّل" : "متوقف"}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !messageVibrationEnabled;
                      setMessageVibrationEnabled(next);
                      if (typeof window !== "undefined") {
                        window.localStorage.setItem("msg-alert-vibration", next ? "1" : "0");
                      }
                    }}
                    className="flex w-full items-center justify-between gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-secondary"
                  >
                    <span className="flex items-center gap-2.5">
                      <Vibrate className="size-4 text-muted-foreground" />اهتزاز الرسائل
                    </span>
                    <span className={cn("text-xs font-semibold", messageVibrationEnabled ? "text-primary" : "text-muted-foreground")}>
                      {messageVibrationEnabled ? "مفعّل" : "متوقف"}
                    </span>
                  </button>
                  <div className="my-1 border-t border-border" />
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50"
                  >
                    <LogOut className="size-4" />
                    تسجيل الخروج
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

