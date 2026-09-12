"use client";

import { useProfileEditor } from "@/components/dashboard/freelancer-profile/use-profile-editor";
import { newEditableProject, ProjectFields } from "@/components/dashboard/project-editor";
import { CATEGORY_LABELS } from "@/components/freelancers/types";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { P } from "@/lib/design-tokens";
import { toArabicDigits } from "@/lib/format";
import { Clapperboard, Eye, Pencil, Play, Plus, Save, Trash2, Video, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { EditableProject } from "~/components/dashboard/profile-editor-types";

const PAGE_TITLE = "أعمالي";
const PAGE_DESC =
  "الفيديوهات التي تظهر للعملاء في ملفك العام. كل فيديو يصبح دراسة حالة بصفحة خاصة.";

type Draft = { project: EditableProject; isNew: boolean };

export default function PortfolioPage() {
  const { profile, saving, saveError, setSaveError, handleSave, loading } = useProfileEditor();

  const [draft, setDraft] = useState<Draft | null>(null);
  const [draftError, setDraftError] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const editorRef = useRef<HTMLElement>(null);

  // Bring the add/edit panel into view whenever a different video is opened.
  const draftId = draft?.project.id;
  useEffect(() => {
    if (draftId) editorRef.current?.scrollIntoView({ block: "start" });
  }, [draftId]);

  if (loading || !profile)
    return (
      <DashboardLayout
        userRole="freelancer"
        pageTitle={PAGE_TITLE}
        pageDescription={PAGE_DESC}
        user={{ name: "مستخدم", email: "", verified: false }}
      >
        <div dir="rtl" className="grid animate-pulse gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-72" style={{ background: P.subtle }} />
          ))}
        </div>
      </DashboardLayout>
    );

  const projects = profile.projects ?? [];

  function openNew() {
    if (!profile) return;
    setSaveError("");
    setDraftError("");
    setConfirmDeleteId(null);
    setDraft({ project: newEditableProject(profile.category, projects.length), isNew: true });
  }

  function openEdit(p: EditableProject) {
    setSaveError("");
    setDraftError("");
    setConfirmDeleteId(null);
    setDraft({ project: { ...p, images: [...p.images] }, isNew: false });
  }

  function closeDraft() {
    setDraft(null);
    setDraftError("");
  }

  async function saveDraft() {
    if (!draft) return;
    const p = draft.project;
    // Mirrors the backend's rules, which would otherwise reject the whole save.
    if (!p.title.trim()) {
      setDraftError("أضف عنواناً للفيديو.");
      return;
    }
    if (!(p.videoUrl ?? "").trim() && p.images.length === 0) {
      setDraftError("ارفع الفيديو أو صورة مصغّرة على الأقل.");
      return;
    }
    const next = draft.isNew
      ? [p, ...projects]
      : projects.map((x) => (x.id === p.id ? p : x));
    if (await handleSave({ projects: next })) closeDraft();
  }

  async function removeProject(id: string) {
    const ok = await handleSave({ projects: projects.filter((x) => x.id !== id) });
    if (!ok) return;
    setConfirmDeleteId(null);
    if (draft?.project.id === id) closeDraft();
  }

  const addButton = (
    <button
      type="button"
      onClick={openNew}
      disabled={saving}
      className="inline-flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
      style={{ background: P.primary }}
    >
      <Plus className="size-4" />
      إضافة فيديو
    </button>
  );

  const errorText = draft ? draftError || saveError : saveError;

  return (
    <DashboardLayout
      userRole="freelancer"
      pageTitle={PAGE_TITLE}
      pageDescription={PAGE_DESC}
      user={{
        name: profile.name || "مستخدم",
        email: profile.email ?? "",
        avatar: profile.avatar || undefined,
        verified: true,
      }}
      actions={
        <>
          {profile.id && (
            <Link
              href={`/freelancers/${profile.id}`}
              className="inline-flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors hover:bg-black/5"
              style={{ border: `1px solid ${P.border}`, color: P.text }}
            >
              <Eye className="size-4" />
              كما يراه العملاء
            </Link>
          )}
          {addButton}
        </>
      }
    >
      <div dir="rtl" className="flex flex-col gap-4">
        {/* ═══ ADD / EDIT PANEL ═══ */}
        {draft && (
          <section
            ref={editorRef}
            aria-labelledby="video-editor-title"
            className="scroll-mt-24 bg-white"
            style={{ border: `1px solid ${P.primary}` }}
          >
            <div
              className="flex items-center justify-between gap-3 border-b px-5 py-3"
              style={{ borderColor: P.border }}
            >
              <h2 id="video-editor-title" className="font-bold" style={{ color: P.text }}>
                {draft.isNew ? "إضافة فيديو" : "تعديل الفيديو"}
              </h2>
              <button
                type="button"
                onClick={closeDraft}
                aria-label="إغلاق"
                className="grid size-8 place-items-center rounded-lg transition-colors hover:bg-black/5"
                style={{ color: P.muted }}
              >
                <X className="size-4" />
              </button>
            </div>

            <ProjectFields
              project={draft.project}
              onChange={(project) => {
                setDraft({ ...draft, project });
                setDraftError("");
              }}
            />

            <div
              className="flex flex-wrap items-center justify-end gap-3 border-t px-5 py-3"
              style={{ borderColor: P.border }}
            >
              {errorText && (
                <p role="alert" className="me-auto text-sm text-red-600">
                  {errorText}
                </p>
              )}
              <button
                type="button"
                onClick={closeDraft}
                className="inline-flex h-9 items-center rounded-lg px-4 text-sm font-semibold transition-colors hover:bg-black/5"
                style={{ border: `1px solid ${P.border}`, color: P.text }}
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={saveDraft}
                disabled={saving}
                className="inline-flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{ background: P.primary }}
              >
                <Save className="size-4" />
                {saving ? "جارٍ الحفظ…" : "حفظ الفيديو"}
              </button>
            </div>
          </section>
        )}

        {!draft && saveError && (
          <p role="alert" className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {saveError}
          </p>
        )}

        {/* ═══ VIDEO GRID ═══ */}
        {projects.length === 0 ? (
          !draft && (
            <div
              className="flex flex-col items-center gap-3 bg-white px-6 py-14 text-center"
              style={{ border: `1px solid ${P.border}` }}
            >
              <span
                className="grid size-12 place-items-center rounded-full"
                style={{ background: `${P.primary}14`, color: P.primary }}
              >
                <Clapperboard className="size-5" />
              </span>
              <p className="font-bold" style={{ color: P.text }}>ابدأ الشو-ريل بأول فيديو</p>
              <p className="max-w-sm text-sm" style={{ color: P.muted }}>
                الفيديوهات التي تضيفها هنا تظهر مباشرة في ملفك العام، ويستعرضها العملاء قبل التعاقد معك.
              </p>
              {addButton}
            </div>
          )
        ) : (
          <>
            <p className="text-xs" style={{ color: P.muted }}>
              {toArabicDigits(projects.length)} فيديو · تظهر بنفس الترتيب في ملفك العام
            </p>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {projects.map((p) => (
                <VideoCard
                  key={p.id}
                  project={p}
                  editing={draft?.project.id === p.id}
                  confirming={confirmDeleteId === p.id}
                  saving={saving}
                  onEdit={() => openEdit(p)}
                  onAskDelete={() => setConfirmDeleteId(p.id)}
                  onCancelDelete={() => setConfirmDeleteId(null)}
                  onConfirmDelete={() => removeProject(p.id)}
                />
              ))}

              {/* add tile */}
              <button
                type="button"
                onClick={openNew}
                disabled={saving}
                className="flex min-h-56 flex-col items-center justify-center gap-2 text-sm font-semibold transition-colors hover:bg-black/2 disabled:opacity-60"
                style={{ border: `1px dashed ${P.border}`, color: P.primaryText }}
              >
                <span
                  className="grid size-10 place-items-center rounded-full"
                  style={{ background: `${P.primary}14` }}
                >
                  <Plus className="size-5" />
                </span>
                إضافة فيديو
              </button>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

/* ════════════ VIDEO CARD ════════════ */
function VideoCard({
  project: p,
  editing,
  confirming,
  saving,
  onEdit,
  onAskDelete,
  onCancelDelete,
  onConfirmDelete,
}: {
  project: EditableProject;
  editing: boolean;
  confirming: boolean;
  saving: boolean;
  onEdit: () => void;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
}) {
  const cover = p.images[0];
  const meta = [p.year, p.duration].filter(Boolean).join(" · ");

  return (
    <article
      className="flex flex-col bg-white"
      style={{ border: `1px solid ${editing ? P.primary : P.border}` }}
    >
      <div className="relative aspect-video w-full overflow-hidden" style={{ background: P.subtle }}>
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" className="size-full object-cover" />
        ) : p.videoUrl ? (
          <video src={p.videoUrl} preload="metadata" muted className="size-full bg-black object-cover" />
        ) : (
          <div className="grid size-full place-items-center">
            <Video className="size-6" style={{ color: P.muted }} />
          </div>
        )}
        {p.videoUrl && (
          <span className="pointer-events-none absolute inset-0 grid place-items-center">
            <span
              className="grid size-10 place-items-center rounded-full"
              style={{ background: "rgba(0,0,0,0.45)" }}
            >
              <Play className="size-4 translate-x-px fill-current text-white" />
            </span>
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <span
          className="inline-flex self-start px-2 py-0.5 text-[11px] font-semibold"
          style={{ background: `${P.primary}10`, color: P.primaryText, border: `1px solid ${P.primary}30` }}
        >
          {CATEGORY_LABELS[p.category] ?? p.category}
        </span>
        <h3 className="mt-2 line-clamp-1 text-sm font-bold" style={{ color: P.text }}>
          {p.title || "فيديو بلا عنوان"}
        </h3>
        {p.summary && (
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed" style={{ color: P.muted }}>
            {p.summary}
          </p>
        )}
        {meta && (
          <p className="mt-2 text-[11px]" style={{ color: P.muted }}>
            {meta}
          </p>
        )}

        <div className="mt-auto flex items-center gap-2 pt-4">
          {confirming ? (
            <>
              <span className="flex-1 text-xs font-semibold text-red-600">حذف هذا الفيديو نهائياً؟</span>
              <button
                type="button"
                onClick={onCancelDelete}
                disabled={saving}
                className="inline-flex h-8 items-center rounded-lg px-3 text-xs font-semibold transition-colors hover:bg-black/5"
                style={{ border: `1px solid ${P.border}`, color: P.text }}
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={onConfirmDelete}
                disabled={saving}
                className="inline-flex h-8 items-center rounded-lg bg-red-600 px-3 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {saving ? "جارٍ الحذف…" : "حذف"}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onEdit}
                disabled={saving}
                className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition-colors hover:bg-black/5 disabled:opacity-60"
                style={{ border: `1px solid ${P.border}`, color: P.text }}
              >
                <Pencil className="size-3.5" />
                تعديل
              </button>
              <button
                type="button"
                onClick={onAskDelete}
                disabled={saving}
                aria-label={`حذف ${p.title || "الفيديو"}`}
                className="grid size-8 shrink-0 place-items-center rounded-lg transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
                style={{ border: `1px solid ${P.border}`, color: P.muted }}
              >
                <Trash2 className="size-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
