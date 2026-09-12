"use client";

import { getAuthUserOptions } from "@/api/user/queries";
import { submitVerification, uploadVerificationDoc } from "@/api/verification/mutations";
import { OnboardingChrome } from "@/components/onboarding/ui";
import { P } from "@/lib/design-tokens";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Clock, ImagePlus, Loader2, ShieldCheck, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Camera } from "lucide-react";
import Webcam from "react-webcam";

function DocUpload({
  value,
  onChange,
  label,
  hint,
}: {
  value: string;
  onChange: (url: string) => void;
  label: string;
  hint: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const webcamRef = useRef<Webcam>(null);
  const [uploading, setUploading] = useState(false);
  const [mode, setMode] = useState<"idle" | "camera">("idle");

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const url = await uploadVerificationDoc(file);
      onChange(url);
    } catch {
      onChange(URL.createObjectURL(file));
    } finally {
      setUploading(false);
      setMode("idle");
    }
  }

  // Convert base64 from react-webcam to File object
  async function handleCapture() {
    if (!webcamRef.current) return;
    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) return;

    setUploading(true);
    try {
      const res = await fetch(imageSrc);
      const blob = await res.blob();
      const file = new File([blob], "webcam-capture.jpg", { type: "image/jpeg" });
      await handleFile(file);
    } catch {
      setUploading(false);
      setMode("idle");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <span className="text-sm font-semibold text-foreground">{label}</span>
        <span className="text-xs text-muted-foreground">{hint}</span>
      </div>

      <div
        className="relative flex aspect-video w-full flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed bg-background transition-colors hover:bg-muted/50"
        style={{ borderColor: P.border }}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">جاري الرفع...</span>
          </div>
        ) : mode === "camera" ? (
          <div className="relative size-full bg-black">
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              videoConstraints={{ facingMode: "environment" }}
              className="size-full object-cover"
            />
            <div className="absolute inset-x-0 bottom-4 flex justify-center gap-4">
              <button
                type="button"
                onClick={() => setMode("idle")}
                className="rounded-full bg-black/50 px-4 py-2 text-sm font-medium text-white backdrop-blur-md hover:bg-black/70"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleCapture}
                className="rounded-full px-6 py-2 text-sm font-bold text-white shadow-lg"
                style={{ background: P.primary }}
              >
                التقاط الصورة
              </button>
            </div>
          </div>
        ) : value ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt={label} className="size-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center gap-3 bg-black/40 opacity-0 transition-opacity hover:opacity-100">
              <button
                type="button"
                onClick={() => setMode("camera")}
                className="rounded-lg bg-white/20 px-4 py-2 text-sm font-semibold text-white backdrop-blur-md hover:bg-white/30"
              >
                التقاط صورة
              </button>
              <button
                type="button"
                onClick={() => ref.current?.click()}
                className="rounded-lg bg-white/20 px-4 py-2 text-sm font-semibold text-white backdrop-blur-md hover:bg-white/30"
              >
                رفع ملف
              </button>
            </div>
            <button
              type="button"
              onClick={() => onChange("")}
              className="absolute end-2 top-2 grid size-7 place-items-center rounded-full bg-black/50 text-white backdrop-blur-md transition-colors hover:bg-black/70"
            >
              <X className="size-4" />
            </button>
          </>
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-4 p-4">
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setMode("camera")}
                className="flex flex-col items-center gap-2 rounded-xl border p-4 transition-colors hover:bg-muted"
                style={{ borderColor: P.border }}
              >
                <div className="grid size-12 place-items-center rounded-full" style={{ background: `${P.primary}1A`, color: P.primary }}>
                  <Camera className="size-5" />
                </div>
                <span className="text-sm font-medium text-foreground">التقاط صورة</span>
              </button>
              <button
                type="button"
                onClick={() => ref.current?.click()}
                className="flex flex-col items-center gap-2 rounded-xl border p-4 transition-colors hover:bg-muted"
                style={{ borderColor: P.border }}
              >
                <div className="grid size-12 place-items-center rounded-full" style={{ background: `${P.primary}1A`, color: P.primary }}>
                  <ImagePlus className="size-5" />
                </div>
                <span className="text-sm font-medium text-foreground">رفع ملف</span>
              </button>
            </div>
          </div>
        )}
      </div>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

export default function VerifyPage() {
  const router = useRouter();
  const { data: userRes, isLoading, refetch } = useQuery(getAuthUserOptions());
  const user = userRes?.data;
  
  const [step, setStep] = useState(1);
  const [idFrontUrl, setIdFrontUrl] = useState("");
  const [idBackUrl, setIdBackUrl] = useState("");
  const [selfieUrl, setSelfieUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return null;

  const status = user.verification_status ?? "unverified";

  // Already pending?
  if (status === "pending") {
    return (
      <div dir="rtl" className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="flex max-w-md flex-col items-center text-center">
          <div className="mb-6 grid size-20 place-items-center rounded-full" style={{ background: `${P.star}1A`, color: P.star }}>
            <Clock className="size-10" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">جاري مراجعة هويتك</h1>
          <p className="mt-2 text-base text-muted-foreground">
            لقد استلمنا مستنداتك وهي الآن قيد المراجعة من قبل فريقنا. سنقوم بإبلاغك فور الانتهاء من التحقق، عادة ما يستغرق ذلك بضع ساعات.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4">
            <button
              onClick={() => {
                // Re-fetch to see if status updated
                refetch().then((res) => {
                  if (res.data?.data?.verification_status === "verified") {
                    router.push(user.user_type === "freelancer" ? "/freelancer" : "/client");
                  }
                });
              }}
              className="inline-flex h-11 items-center justify-center rounded-xl px-6 text-sm font-semibold transition-colors hover:bg-muted"
              style={{ border: `1px solid ${P.border}`, color: P.text }}
            >
              تحديث الحالة
            </button>
            <button
              onClick={() => router.push("/")}
              className="text-sm font-medium transition-colors hover:opacity-80"
              style={{ color: P.primary }}
            >
              تصفح المنصة (الصفحة الرئيسية)
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Already verified?
  if (status === "verified") {
    return (
      <div dir="rtl" className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="flex max-w-md flex-col items-center text-center">
          <div className="mb-6 grid size-20 place-items-center rounded-full bg-green-100 text-green-600">
            <CheckCircle2 className="size-10" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">تم التحقق بنجاح!</h1>
          <div className="mt-8 flex flex-col items-center gap-4">
            <button
              onClick={() => router.push(user.user_type === "freelancer" ? "/freelancer" : "/client")}
              className="inline-flex h-11 items-center justify-center rounded-xl px-6 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: P.green }}
            >
              الذهاب إلى لوحة التحكم
            </button>
            <button
              onClick={() => router.push("/")}
              className="text-sm font-medium transition-colors hover:opacity-80"
              style={{ color: P.primary }}
            >
              تصفح المنصة
            </button>
          </div>
        </div>
      </div>
    );
  }

  const canNext =
    step === 1 ? !!idFrontUrl : step === 2 ? !!idBackUrl : !!selfieUrl;

  async function handleFinish() {
    setBusy(true);
    setError("");
    try {
      await submitVerification({
        id_front_url: idFrontUrl,
        id_back_url: idBackUrl,
        selfie_url: selfieUrl,
      });
      // Refresh the query cache
      await refetch();
    } catch (err: unknown) {
      setError("حدث خطأ أثناء إرسال المستندات. يرجى المحاولة مرة أخرى.");
      setBusy(false);
    }
  }

  return (
    <OnboardingChrome
      step={step}
      total={3}
      eyebrow="التحقق من الهوية"
      title={
        step === 1
          ? "صورة الهوية (الوجه الأمامي)"
          : step === 2
          ? "صورة الهوية (الوجه الخلفي)"
          : "صورة السيلفي"
      }
      subtitle="نحتاج إلى التحقق من هويتك لضمان بيئة عمل آمنة وموثوقة لجميع المستخدمين."
      onBack={step > 1 ? () => setStep(step - 1) : undefined}
      onNext={() => {
        if (step < 3) setStep(step + 1);
        else handleFinish();
      }}
      nextLabel={step === 3 ? "إرسال للمراجعة" : "التالي"}
      nextDisabled={!canNext}
      busy={busy}
      onSkip={() => router.push("/")}
      exitHref="/"
    >
      <div className="flex flex-col gap-6">
        {status === "rejected" && (
          <div className="flex items-start gap-3 rounded-xl bg-red-50 p-4 text-red-700 dark:bg-red-950/50 dark:text-red-400">
            <AlertCircle className="mt-0.5 size-5 shrink-0" />
            <div className="flex flex-col gap-1">
              <span className="text-sm font-bold">تم رفض التحقق السابق</span>
              <span className="text-sm leading-relaxed">السبب: {user.rejection_reason ?? "لم يتم توضيح السبب"}</span>
              <span className="text-xs font-medium">يرجى رفع المستندات مرة أخرى بشكل أوضح.</span>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-red-50 p-3 text-center text-sm font-semibold text-red-600">
            {error}
          </div>
        )}

        {step === 1 && (
          <DocUpload
            label="الوجه الأمامي للهوية"
            hint="يجب أن تكون الصورة واضحة، الإضاءة جيدة، وكافة البيانات مقروءة بوضوح."
            value={idFrontUrl}
            onChange={setIdFrontUrl}
          />
        )}
        {step === 2 && (
          <DocUpload
            label="الوجه الخلفي للهوية"
            hint="تأكد من عدم وجود انعكاسات ضوئية تخفي أي معلومات هامة."
            value={idBackUrl}
            onChange={setIdBackUrl}
          />
        )}
        {step === 3 && (
          <DocUpload
            label="سيلفي مع الهوية"
            hint="التقط صورة سيلفي ووجهك واضح، مع حملك للهوية بجوار وجهك دون إخفاء ملامحك أو بيانات الهوية."
            value={selfieUrl}
            onChange={setSelfieUrl}
          />
        )}

        <div className="mt-4 flex items-start gap-3 rounded-xl p-4" style={{ background: `${P.green}10`, border: `1px solid ${P.green}30` }}>
          <ShieldCheck className="mt-0.5 size-5 shrink-0" style={{ color: P.green }} />
          <p className="text-sm leading-relaxed" style={{ color: P.text }}>
            <strong>معلوماتك في أمان.</strong> يتم استخدام هذه المستندات لغرض التحقق من الهوية فقط ولا تتم مشاركتها مع أي طرف ثالث أو مستخدمين آخرين على المنصة.
          </p>
        </div>
      </div>
    </OnboardingChrome>
  );
}
