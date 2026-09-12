import { CATEGORY_LABELS, type Category } from "@/components/freelancers/types";
import { Field, inputBase, inputStyle, Select, StepIntro } from "@/components/post-job/form-controls";
import type { PostJobForm } from "@/components/post-job/use-post-job-form";
import { toArabicDigits } from "@/lib/format";

export function StepBasics({ form }: { form: PostJobForm }) {
  const { title, setTitle, category, setCategory } = form;
  return (
    <div className="flex flex-col gap-6">
      <StepIntro
        title="ابدأ بالأساسيات"
        subtitle="عنوان واضح وتخصيص دقيق يجذبان أفضل المونتيرين."
      />
      <Field label="عنوان الوظيفة" hint={`${toArabicDigits(title.length)}/٨٠`}>
        <input
          value={title}
          maxLength={80}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="مثال: مونتاج إعلان قصير لمتجر أزياء"
          className={inputBase}
          style={inputStyle()}
        />
      </Field>
      <Field label="نوع المونتاج">
        <Select
          value={category}
          onChange={(v) => setCategory(v as Category | "")}
          placeholder="اختر نوع المونتاج"
          options={Object.entries(CATEGORY_LABELS).map(([value, label]) => ({
            value,
            label,
          }))}
        />
      </Field>
    </div>
  );
}
