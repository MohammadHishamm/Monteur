"use client";

import { BlobBackground, GlassStyles } from "@/components/auth/effects";
import { SocialButtons } from "@/components/auth/social-buttons";
import { P } from "@/components/auth/tokens";
import { StudioLogo } from "@/components/brand/studio-logo";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Eye,
  EyeOff,
  Loader,
  PartyPopper,
  Search,
  X
} from "lucide-react";
import {
  AnimatePresence,
  motion,
  type Transition,
  type Variants,
} from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, {
  Children,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState
} from "react";
import { useEmailSignupMutation } from "~/api/auth/mutations";

type Role = "client" | "freelancer";


// --- CONFETTI LOGIC ---
import type {
  GlobalOptions as ConfettiGlobalOptions,
  CreateTypes as ConfettiInstance,
  Options as ConfettiOptions,
} from "canvas-confetti";
import confetti from "canvas-confetti";

type Api = { fire: (options?: ConfettiOptions) => void };
export type ConfettiRef = Api | null;

const Confetti = forwardRef<
  ConfettiRef,
  React.ComponentPropsWithRef<"canvas"> & {
    options?: ConfettiOptions;
    globalOptions?: ConfettiGlobalOptions;
    manualstart?: boolean;
  }
>((props, ref) => {
  const {
    options,
    globalOptions = { resize: true, useWorker: true },
    manualstart = false,
    ...rest
  } = props;
  const instanceRef = useRef<ConfettiInstance | null>(null);
  const canvasRef = useCallback(
    (node: HTMLCanvasElement) => {
      if (node !== null) {
        if (instanceRef.current) return;
        instanceRef.current = confetti.create(node, {
          ...globalOptions,
          resize: true,
        });
      } else {
        if (instanceRef.current) {
          instanceRef.current.reset();
          instanceRef.current = null;
        }
      }
    },
    [globalOptions],
  );
  const fire = useCallback(
    (opts = {}) => instanceRef.current?.({ ...options, ...opts }),
    [options],
  );
  const api = useMemo(() => ({ fire }), [fire]);
  useImperativeHandle(ref, () => api, [api]);
  useEffect(() => {
    if (!manualstart) fire();
  }, [manualstart, fire]);
  return <canvas ref={canvasRef} {...rest} />;
});
Confetti.displayName = "Confetti";

// --- TEXT LOOP ANIMATION COMPONENT ---
type TextLoopProps = {
  children: React.ReactNode[];
  className?: string;
  interval?: number;
  transition?: Transition;
  variants?: Variants;
  onIndexChange?: (index: number) => void;
  stopOnEnd?: boolean;
};
export function TextLoop({
  children,
  className,
  interval = 2,
  transition = { duration: 0.3 },
  variants,
  onIndexChange,
  stopOnEnd = false,
}: TextLoopProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const items = Children.toArray(children);
  useEffect(() => {
    const intervalMs = interval * 1000;
    const timer = setInterval(() => {
      setCurrentIndex((current) => {
        if (stopOnEnd && current === items.length - 1) {
          clearInterval(timer);
          return current;
        }
        const next = (current + 1) % items.length;
        onIndexChange?.(next);
        return next;
      });
    }, intervalMs);
    return () => clearInterval(timer);
  }, [items.length, interval, onIndexChange, stopOnEnd]);
  const motionVariants: Variants = {
    initial: { y: 20, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: -20, opacity: 0 },
  };
  return (
    <div className={cn("relative inline-block whitespace-nowrap", className)}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={currentIndex}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={transition}
          variants={variants || motionVariants}
        >
          {items[currentIndex]}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// --- GLASS BUTTON COMPONENT ---
const glassButtonVariants = cva(
  "relative isolate cursor-pointer rounded-full transition-all",
  {
    variants: {
      size: {
        default: "text-base font-medium",
        sm: "text-sm font-medium",
        lg: "text-lg font-medium",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { size: "default" },
  },
);
const glassButtonTextVariants = cva(
  "glass-button-text relative block select-none tracking-tight",
  {
    variants: {
      size: {
        default: "px-6 py-3.5",
        sm: "px-4 py-2",
        lg: "px-8 py-4",
        icon: "flex h-10 w-10 items-center justify-center",
      },
    },
    defaultVariants: { size: "default" },
  },
);
export interface GlassButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof glassButtonVariants> {
  contentClassName?: string;
}
const GlassButton = React.forwardRef<HTMLButtonElement, GlassButtonProps>(
  ({ className, children, size, contentClassName, onClick, ...props }, ref) => {
    const handleWrapperClick = (e: React.MouseEvent<HTMLDivElement>) => {
      const button = e.currentTarget.querySelector("button");
      if (button && e.target !== button) button.click();
    };
    return (
      <div
        className={cn(
          "glass-button-wrap cursor-pointer rounded-full relative",
          className,
        )}
        onClick={handleWrapperClick}
      >
        <button
          className={cn("glass-button relative z-10", glassButtonVariants({ size }))}
          ref={ref}
          onClick={onClick}
          {...props}
        >
          <span className={cn(glassButtonTextVariants({ size }), contentClassName)}>
            {children}
          </span>
        </button>
        <div className="glass-button-shadow rounded-full pointer-events-none"></div>
      </div>
    );
  },
);
GlassButton.displayName = "GlassButton";

const modalSteps = [
  { message: "جارٍ إنشاء حسابك...", icon: <Loader className="w-12 h-12 animate-spin" style={{ color: P.accent }} /> },
  { message: "نُجهّز حسابك...", icon: <Loader className="w-12 h-12 animate-spin" style={{ color: P.emerald }} /> },
  { message: "اللمسات الأخيرة...", icon: <Loader className="w-12 h-12 animate-spin" style={{ color: P.mint }} /> },
  { message: "مرحباً بك في مونتير!", icon: <PartyPopper className="w-12 h-12" style={{ color: P.green }} /> },
];
const TEXT_LOOP_INTERVAL = 1.5;

// --- ROLE TOGGLE (عميل / مستقل) ---
const roleOptions: { id: Role; label: string; icon: React.ElementType }[] = [
  { id: "client", label: "عميل", icon: Search },
  { id: "freelancer", label: "مستقل", icon: Briefcase },
];
const RoleToggle = ({
  role,
  onChange,
}: {
  role: Role;
  onChange: (r: Role) => void;
}) => (
  <div
    className="relative inline-flex rounded-full p-1"
    style={{ background: `${P.navy}0A`, border: `1px solid ${P.border}` }}
  >
    {roleOptions.map((r) => {
      const active = role === r.id;
      const Icon = r.icon;
      return (
        <button
          key={r.id}
          type="button"
          onClick={() => onChange(r.id)}
          className="relative z-10 inline-flex items-center gap-2 rounded-full px-6 py-2 text-sm font-semibold transition-colors"
          style={{ color: active ? P.navy : P.muted }}
        >
          {active && (
            <motion.span
              layoutId="role-pill"
              className="absolute inset-0 -z-10 rounded-full"
              style={{ background: P.accent }}
              transition={{ type: "spring", stiffness: 400, damping: 32 }}
            />
          )}
          <Icon className="size-4" />
          {r.label}
        </button>
      );
    })}
  </div>
);

// --- MAIN COMPONENT ---
export const SignUp = () => {
  const router = useRouter();
  const signupMutation = useEmailSignupMutation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [role, setRole] = useState<Role>("client");
  const [authStep, setAuthStep] = useState("roleSelect");
  const [modalStatus, setModalStatus] = useState<
    "closed" | "loading" | "error" | "success"
  >("closed");
  const [modalErrorMessage, setModalErrorMessage] = useState("");
  const confettiRef = useRef<ConfettiRef>(null);

  const isNameValid = name.trim().length >= 2;
  const isEmailValid = /\S+@\S+\.\S+/.test(email);
  const isPasswordValid = password.length >= 6;
  const isConfirmPasswordValid = confirmPassword.length >= 6;

  const nameInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const confirmPasswordInputRef = useRef<HTMLInputElement>(null);

  const fireSideCanons = () => {
    const fire = confettiRef.current?.fire;
    if (fire) {
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };
      const particleCount = 50;
      const colors = [P.accent, P.emerald, P.mint, P.green];
      fire({ ...defaults, particleCount, colors, origin: { x: 0, y: 1 }, angle: 60 });
      fire({ ...defaults, particleCount, colors, origin: { x: 1, y: 1 }, angle: 120 });
    }
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modalStatus !== "closed" || authStep !== "form") return;

    if (password !== confirmPassword) {
      setModalErrorMessage("كلمتا المرور غير متطابقتين!");
      setModalStatus("error");
      return;
    }

    setModalStatus("loading");

    try {
      await signupMutation.mutateAsync({
        email,
        password,
        first_name: name.trim(),
        user_type: role,
      });
      // Backend sets all cookies (session ID, user-role, verification-status).
      // New users always start un-onboarded so the middleware routes them to /onboarding.
    } catch (err: unknown) {

      return;
    }

    // Success — show confetti then redirect to onboarding
    const loadingStepsCount = modalSteps.length - 1;
    const totalDuration = loadingStepsCount * TEXT_LOOP_INTERVAL * 1000;
    setTimeout(() => {
      fireSideCanons();
      setModalStatus("success");
    }, totalDuration);
  };

  const handleProgressStep = () => {
    if (authStep === "email") {
      if (isEmailValid) setAuthStep("password");
    } else if (authStep === "password") {
      if (isNameValid && isPasswordValid) setAuthStep("confirmPassword");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleProgressStep();
    }
  };

  const handleGoBack = () => {
    if (authStep === "form") setAuthStep("roleSelect");
  };

  const closeModal = () => {
    setModalStatus("closed");
    setModalErrorMessage("");
  };

  useEffect(() => {
    if (authStep === "password")
      setTimeout(() => nameInputRef.current?.focus(), 500);
    else if (authStep === "confirmPassword")
      setTimeout(() => confirmPasswordInputRef.current?.focus(), 500);
  }, [authStep]);

  useEffect(() => {
    if (modalStatus === "success") fireSideCanons();
  }, [modalStatus]);

  const Modal = () => (
    <AnimatePresence>
      {modalStatus !== "closed" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative flex w-full max-w-sm flex-col items-center gap-4 rounded-3xl border bg-card/90 p-8 mx-2 backdrop-blur-md"
            style={{ borderColor: `${P.accent}30`, boxShadow: `0 0 60px ${P.emerald}20` }}
          >
            {(modalStatus === "error" || modalStatus === "success") && (
              <button
                onClick={closeModal}
                className="absolute top-3 end-3 p-1 text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            )}
            {modalStatus === "error" && (
              <>
                <AlertCircle className="w-12 h-12" style={{ color: "#DC2626" }} />
                <p className="text-lg font-bold text-foreground">{modalErrorMessage}</p>
                <button
                  onClick={closeModal}
                  className="mt-2 inline-flex h-10 items-center rounded-xl px-5 text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
                  style={{ background: P.emerald, color: "#fff" }}
                >
                  حاول مجدداً
                </button>
              </>
            )}
            {modalStatus === "loading" && (
              <TextLoop interval={TEXT_LOOP_INTERVAL} stopOnEnd={true}>
                {modalSteps.slice(0, -1).map((step, i) => (
                  <div key={i} className="flex flex-col items-center gap-4">
                    {step.icon}
                    <p className="text-lg font-bold text-foreground">{step.message}</p>
                  </div>
                ))}
              </TextLoop>
            )}
            {modalStatus === "success" && (
              <div className="flex flex-col items-center gap-4">
                {modalSteps[modalSteps.length - 1].icon}
                <p className="text-lg font-bold text-foreground">
                  {modalSteps[modalSteps.length - 1].message}
                </p>
                <button
                  onClick={() => router.push(`/onboarding/${role}`)}
                  className="mt-2 inline-flex h-11 items-center gap-2 rounded-xl px-6 text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
                  style={{ background: P.emerald, color: "#fff" }}
                >
                  ابدأ الآن
                  <ArrowLeft className="size-4" />
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div dir="rtl" className="flex min-h-screen w-full bg-background">
      <GlassStyles />

      <Confetti
        ref={confettiRef}
        manualstart
        className="fixed top-0 left-0 w-full h-full pointer-events-none z-[999]"
      />
      <Modal />

      {/* ── FORM COLUMN ── */}
      <div className="relative flex w-full flex-col overflow-hidden">
        <div className="absolute inset-0 z-0">
          <BlobBackground />
        </div>

        {/* Top bar */}
        <div className="relative z-20 flex items-center justify-between px-6 py-5 lg:px-10">
          <StudioLogo size={52} />
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            الرئيسية
            <ArrowLeft className="size-4" />
          </Link>
        </div>

        <div className="relative z-10 flex flex-1 items-center justify-center px-6 pb-12">
        <fieldset
          disabled={modalStatus !== "closed"}
          className="mx-auto flex w-full flex-col items-center gap-8 p-4"
        >
          <AnimatePresence mode="wait">
            {authStep === "roleSelect" && (
              <motion.div
                key="role-select"
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -10, opacity: 0 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="mx-auto flex w-full max-w-xl flex-col items-center gap-8"
              >
                <div className="text-center">
                  <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                    مرحباً بك في <span style={{ color: P.accent }}>مونتير</span>
                  </h1>
                  <p className="mt-3 text-base text-muted-foreground">ما الذي يصفك؟</p>
                </div>
                <div className="grid w-full grid-cols-2 gap-5">
                  {/* Client card */}
                  <button
                    type="button"
                    onClick={() => { setRole("client"); setAuthStep("form"); }}
                    className="group flex flex-col items-center gap-4 rounded-2xl border-2 border-transparent bg-white p-6 shadow-sm transition-all hover:border-[#22c55e] hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#22c55e]"
                  >
                    <div
                      className="flex h-32 w-full items-center justify-center rounded-xl"
                      style={{ background: "linear-gradient(135deg, #dcfce7 0%, #bbf7d0 60%, #d1fae5 100%)" }}
                    >
                      <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="32" cy="20" r="10" stroke="#166534" strokeWidth="2.5" fill="none"/>
                        <path d="M14 52c0-9.94 8.06-18 18-18s18 8.06 18 18" stroke="#166534" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
                        <rect x="36" y="36" width="16" height="12" rx="3" stroke="#166534" strokeWidth="2" fill="none"/>
                        <path d="M39 36v-2a4 4 0 0 1 8 0v2" stroke="#166534" strokeWidth="2" strokeLinecap="round" fill="none"/>
                      </svg>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold text-foreground">عميل ←</p>
                      <p className="mt-1 text-sm text-muted-foreground">انشر وظائف ووظّف</p>
                    </div>
                  </button>
                  {/* Freelancer card */}
                  <button
                    type="button"
                    onClick={() => { setRole("freelancer"); setAuthStep("form"); }}
                    className="group flex flex-col items-center gap-4 rounded-2xl border-2 border-transparent bg-white p-6 shadow-sm transition-all hover:border-[#22c55e] hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#22c55e]"
                  >
                    <div
                      className="flex h-32 w-full items-center justify-center rounded-xl"
                      style={{ background: "linear-gradient(135deg, #dcfce7 0%, #d1fae5 60%, #ecfdf5 100%)" }}
                    >
                      <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="30" cy="20" r="10" stroke="#166534" strokeWidth="2.5" fill="none"/>
                        <path d="M12 52c0-9.94 8.06-18 18-18s18 8.06 18 18" stroke="#166534" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
                        <rect x="34" y="34" width="20" height="14" rx="3" stroke="#166534" strokeWidth="2" fill="none"/>
                        <circle cx="44" cy="29" r="3" stroke="#166534" strokeWidth="2" fill="none"/>
                      </svg>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold text-foreground">مونتير ←</p>
                      <p className="mt-1 text-sm text-muted-foreground">اعمل واكسب</p>
                    </div>
                  </button>
                </div>
                <p className="text-base text-muted-foreground">
                  لديك حساب؟{" "}
                  <Link href="/login" className="font-semibold transition-opacity hover:opacity-80" style={{ color: P.accent }}>
                    تسجيل الدخول
                  </Link>
                </p>
              </motion.div>
            )}
            {authStep === "form" && (
              <motion.div
                key="form-content"
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="mx-auto flex w-full max-w-md flex-col items-center gap-8"
              >
                {/* Title */}
                <div className="w-full text-center">
                  <h1 className="text-4xl font-bold tracking-tight text-foreground">
                    {role === "client"
                      ? <>سجّل <span style={{ color: P.accent }}>للتوظيف</span></>
                      : <>سجّل <span style={{ color: P.accent }}>للعمل</span></>}
                  </h1>
                  <p className="mt-2 text-base text-muted-foreground">
                    {role === "client" ? "وظّف أفضل المونتيرين بسرعة" : "ابدأ مسيرتك المهنية في المونتاج"}
                  </p>
                </div>

                {/* Social buttons */}
                <SocialButtons verb="التسجيل" />

                {/* Divider */}
                <div className="flex w-full items-center gap-3">
                  <hr className="flex-1 border-border" />
                  <span className="text-sm font-medium text-muted-foreground">أو</span>
                  <hr className="flex-1 border-border" />
                </div>

                {/* Form */}
                <form onSubmit={handleFinalSubmit} className="flex w-full flex-col gap-5">
                  {/* Name */}
                  <div className="flex flex-col gap-2">
                    <label className="text-base font-medium text-foreground">الاسم الكامل</label>
                    <input
                      ref={nameInputRef}
                      type="text"
                      placeholder="أدخل اسمك"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="h-12 w-full rounded-xl border border-border bg-background px-4 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#22c55e]/40"
                    />
                  </div>

                  {/* Email */}
                  <div className="flex flex-col gap-2">
                    <label className="text-base font-medium text-foreground">البريد الإلكتروني</label>
                    <input
                      type="email"
                      placeholder="example@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-12 w-full rounded-xl border border-border bg-background px-4 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#22c55e]/40"
                    />
                  </div>

                  {/* Password */}
                  <div className="flex flex-col gap-2">
                    <label className="text-base font-medium text-foreground">كلمة المرور</label>
                    <div className="relative">
                      <input
                        ref={passwordInputRef}
                        type={showPassword ? "text" : "password"}
                        placeholder="٦ أحرف على الأقل"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="h-12 w-full rounded-xl border border-border bg-background px-4 pe-12 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#22c55e]/40"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 end-3 flex items-center text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div className="flex flex-col gap-2">
                    <label className="text-base font-medium text-foreground">تأكيد كلمة المرور</label>
                    <div className="relative">
                      <input
                        ref={confirmPasswordInputRef}
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="أعد كتابة كلمة المرور"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className="h-12 w-full rounded-xl border border-border bg-background px-4 pe-12 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#22c55e]/40"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 end-3 flex items-center text-muted-foreground hover:text-foreground"
                      >
                        {showConfirmPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={!isNameValid || !isEmailValid || !isPasswordValid || !isConfirmPasswordValid}
                    className="mt-1 h-12 w-full rounded-xl text-base font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                    style={{ background: P.accent }}
                  >
                    إنشاء الحساب
                  </button>
                </form>

                {/* Back + sign-in */}
                <div className="flex w-full flex-col items-center gap-3">
                  <button
                    type="button"
                    onClick={handleGoBack}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <ArrowRight className="size-4" /> تغيير الدور
                  </button>
                  <p className="text-base text-muted-foreground">
                    لديك حساب؟{" "}
                    <Link href="/login" className="font-semibold transition-opacity hover:opacity-80" style={{ color: P.accent }}>
                      تسجيل الدخول
                    </Link>
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </fieldset>
        </div>
      </div>

    </div>
  );
};

