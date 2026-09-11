import { StudioLogo } from "@/components/brand/studio-logo";
import Link from "next/link";

const columns = [
  {
    title: "المنصة",
    links: [
      { label: "تصفّح المونتيرين", href: "/video-editors" },
      { label: "كيف يعمل", href: "/how-it-works" },
      { label: "الأسعار", href: "/pricing" },
      { label: "ابدأ مشروع", href: "/jobs/new" },
    ],
  },
  {
    title: "للمونتيرين",
    links: [
      { label: "انضم كمونتير", href: "/register" },
      { label: "اعرض الشو-ريل", href: "/register" },
      { label: "نظام المستويات", href: "/how-it-works" },
      { label: "المدفوعات", href: "/pricing" },
    ],
  },
  {
    title: "قانوني",
    links: [
      { label: "الشروط والأحكام", href: "#" },
      { label: "سياسة الخصوصية", href: "#" },
      { label: "سياسة الضمان (Escrow)", href: "/pricing" },
    ],
  },
];

export function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-background-subtle">
      <div className="mx-auto max-w-6xl px-5 py-14 lg:px-8">
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 lg:grid-cols-5">
          <div className="col-span-2 flex flex-col gap-4 lg:col-span-2">
            <StudioLogo />
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
              سوق مونتاج الفيديو المدعوم بالذكاء الاصطناعي لمنطقة الشرق الأوسط
              وشمال أفريقيا. صف الفيديو اللي محتاجه، ونطابقك مع أفضل مونتير — بدفع
              مضمون وشو-ريل موثّق.
            </p>
          </div>

          {columns.map((col) => (
            <div key={col.title} className="flex flex-col gap-3">
              <h4 className="font-tech text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {col.title}
              </h4>
              <ul className="flex flex-col gap-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-border pt-6 sm:flex-row sm:items-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} مونتير · صُنع لمنطقة الشرق الأوسط وشمال
            أفريقيا.
          </p>
          <p className="font-tech text-xs text-muted-foreground">
            عربي · English
          </p>
        </div>
      </div>
    </footer>
  );
}
