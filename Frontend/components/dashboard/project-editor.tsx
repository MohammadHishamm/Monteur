"use client";

/**
 * Shared portfolio project editor — the collapsible case-study form used in
 * BOTH the freelancer profile editor (`/dashboard/freelancer/profile`) and the
 * freelancer onboarding portfolio step, so they stay identical.
 *
 * Operates on `EditableProject`. Image uploads are local object URLs during
 * development; swap for a real upload in `ImagesField` when the API is wired.
 */
import { CATEGORY_LABELS, type Category } from "@/components/freelancers/types";
import { axios } from "@/lib/api/axios";
import { BG, P } from "@/lib/design-tokens";
import {
    ChevronUp,
    ExternalLink,
    GripVertical,
    ImagePlus,
    Pencil,
    Trash2,
    Video,
    X,
} from "lucide-react";
import React, { useRef } from "react";
import type { EditableProject } from "~/components/dashboard/profile-editor-types";

const CATEGORIES = Object.keys(CATEGORY_LABELS) as Category[];

const inputCls =
  "w-full border border-[#E2E8F0] bg-white px-3.5 py-2.5 text-sm text-[#0F172A] outline-none transition-colors placeholder:text-[#94A3B8] focus:border-[#D97706]";

/** Build a blank project with an auto-assigned accent color. */
export function newEditableProject(
  category: Category,
  index = 0,
): EditableProject {
  return {
    id: `new-${Date.now()}`,
    title: "",
    summary: "",
    category,
    year: "٢٠٢٥",
    duration: "",
    liveUrl: "",
    description: "",
    images: [],
    videoUrl: "",
  };
}

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold" style={{ color: P.text }}>
        {label}
      </span>
      {children}
      {hint && (
        <span className="text-xs" style={{ color: P.muted }}>
          {hint}
        </span>
      )}
    </label>
  );
}

async function uploadImageFile(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await axios.post<{ data?: { url?: string } }>("/upload", form);
  const url = res.data?.data?.url;
  if (!url) throw new Error("فشل رفع الصورة");
  return url;
}

async function uploadVideoFile(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await axios.post<{ data?: { url?: string } }>("/upload/video", form);
  const url = res.data?.data?.url;
  if (!url) throw new Error("فشل رفع الفيديو");
  return url;
}

/** Single-video upload field. */
function VideoField({
  videoUrl,
  onChange,
}: {
  videoUrl: string;
  onChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState("");

  async function handleFile(files: FileList | null) {
    if (!files?.length) return;
    const file = files[0];
    setError("");
    setUploading(true);
    try {
      const url = await uploadVideoFile(file);
      onChange(url);
    } catch {
      setError("تعذّر رفع الفيديو — تأكد من الصيغة (MP4) والحجم (أقل من ٣٠٠MB).");
    } finally {
      setUploading(false);
    }
  }

  if (videoUrl) {
    return (
      <div className="flex flex-col gap-2">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          src={videoUrl}
          controls
          className="w-full rounded-lg"
          style={{ maxHeight: 200, background: "#000" }}
        />
        <button
          type="button"
          onClick={() => onChange("")}
          className="inline-flex items-center gap-1.5 self-start text-xs transition-opacity hover:opacity-70"
          style={{ color: P.muted }}
        >
          <X className="size-3.5" />
          إزالة الفيديو
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="flex w-full flex-col items-center justify-center gap-2 px-4 py-8 text-sm transition-colors hover:bg-black/2 disabled:cursor-not-allowed disabled:opacity-60"
        style={{ border: `1px dashed ${P.border}`, color: P.muted }}
      >
        <Video className="size-6" style={{ color: P.primary }} />
        <span>{uploading ? "جاري رفع الفيديو…" : "اضغط لرفع الفيديو"}</span>
        <span className="text-xs">MP4 حتى ٣٠٠MB · يُعرض عند الضغط على الصورة المصغّرة</span>
      </button>
      {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/webm"
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}

/** Single-image thumbnail upload field. */
function ThumbnailField({
  image,
  onChange,
}: {
  image: string;
  onChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);

  async function handleFile(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      const url = await uploadImageFile(files[0]);
      onChange(url);
    } catch {
      onChange(URL.createObjectURL(files[0]));
    } finally {
      setUploading(false);
    }
  }

  if (image) {
    return (
      <div className="flex flex-col gap-2">
        <div
          className="group relative aspect-video w-full overflow-hidden"
          style={{ border: `1px solid ${P.border}` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="thumbnail" className="size-full object-cover" />
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label="حذف الصورة"
            className="absolute inset-e-1 top-1 grid size-6 place-items-center rounded-full text-white opacity-0 transition-opacity group-hover:opacity-100"
            style={{ background: "rgba(15,23,42,0.7)" }}
          >
            <X className="size-3.5" />
          </button>
        </div>
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="self-start text-xs transition-opacity hover:opacity-70 disabled:opacity-40"
          style={{ color: P.primaryText }}
        >
          {uploading ? "جاري الرفع…" : "استبدال الصورة"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            handleFile(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="flex w-full flex-col items-center justify-center gap-2 px-4 py-8 text-sm transition-colors hover:bg-black/2 disabled:cursor-not-allowed disabled:opacity-60"
        style={{ border: `1px dashed ${P.border}`, color: P.muted }}
      >
        <ImagePlus className="size-6" style={{ color: P.primary }} />
        <span>{uploading ? "جاري الرفع…" : "اضغط لرفع الصورة المصغّرة"}</span>
        <span className="text-xs">PNG أو JPG حتى ١٠MB</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}

export function ProjectEditor({
  project: p,
  open,
  onToggle,
  onChange,
  onRemove,
}: {
  project: EditableProject;
  open: boolean;
  onToggle: () => void;
  onChange: (next: EditableProject) => void;
  onRemove: () => void;
}) {
  const isNew = p.id.startsWith("new-");

  return (
    <div style={{ border: `1px solid ${P.border}` }}>
      {/* header row */}
      <div
        className="flex items-center gap-3 p-4"
        style={{ background: open ? `${P.primary}08` : BG.main }}
      >
        <GripVertical className="size-4 shrink-0" style={{ color: P.border }} />
        <span
          className="size-3 shrink-0 rounded-full"
          style={{ background: P.primary }}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold" style={{ color: P.text }}>
            {p.title || "مشروع بلا عنوان"}
          </p>
          <p className="truncate text-xs" style={{ color: P.muted }}>
            {p.summary || (isNew ? "مشروع جديد — أضف التفاصيل" : "—")}
          </p>
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label="حذف المشروع"
          className="grid size-9 shrink-0 place-items-center transition-colors hover:bg-black/5"
          style={{ color: P.muted }}
        >
          <Trash2 className="size-4" />
        </button>
        <button
          type="button"
          onClick={onToggle}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition-colors hover:bg-black/5"
          style={{ border: `1px solid ${P.border}`, color: P.text }}
        >
          {open ? (
            <>
              <ChevronUp className="size-4" />
              طيّ
            </>
          ) : (
            <>
              <Pencil className="size-3.5" />
              تعديل
            </>
          )}
        </button>
      </div>

      {/* expanded editor */}
      {open && (
        <div className="border-t" style={{ borderColor: P.border }}>
          <ProjectFields project={p} onChange={onChange} />
        </div>
      )}
    </div>
  );
}

/**
 * The case-study form fields on their own — used inside ProjectEditor and by
 * the portfolio (أعمالي) page's add/edit panel.
 */
export function ProjectFields({
  project: p,
  onChange,
}: {
  project: EditableProject;
  onChange: (next: EditableProject) => void;
}) {
  function set(next: Partial<EditableProject>) {
    onChange({ ...p, ...next });
  }

  return (
    <div className="flex flex-col gap-4 p-5">
      <Field label="عنوان المشروع">
        <input
          className={inputCls}
          value={p.title}
          onChange={(e) => set({ title: e.target.value })}
          placeholder="مثال: منصة تجارة إلكترونية متكاملة"
        />
      </Field>

      <Field label="وصف من سطر واحد" hint="يظهر على بطاقة المشروع.">
        <input
          className={inputCls}
          maxLength={130}
          value={p.summary}
          onChange={(e) => set({ summary: e.target.value })}
          placeholder="ملخّص سريع لما أنجزته في هذا المشروع"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="التخصص">
          <select
            className={inputCls}
            value={p.category}
            onChange={(e) => set({ category: e.target.value as Category })}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="السنة">
          <input
            className={inputCls}
            value={p.year}
            onChange={(e) => set({ year: e.target.value })}
            placeholder="٢٠٢٥"
          />
        </Field>
        <Field label="المدة">
          <input
            className={inputCls}
            value={p.duration}
            onChange={(e) => set({ duration: e.target.value })}
            placeholder="٨ أسابيع"
          />
        </Field>
      </div>

      <Field label="رابط العمل (اختياري)">
        <div className="relative">
          <ExternalLink
            className="pointer-events-none absolute inset-y-0 inset-s-3 my-auto size-4"
            style={{ color: P.muted }}
          />
          <input
            className={`${inputCls} ps-9`}
            value={p.liveUrl ?? ""}
            onChange={(e) => set({ liveUrl: e.target.value })}
            placeholder="https://"
            dir="ltr"
          />
        </div>
      </Field>

      <Field label="وصف المشروع">
        <textarea
          rows={4}
          className={`${inputCls} resize-y leading-relaxed`}
          value={p.description}
          onChange={(e) => set({ description: e.target.value })}
          placeholder="نظرة عامة على المشروع وما حقّقه…"
        />
      </Field>

      <Field
        label="فيديو المشروع"
        hint="MP4 حتى ٣٠٠MB. يُعرض عند الضغط على الصورة المصغّرة."
      >
        <VideoField
          videoUrl={p.videoUrl ?? ""}
          onChange={(videoUrl) => set({ videoUrl })}
        />
      </Field>

      <Field
        label="الصورة المصغّرة (Thumbnail)"
        hint="صورة واحدة تظهر كغلاف للفيديو."
      >
        <ThumbnailField
          image={p.images[0] ?? ""}
          onChange={(img) => set({ images: img ? [img] : [] })}
        />
      </Field>
    </div>
  );
}
