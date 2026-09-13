"use client";

import { useSignOut } from "@/api/auth/mutations";
import { getNavbarSession } from "@/api/auth/queries";
import { markNavbarNotificationRead } from "@/api/notification/mutations";
import {
    getNavbarNotifications,
    type NavbarNotification,
} from "@/api/notification/queries";
import { StudioLogo } from "@/components/brand/studio-logo";
import { subscribeRealtimeNotifications } from "@/lib/socket/realtime";
import { cn } from "@/lib/utils";
import {
    Bell,
    Bookmark, ChevronDown,
    LayoutDashboard,
    LogOut,
    Menu,
    Settings,
    Vibrate,
    Volume2,
    X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const m = document.cookie.match(new RegExp(`(?:^|; )${encodeURIComponent(name)}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : undefined;
}

type MarketingNavProps = {
  mode?: "default" | "solid";
};

export function MarketingNav({ mode = "default" }: MarketingNavProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const router = useRouter();
  const runSignOut = useSignOut();
  const [messageToast, setMessageToast] = useState<{ id: number; href: string } | null>(null);
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

  // Bootstrap auth from cookies, then confirm with session API.
  const [authed, setAuthed] = useState(() => {
    if (typeof document === "undefined") return false;
    const r = getCookie("user-role") ?? getCookie("user-type") ?? "";
    return !!r;
  });
  const [role, setRole] = useState(() => {
    if (typeof document === "undefined") return "";
    return getCookie("user-role") ?? getCookie("user-type") ?? "";
  });
  const [authResolved, setAuthResolved] = useState(false);
  // name + email fetched from API after mount
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  // notifications
  const [notifs, setNotifs] = useState<NavbarNotification[]>([]);
  const [userId, setUserId] = useState("");

  const [scrolled, setScrolled] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);

  const triggerIncomingMessageAlert = useCallback(() => {
    if (typeof window === "undefined") return;

    if (messageSoundEnabled) {
      try {
        const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
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
        // Ignore audio errors (permissions/browser policies).
      }
    }

    if (messageVibrationEnabled && "vibrate" in navigator) {
      navigator.vibrate([80, 40, 80]);
    }
  }, [messageSoundEnabled, messageVibrationEnabled]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const cookieRole = getCookie("user-role") ?? getCookie("user-type") ?? "";
      if (cookieRole) {
        setRole(cookieRole);
        setAuthed(true);
      }

      try {
        const session = await getNavbarSession();
        if (cancelled) return;

        const hasSession = !!(session.userId || session.email || session.name);
        if (!hasSession) {
          if (!cookieRole) {
            setAuthed(false);
            setRole("");
          }
          return;
        }

        setAuthed(true);
        setName(session.name ?? "");
        setEmail(session.email ?? "");

        const latestRole = getCookie("user-role") ?? getCookie("user-type") ?? "";
        if (latestRole) setRole(latestRole);

        const uid = session.userId ?? "";
        setUserId(uid);

        if (!uid) return;

        const notifications = await getNavbarNotifications(uid, 30);
        if (!cancelled) setNotifs(notifications);
      } catch {
        if (!cancelled && !cookieRole) {
          setAuthed(false);
          setRole("");
        }
      } finally {
        if (!cancelled) setAuthResolved(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

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
    });
  }, [pathname, triggerIncomingMessageAlert, userId]);

  useEffect(() => {
    if (!messageToast) return;
    const timer = setTimeout(() => setMessageToast(null), 4500);
    return () => clearTimeout(timer);
  }, [messageToast]);

  // Scroll detection for floating nav
  useEffect(() => {
    function onScroll() { setScrolled(window.scrollY > 10); }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!mobileOpen) {
      document.body.style.overflow = "";
      return;
    }
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  // Prevent stuck overlay when resizing from small to larger viewports.
  useEffect(() => {
    function onResize() {
      if (window.innerWidth >= 768) {
        setMobileOpen(false);
      }
    }

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropOpen(false);
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const markRead = async (id: number) => {
    setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
    try {
      await markNavbarNotificationRead(id, userId);
    } catch { /* keep optimistic */ }
  };

  const markAllRead = () => {
    setNotifs((prev) => prev.map((n) => ({ ...n, isRead: true })));
    // No backend endpoint yet — optimistic only (Phase 3.4 backend adds it)
  };

  const isFreelancer = role === "freelancer";
  const initial = name.trim()[0]?.toUpperCase() ?? "؟";
  const dashboardHref = isFreelancer ? "/freelancer" : "/client";
  const unreadCount = notifs.filter((n) => !n.isRead).length;

  const browseLink = isFreelancer
    ? { label: "تصفّح الوظائف", href: "/jobs" }
    : { label: "تصفّح المونتيرين", href: "/freelancers" };

  const navLinks = [browseLink, { label: "كيف يعمل", href: "/how-it-works" }];

  async function signOut() {
    await runSignOut();
    setAuthed(false);
    setRole("");
    setName("");
    setEmail("");
    setDropOpen(false);
    router.push("/login");
  }

  // ── shared authenticated dropdowns ──────────────────────────────
  const bellDropdown = bellOpen && (
    <div className="absolute inset-e-0 top-full z-50 mt-2 w-80 origin-top-end rounded-xl border border-border bg-white shadow-lg">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-foreground">الإشعارات</p>
          <p className="text-xs text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} غير مقروءة` : "كل الإشعارات مقروءة"}
          </p>
        </div>
        {unreadCount > 0 && (
          <button type="button" onClick={markAllRead} className="text-xs font-semibold text-[#059669] transition-opacity hover:opacity-70">
            قراءة الكل
          </button>
        )}
      </div>
      <div className="max-h-80 overflow-y-auto">
        {notifs.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">لا توجد إشعارات.</p>
        ) : (
          notifs.map((n) => (
            <div key={n.id} onClick={() => markRead(n.id)} className={cn("flex cursor-pointer items-start gap-3 border-b border-border px-4 py-3 transition-colors last:border-0 hover:bg-[#FAFAFA]", !n.isRead && "bg-[#ECFDF5]")}>
              <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.isRead ? "bg-transparent" : "bg-[#10B981]")} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">{n.title || n.type}</p>
                {n.message && <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground line-clamp-2">{n.message}</p>}
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {new Date(n.createdAt).toLocaleString("ar-EG", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const avatarDropdown = dropOpen && (
    <div className="absolute inset-e-0 top-full z-50 mt-2 w-52 origin-top-end rounded-xl border border-border bg-white shadow-lg">
      <div className="border-b border-border px-4 py-3">
        <p className="truncate text-sm font-semibold text-foreground">{name || "…"}</p>
        <p className="truncate text-xs text-muted-foreground">{email}</p>
      </div>
      <div className="p-1.5 flex flex-col gap-0.5">
        <Link href={dashboardHref} onClick={() => setDropOpen(false)} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-secondary">
          <LayoutDashboard className="size-4 text-muted-foreground" />لوحة التحكم
        </Link>
        <Link href="/settings" onClick={() => setDropOpen(false)} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-secondary">
          <Settings className="size-4 text-muted-foreground" />الإعدادات
        </Link>
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
          <span className={cn("text-xs font-semibold", messageSoundEnabled ? "text-[#059669]" : "text-muted-foreground")}>
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
          <span className={cn("text-xs font-semibold", messageVibrationEnabled ? "text-[#059669]" : "text-muted-foreground")}>
            {messageVibrationEnabled ? "مفعّل" : "متوقف"}
          </span>
        </button>
        <div className="my-1 border-t border-border" />
        <button type="button" onClick={signOut} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50">
          <LogOut className="size-4" />تسجيل الخروج
        </button>
      </div>
    </div>
  );

  const mobileMenuContent = (
    <div className="flex flex-col gap-1 px-5 py-4">
      {navLinks.map((l) => (
        <Link key={l.href} href={l.href} onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground">
          {l.label}
        </Link>
      ))}
      <div className="mt-2 flex flex-col gap-2">
        {!authResolved ? (
          <div className="h-20 rounded-lg border border-border bg-background/60" />
        ) : authed ? (
          <>
            <div className="flex items-center gap-3 rounded-lg border border-border px-4 py-3">
              <span className="flex size-8 items-center justify-center rounded-full bg-[#10B981]/15 text-sm font-bold text-[#059669]">{initial}</span>
              <div className="min-w-0">
                <p className="truncate text-xs text-muted-foreground">{email}</p>
              </div>
            </div>
            {!isFreelancer && (
              <Link href="/saved" onClick={() => setMobileOpen(false)} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-border text-sm font-semibold text-foreground">
                <Bookmark className="size-4" />المحفوظون
              </Link>
            )}
            <Link href={dashboardHref} onClick={() => setMobileOpen(false)} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-border text-sm font-semibold text-foreground">
              <LayoutDashboard className="size-4" />لوحة التحكم
            </Link>
            <Link href="/settings" onClick={() => setMobileOpen(false)} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-border text-sm font-semibold text-foreground">
              <Settings className="size-4" />الإعدادات
            </Link>
            <button type="button" onClick={() => { setMobileOpen(false); signOut(); }} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-red-200 text-sm font-semibold text-red-600">
              <LogOut className="size-4" />تسجيل الخروج
            </button>
          </>
        ) : (
          <>
            <Link href="/login" onClick={() => setMobileOpen(false)} className="inline-flex h-11 items-center justify-center rounded-lg border border-border text-sm font-semibold text-foreground">تسجيل الدخول</Link>
            <Link href="/register" onClick={() => setMobileOpen(false)} className="inline-flex h-11 items-center justify-center rounded-lg bg-[#10B981] text-sm font-semibold text-white">إنشاء حساب</Link>
          </>
        )}
      </div>
    </div>
  );

  const showTransparentNav = mode === "default" && !scrolled;
  const showSolidNav = mode === "default" && scrolled;
  const solidFirstNav = mode === "solid";

  return (
    <div className="fixed inset-x-0 top-0 z-50">

      {messageToast && (
        <div className="fixed bottom-4 inset-e-4 z-[90] w-[min(24rem,calc(100vw-2rem))] rounded-xl border border-border bg-white p-3 shadow-xl">
          <div className="flex items-start gap-3">
            <div className="mt-1 size-2 rounded-full bg-[#10B981]" />
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
              className="inline-flex h-8 items-center rounded-lg bg-[#10B981] px-3 text-xs font-semibold text-white transition-opacity hover:opacity-90"
            >
              فتح الرسائل
            </Link>
          </div>
        </div>
      )}

      {/* ══════ NAV 1 — Transparent (visible at top) ══════ */}
      {showTransparentNav && (
      <div className="absolute inset-x-0 top-0">
        <header>
          <div className="flex h-16 w-full items-center justify-between px-3 lg:px-6">
            <StudioLogo tone="invert" />
            {/* Desktop links — white */}
            <nav className="hidden items-center gap-1 md:flex">
              {navLinks.map((l) => (
                <Link key={l.href} href={l.href} className="rounded-lg px-3 py-1.5 text-base font-medium text-white/80 transition-colors hover:text-white">
                  {l.label}
                </Link>
              ))}
            </nav>
            {/* Desktop right — white */}
            <div className="hidden items-center gap-2 md:flex">
              {!authResolved ? (
                <div className="h-9 w-44 rounded-lg bg-white/10" />
              ) : authed ? (
                <>
                  {!isFreelancer && (
                    <Link href="/saved" className="inline-flex size-9 items-center justify-center rounded-full border border-white/30 text-white/80 transition-colors hover:bg-white/10 hover:text-white" aria-label="المحفوظون">
                      <Bookmark className="size-4" />
                    </Link>
                  )}
                  <div className="relative" ref={bellRef}>
                    <button type="button" onClick={() => { setBellOpen((v) => !v); setDropOpen(false); }} className="relative inline-flex size-9 items-center justify-center rounded-full border border-white/30 text-white/80 transition-colors hover:bg-white/10 hover:text-white" aria-label="الإشعارات">
                      <Bell className="size-4" />
                      {unreadCount > 0 && <span className="absolute -inset-e-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-[#10B981] text-[9px] font-bold text-white">{unreadCount > 9 ? "9+" : unreadCount}</span>}
                    </button>
                    {bellDropdown}
                  </div>
                  <div className="relative" ref={dropRef}>
                    <button type="button" onClick={() => { setDropOpen((v) => !v); setBellOpen(false); }} className="flex items-center gap-2 rounded-full border border-white/30 px-2 py-1 transition-colors hover:bg-white/10">
                      <span className="flex size-7 items-center justify-center rounded-full bg-white/20 text-xs font-bold text-white">{initial}</span>
                      <ChevronDown className={cn("size-3.5 text-white/70 transition-transform", dropOpen && "rotate-180")} />
                    </button>
                    {avatarDropdown}
                  </div>
                </>
              ) : (
                <>
                  <Link href="/login" className="rounded-lg px-3 py-2 text-base font-medium text-white/80 transition-colors hover:text-white">تسجيل الدخول</Link>
                  <Link href="/register" className="inline-flex h-9 items-center rounded-lg bg-white px-4 text-sm font-semibold text-foreground transition-opacity hover:opacity-90">إنشاء حساب</Link>
                </>
              )}
            </div>
            <button className="inline-flex size-9 items-center justify-center rounded-lg border border-white/40 text-white transition-colors hover:bg-white/10 md:hidden" onClick={() => setMobileOpen((v) => !v)} aria-label="القائمة">
              {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
            </button>
          </div>
        </header>
      </div>
      )}

      {/* ══════ NAV 1 (Solid mode) — Full-width white bar ══════ */}
      {solidFirstNav && (
      <div className="absolute inset-x-0 top-0">
        <header className="border-b border-border bg-white">
          <div className="flex h-16 w-full items-center justify-between px-3 lg:px-6">
            <StudioLogo tone="default" />
            <nav className="hidden items-center gap-1 md:flex">
              {navLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="rounded-lg px-3 py-1.5 text-base font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  {l.label}
                </Link>
              ))}
            </nav>
            <div className="hidden items-center gap-2 md:flex">
              {!authResolved ? (
                <div className="h-9 w-44 rounded-lg bg-secondary" />
              ) : authed ? (
                <>
                  {!isFreelancer && (
                    <Link
                      href="/saved"
                      className="inline-flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                      aria-label="المحفوظون"
                    >
                      <Bookmark className="size-4" />
                    </Link>
                  )}
                  <div className="relative" ref={bellRef}>
                    <button
                      type="button"
                      onClick={() => { setBellOpen((v) => !v); setDropOpen(false); }}
                      className="relative inline-flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                      aria-label="الإشعارات"
                    >
                      <Bell className="size-4" />
                      {unreadCount > 0 && <span className="absolute -inset-e-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-[#10B981] text-[9px] font-bold text-white">{unreadCount > 9 ? "9+" : unreadCount}</span>}
                    </button>
                    {bellDropdown}
                  </div>
                  <div className="relative" ref={dropRef}>
                    <button
                      type="button"
                      onClick={() => { setDropOpen((v) => !v); setBellOpen(false); }}
                      className="flex items-center gap-2 rounded-full border border-border px-2 py-1 transition-colors hover:bg-secondary"
                    >
                      <span className="flex size-7 items-center justify-center rounded-full bg-[#10B981]/15 text-xs font-bold text-[#059669]">{initial}</span>
                      <ChevronDown className={cn("size-3.5 text-muted-foreground transition-transform", dropOpen && "rotate-180")} />
                    </button>
                    {avatarDropdown}
                  </div>
                </>
              ) : (
                <>
                  <Link href="/login" className="rounded-lg px-3 py-2 text-base font-medium text-muted-foreground transition-colors hover:text-foreground">تسجيل الدخول</Link>
                  <Link href="/register" className="inline-flex h-9 items-center rounded-lg bg-[#10B981] px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90">إنشاء حساب</Link>
                </>
              )}
            </div>
            <button
              className="inline-flex size-9 items-center justify-center rounded-lg border border-border text-foreground transition-colors hover:bg-secondary md:hidden"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="القائمة"
            >
              {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
            </button>
          </div>
        </header>
      </div>
      )}

      {/* ══════ NAV 2 — White pill (visible on scroll) ══════ */}
      {showSolidNav && (
      <div className="absolute inset-x-0 top-0 px-4 pt-3">
        <header className="mx-auto max-w-6xl rounded-2xl bg-white shadow-xl backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-3 lg:px-6">
            <StudioLogo tone="default" />
            {/* Desktop links — dark */}
            <nav className="hidden items-center gap-1 md:flex">
              {navLinks.map((l) => (
                <Link key={l.href} href={l.href} className="rounded-lg px-3 py-1.5 text-base font-medium text-muted-foreground transition-colors hover:text-foreground">
                  {l.label}
                </Link>
              ))}
            </nav>
            {/* Desktop right — dark */}
            <div className="hidden items-center gap-2 md:flex">
              {!authResolved ? (
                <div className="h-9 w-44 rounded-lg bg-secondary" />
              ) : authed ? (
                <>
                  {!isFreelancer && (
                    <Link href="/saved" className="inline-flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground" aria-label="المحفوظون">
                      <Bookmark className="size-4" />
                    </Link>
                  )}
                  <div className="relative" ref={bellRef}>
                    <button type="button" onClick={() => { setBellOpen((v) => !v); setDropOpen(false); }} className="relative inline-flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground" aria-label="الإشعارات">
                      <Bell className="size-4" />
                      {unreadCount > 0 && <span className="absolute -inset-e-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-[#10B981] text-[9px] font-bold text-white">{unreadCount > 9 ? "9+" : unreadCount}</span>}
                    </button>
                    {bellDropdown}
                  </div>
                  <div className="relative" ref={dropRef}>
                    <button type="button" onClick={() => { setDropOpen((v) => !v); setBellOpen(false); }} className="flex items-center gap-2 rounded-full border border-border px-2 py-1 transition-colors hover:bg-secondary">
                      <span className="flex size-7 items-center justify-center rounded-full bg-[#10B981]/15 text-xs font-bold text-[#059669]">{initial}</span>
                      <ChevronDown className={cn("size-3.5 text-muted-foreground transition-transform", dropOpen && "rotate-180")} />
                    </button>
                    {avatarDropdown}
                  </div>
                </>
              ) : (
                <>
                  <Link href="/login" className="rounded-lg px-3 py-2 text-base font-medium text-muted-foreground transition-colors hover:text-foreground">تسجيل الدخول</Link>
                  <Link href="/register" className="inline-flex h-9 items-center rounded-lg bg-[#10B981] px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90">إنشاء حساب</Link>
                </>
              )}
            </div>
            <button className="inline-flex size-9 items-center justify-center rounded-lg border border-border text-foreground transition-colors hover:bg-secondary md:hidden" onClick={() => setMobileOpen((v) => !v)} aria-label="القائمة">
              {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
            </button>
          </div>
        </header>
      </div>
      )}

      {/* Shared mobile side nav */}
      <div
        className={cn(
          "fixed inset-0 z-60",
          "md:hidden",
          !mobileOpen && "pointer-events-none",
        )}
      >
        <div
          className={cn(
            "absolute inset-0 bg-black/45 transition-opacity duration-200",
            mobileOpen ? "opacity-100" : "opacity-0",
          )}
          onClick={() => setMobileOpen(false)}
        />
        <aside
          dir="rtl"
          className={cn(
            "absolute inset-y-0 flex flex-col bg-white transition-transform duration-200",
            "inset-s-0 w-full max-w-none border-e border-border",
            mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full shadow-none",
          )}
        >
          <div className="flex h-16 items-center justify-between border-b border-border px-4">
            <StudioLogo tone="default" href={null} size={36} />
            <button
              className="inline-flex size-9 items-center justify-center rounded-lg border border-border text-foreground"
              onClick={() => setMobileOpen(false)}
              aria-label="إغلاق القائمة"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="overflow-y-auto">{mobileMenuContent}</div>
        </aside>
      </div>
    </div>
  );
}
