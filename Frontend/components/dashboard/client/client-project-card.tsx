"use client";

import { CATEGORY_LABELS, type Category } from "@/components/freelancers/types";
import { P } from "@/lib/design-tokens";
import { toArabicDigits } from "@/lib/format";
import type { ClientProject } from "@/types/client-dashboard";
import { CheckCircle2, Tag } from "lucide-react";
import { useState } from "react";
import { useSubmitReview } from "~/api/projects/mutations";
import { isAxiosStatus, mapStatus2Message } from "@/lib/errors/http";

export function ClientProjectCard({
  project: pr,
  completed,
  onComplete,
}: {
  project: ClientProject;
  completed: boolean;
  onComplete: () => void;
}) {
  const isDone = completed || pr.status === "completed";
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [reviewSent, setReviewSent] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const reviewMutation = useSubmitReview(pr.id);

  const onSubmitReview = async () => {
    if (rating === 0) return;
    setReviewError("");
    try {
      await reviewMutation.mutateAsync({ rating, body: reviewText });
      setReviewSent(true);
    } catch (err: unknown) {
      setReviewError(isAxiosStatus(err) ? mapStatus2Message(err.response?.status ?? 400) : "تعذّر إرسال التقييم. حاول مجدداً.");
    }
  };
  const reviewPending = reviewMutation.isPending;

  return (
    <div
      className="flex flex-col gap-4 bg-white p-5"
      style={{ border: `1px solid ${P.border}` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold"
            style={{
              background: `${P.primary}10`,
              color: P.primaryText,
              border: `1px solid ${P.primary}30`,
            }}
          >
            <Tag className="size-3" />
            {CATEGORY_LABELS[pr.category as Category] ?? pr.category}
          </span>
          <h3 className="mt-2.5 text-base font-bold" style={{ color: P.text }}>
            {pr.title}
          </h3>
          <p className="mt-1 text-xs" style={{ color: P.muted }}>
            {pr.freelancer_name}
          </p>
        </div>
        <div className="shrink-0 text-end">
          <p className="font-tech text-lg font-bold tnum" style={{ color: P.text }}>
            ${toArabicDigits(pr.amount)}
          </p>
        </div>
      </div>

      {/* progress */}
      <div>
        <div
          className="mb-1.5 flex items-center justify-between text-[11px]"
          style={{ color: P.muted }}
        >
          <span>نسبة الإنجاز</span>
          <span className="font-tech font-semibold tnum" style={{ color: P.text }}>
            {toArabicDigits(isDone ? 100 : pr.progress)}٪
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden" style={{ background: P.subtle }}>
          <div
            className="h-full"
            style={{ width: `${isDone ? 100 : pr.progress}%`, background: P.primary }}
          />
        </div>
      </div>

      <div className="border-t pt-3" style={{ borderColor: P.border }}>
        {isDone ? (
          <div className="flex flex-col gap-3">
            <span
              className="inline-flex items-center gap-1.5 text-sm font-semibold"
              style={{ color: P.green }}
            >
              <CheckCircle2 className="size-4" />
              مكتمل ✓
            </span>
            {/* review form — only shown once */}
            {reviewSent ? (
              <p className="text-xs" style={{ color: P.muted }}>شكراً على تقييمك!</p>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold" style={{ color: P.text }}>قيّم المونتير</p>
                {/* star picker */}
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setRating(s)}
                      onMouseEnter={() => setHovered(s)}
                      onMouseLeave={() => setHovered(0)}
                      className="text-xl transition-transform hover:scale-110"
                      style={{ color: s <= (hovered || rating) ? P.star : "#CBD5E1" }}
                    >
                      ★
                    </button>
                  ))}
                </div>
                <textarea
                  rows={2}
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="أضف تعليقاً (اختياري)"
                  className="w-full resize-none rounded-lg p-2 text-sm outline-none focus:ring-2"
                  style={{
                    border: `1px solid ${P.border}`,
                    color: P.text,
                    background: "white",
                    // @ts-expect-error css var
                    "--tw-ring-color": P.primary,
                  }}
                />
                <button
                  type="button"
                  onClick={onSubmitReview}
                  disabled={rating === 0 || reviewPending}
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                  style={{ background: P.primary }}
                >
                  {reviewPending ? "جارٍ الإرسال…" : "إرسال التقييم"}
                </button>
                {reviewError && (
                  <p className="text-xs text-red-500">{reviewError}</p>
                )}
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={onComplete}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: P.primary }}
          >
            <CheckCircle2 className="size-4" />
            اعتماد وإغلاق المشروع
          </button>
        )}
      </div>
    </div>
  );
}
