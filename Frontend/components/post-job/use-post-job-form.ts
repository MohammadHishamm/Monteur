"use client";

import {
  CATEGORY_LABELS,
  type Category,
  type Tier,
} from "@/components/freelancers/types";
import { useMemo, useState } from "react";
import { useCreateJob } from "~/api/jobs/mutations";
import { type BudgetType, STEPS, SUGGESTED_SKILLS, tierHintForBudget } from "./config";

/**
 * Owns the entire post-job wizard: step navigation, every form field, the
 * mock AI scope builder, per-step validation, and submission. Lives in a hook
 * so the wizard shell, the individual step components, and the published
 * screen all read/write one source of truth.
 */
export function usePostJobForm() {
  const [step, setStep] = useState(0);
  const [published, setPublished] = useState(false);

  // form state
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<Category | "">("");
  const [idea, setIdea] = useState("");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [deliverables, setDeliverables] = useState<string[]>([]);
  const [deliverableInput, setDeliverableInput] = useState("");
  const [budgetType, setBudgetType] = useState<BudgetType>("fixed");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [duration, setDuration] = useState("");
  const [experience, setExperience] = useState<Tier | "any">("any");

  // AI scope builder
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState("");

  const createJobMutation = useCreateJob();

  const minNum = Number(budgetMin) || 0;
  const maxNum = Number(budgetMax) || 0;
  // representative figure used only for the smart-matching tier hint
  const repBudget = minNum && maxNum ? Math.round((minNum + maxNum) / 2) : maxNum || minNum;
  const matchHint = tierHintForBudget(repBudget, budgetType);

  const addSkill = (raw: string) => {
    const s = raw.trim();
    if (!s) return;
    setSkills((prev) => (prev.includes(s) ? prev : [...prev, s].slice(0, 12)));
    setSkillInput("");
  };
  const removeSkill = (s: string) =>
    setSkills((prev) => prev.filter((x) => x !== s));

  const addDeliverable = (raw: string) => {
    const d = raw.trim();
    if (!d) return;
    setDeliverables((prev) => (prev.includes(d) ? prev : [...prev, d].slice(0, 10)));
    setDeliverableInput("");
  };
  const removeDeliverable = (d: string) =>
    setDeliverables((prev) => prev.filter((x) => x !== d));

  /** Mock AI Scope Builder — expands the client's rough idea into a brief. */
  const runScopeBuilder = () => {
    if (!idea.trim() || generating) return;
    setGenerating(true);
    setTimeout(() => {
      const catLabel = category ? CATEGORY_LABELS[category] : "العمل المطلوب";
      const headline = title.trim() || idea.trim();
      setSummary(
        `${headline} — مطلوب مونتير محترف للتنفيذ بجودة عالية وتسليم في الوقت.`.slice(0, 120),
      );
      setDescription(
        `بناءً على فكرتك: «${idea.trim()}»\n\n` +
          `نبحث عن مونتير محترف لتنفيذ «${headline}» ضمن مجال ${catLabel}. ` +
          `يشمل البريف تحليل المتطلبات بدقة، ووضع خطة عمل واضحة بمراحل تسليم محدّدة، ` +
          `وتنفيذاً احترافياً يلتزم بأفضل الممارسات، مع مراجعات وتعديلات حتى الوصول ` +
          `للنتيجة المطلوبة تماماً.`,
      );
      if (category && skills.length === 0) {
        setSkills(SUGGESTED_SKILLS[category].slice(0, 4));
      }
      if (deliverables.length === 0) {
        setDeliverables([
          "خطة عمل واضحة ومراحل تسليم محدّدة",
          "تنفيذ احترافي يلتزم بالمعايير وأفضل الممارسات",
          "مراجعات وتعديلات حتى الوصول للنتيجة المطلوبة",
          "تسليم نهائي موثّق مع متابعة بعد التسليم",
        ]);
      }
      setGenerating(false);
      setGenerated(true);
    }, 1400);
  };

  // per-step validation
  const stepValid = useMemo(() => {
    switch (step) {
      case 0:
        return title.trim().length >= 6 && !!category;
      case 1:
        return (
          summary.trim().length >= 10 &&
          description.trim().length >= 30 &&
          skills.length >= 1 &&
          deliverables.length >= 1
        );
      case 2:
        return minNum > 0 && maxNum > 0 && maxNum >= minNum && !!duration;
      default:
        return true;
    }
  }, [step, title, category, summary, description, skills, deliverables, minNum, maxNum, duration]);

  const next = async () => {
    if (!stepValid) return;
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
      return;
    }
    // Last step — submit to backend
    setPublishing(true);
    setPublishError("");
    try {
      await createJobMutation.mutateAsync({
        title,
        category: category as Category,
        summary,
        description,
        skills,
        deliverables,
        budget_type: budgetType,
        budget_min: minNum,
        budget_max: maxNum,
        duration_label: duration,
        experience_tier: experience,
        urgent: false,
      });
      setPublished(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "فشل نشر البريف";
      setPublishError(msg);
    } finally {
      setPublishing(false);
    }
  };
  const back = () => setStep((s) => Math.max(0, s - 1));

  const resetForm = () => {
    setPublished(false);
    setStep(0);
    setTitle("");
    setCategory("");
    setIdea("");
    setSummary("");
    setDescription("");
    setSkills([]);
    setDeliverables([]);
    setBudgetMin("");
    setBudgetMax("");
    setDuration("");
    setExperience("any");
    setGenerated(false);
  };

  return {
    step, setStep,
    published,
    title, setTitle,
    category, setCategory,
    idea, setIdea,
    summary, setSummary,
    description, setDescription,
    skills,
    skillInput, setSkillInput,
    deliverables,
    deliverableInput, setDeliverableInput,
    budgetType, setBudgetType,
    budgetMin, setBudgetMin,
    budgetMax, setBudgetMax,
    duration, setDuration,
    experience, setExperience,
    generating,
    generated, setGenerated,
    publishing,
    publishError,
    minNum, maxNum, matchHint,
    addSkill, removeSkill,
    addDeliverable, removeDeliverable,
    runScopeBuilder,
    setGeneratedFalse: () => setGenerated(false),
    stepValid,
    next, back, resetForm,
  };
}

export type PostJobForm = ReturnType<typeof usePostJobForm>;
