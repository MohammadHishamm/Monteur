import type { PostJobForm } from "@/components/post-job/use-post-job-form";
import { BG, P } from "@/lib/design-tokens";
import { ArrowLeft, CheckCircle2, Sparkles } from "lucide-react";
import Link from "next/link";

export function PublishedScreen({ form }: { form: PostJobForm }) {
  const { title, resetForm } = form;
  return (
    <section style={{ background: BG.subtle }}>
      <div className="mx-auto flex max-w-2xl flex-col items-center px-5 py-24 text-center lg:py-32">
        <div
          className="relative flex size-20 items-center justify-center rounded-3xl"
          style={{ background: `${P.green}14`, border: `1px solid ${P.green}33` }}
        >
          <CheckCircle2 className="size-10" style={{ color: P.green }} />
        </div>
        <h1
          className="tracking-tight mt-8 text-3xl font-bold sm:text-4xl"
          style={{ color: P.text }}
        >
          تم نشر <span style={{ color: P.primaryText }}>بريفك</span> بنجاح
        </h1>
        <p className="mt-4 max-w-md text-base leading-relaxed" style={{ color: P.muted }}>
          يعمل المطابقة الذكية الآن على ترشيح أفضل المونتيرين المطابقين
          لبريف «{title.trim()}». ستصلك أفضل ٣ مطابقات خلال دقائق.
        </p>

        <div
          className="mt-8 flex w-full items-center gap-3 rounded-2xl bg-white p-4 text-start"
          style={{ border: `1px solid ${P.primary}26` }}
        >
          <span
            className="flex size-10 shrink-0 items-center justify-center rounded-xl"
            style={{ background: `${P.primary}14`, color: P.primary }}
          >
            <Sparkles className="size-5" />
          </span>
          <p className="text-sm leading-relaxed" style={{ color: P.muted }}>
            <span className="font-semibold" style={{ color: P.text }}>
              المطابقة الذكية قيد التشغيل.
            </span>{" "}
            سنخطرك فور جاهزية الترشيحات — يمكنك أيضاً تصفّح المونتيرين يدوياً الآن.
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/freelancers"
            className="group inline-flex h-12 items-center justify-center gap-2 rounded-full px-7 text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ background: P.primary, color: "#fff" }}
          >
            تصفّح المونتيرين الآن
            <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
          </Link>
          <Link
            href="/post-job"
            onClick={resetForm}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-7 text-sm font-semibold transition-all hover:-translate-y-0.5"
            style={{ border: `1px solid ${P.border}`, color: P.text }}
          >
            نشر بريف آخر
          </Link>
        </div>
      </div>
    </section>
  );
}
