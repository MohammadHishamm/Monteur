"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSubmitProposal } from "~/api/jobs/mutations";
import type { Job } from "~/types/job";

const DELIVERY_OPTIONS = [
  "أقل من أسبوع",
  "١ - ٤ أسابيع",
  "١ - ٣ أشهر",
  "أكثر من ٣ أشهر",
];

/**
 * Owns the entire proposal interaction for a job-detail page: panel
 * visibility, the draft fields, the mock AI generator, and submission.
 * Lives in a hook so the inline panel, the sidebar rail, and the mobile
 * sticky CTA can all share a single source of truth.
 */
export function useJobProposal(job: Job, id: string, isLoggedIn: boolean) {
  const router = useRouter();

  const [showProposal, setShowProposal] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [bid, setBid] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [proposalError, setProposalError] = useState("");
  const proposalRef = useRef<HTMLDivElement>(null);

  const submitProposalMutation = useSubmitProposal(id);

  const bidNum = Number(bid) || 0;
  // A freelancer can only submit one proposal per job: true after submitting,
  // or when the backend reports an existing proposal on load.
  const applied = submitted || !!job.already_applied;
  const proposalValid = coverLetter.trim().length >= 40 && bidNum > 0 && !!deliveryTime;

  const openProposal = () => {
    if (!isLoggedIn) {
      router.push(`/login?redirectTo=/video-jobs/${id}`);
      return;
    }
    setShowProposal(true);
    setTimeout(
      () => proposalRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
      80,
    );
  };

  /** Mock AI Proposal Generator — drafts a tailored cover letter. */
  const generateProposal = () => {
    if (generating) return;
    setGenerating(true);
    setTimeout(() => {
      const topSkills = job.skills.slice(0, 3).join("، ");
      setCoverLetter(
        `مرحباً،\n\nاطّلعت باهتمام على بريف «${job.title}» ويسعدني أن أكون المونتير المناسب لتنفيذه. ` +
          `لديّ خبرة قوية في ${topSkills}، ونفّذت أعمالاً مشابهة بنتائج فاقت توقّعات العملاء.\n\n` +
          `سأبدأ بفهم رؤيتك للفيديو بدقّة، ثم أضع خطة مونتاج واضحة بمراحل تسليم محدّدة، مع تواصل مستمر وجولات تعديل حتى الوصول للنتيجة التي تريدها تماماً.\n\n` +
          `يمكنني البدء فوراً والالتزام بالمدة المتوقّعة. يسعدني مناقشة التفاصيل في أي وقت.\n\nمع التحية.`,
      );
      if (!deliveryTime) setDeliveryTime(job.duration);
      if (!bid) setBid(String(Math.round((job.budget_min + job.budget_max) / 2)));
      setGenerating(false);
      setGenerated(true);
    }, 1400);
  };

  const handleSubmit = async () => {
    if (!proposalValid || submitProposalMutation.isPending) return;
    setProposalError("");
    try {
      await submitProposalMutation.mutateAsync({
        job_id: job.id,
        cover_letter: coverLetter.trim(),
        bid: bidNum,
        budget_type: job.budget_type,
        delivery_time: deliveryTime,
      });
      setSubmitted(true);
      setTimeout(
        () => proposalRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
        80,
      );
    } catch (err: unknown) {
      console.error("Proposal submission error:", err);
    }
  };

  return {
    DELIVERY_OPTIONS,
    showProposal,
    setShowProposal,
    coverLetter,
    setCoverLetter,
    bid,
    setBid,
    deliveryTime,
    setDeliveryTime,
    generating,
    generated,
    setGenerated,
    submitted,
    proposalError,
    proposalRef,
    submitting: submitProposalMutation.isPending,
    applied,
    proposalValid,
    openProposal,
    generateProposal,
    handleSubmit,
  };
}

export type JobProposal = ReturnType<typeof useJobProposal>;
