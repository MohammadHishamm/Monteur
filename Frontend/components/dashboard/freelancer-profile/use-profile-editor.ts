"use client";

import { computeCompleteness } from "@/components/dashboard/freelancer-profile/constants";
import type { LanguageSkill } from "@/components/freelancers/types";
import { isAxiosStatus, mapStatus2Message } from "@/lib/errors/http";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useSaveMyProfile } from "~/api/user/mutations";
import { getMyProfile } from "~/api/user/queries";
import type { EditableProfile } from "~/components/dashboard/profile-editor-types";

/**
 * Owns the freelancer profile editor: the profile query, snake_case → camelCase
 * seeding, local edit state, completeness, and save (with validation + backend
 * error extraction).
 */
export function useProfileEditor() {
  const { data: queryData, isPending, isError } = useQuery(getMyProfile({})) as {
    data: { data: EditableProfile } | undefined;
    isPending: boolean;
    isError: boolean;
  };
  const saveMutation = useSaveMyProfile();

  const [profile, setProfile] = useState<EditableProfile | null>(null);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [active, setActive] = useState("basics");

  // Seed local state from the query once it arrives.
  // The backend returns projects as entity.Showcase (snake_case), so we map
  // video_url → videoUrl and cover → images[0] here before handing to the editor.
  useEffect(() => {
    if (!queryData?.data || profile) return;
    const raw = queryData.data as any;
    const mapped = {
      id: raw.id ?? "",
      name: raw.full_name ?? raw.name ?? "",
      email: raw.email ?? "",
      avatar: raw.avatar_url ?? raw.avatar ?? "",
      role: raw.title ?? raw.role ?? "",
      tagline: raw.headline ?? raw.tagline ?? "",
      category: raw.category ?? "reels",
      rate: Number(raw.hourly_rate ?? raw.rate ?? 0),
      city: raw.city ?? "",
      country: raw.country ?? "",
      available: Boolean(raw.available ?? true),
      about: raw.bio ?? raw.about ?? "",
      skills: (raw.skills ?? []) as string[],
      languages: (raw.languages ?? []) as LanguageSkill[],
      projects: (raw.projects ?? []).map((p: any) => ({
        id: p.id ?? `new-${Date.now()}`,
        title: p.title ?? "",
        summary: p.summary ?? "",
        category: p.category ?? "reels",
        year: p.year_label ?? p.year ?? "",
        duration: p.duration ?? "",
        liveUrl: p.live_url ?? p.liveUrl ?? "",
        description: p.description ?? "",
        videoUrl: p.video_url ?? "",
        images: p.cover ? [p.cover] : (p.images ?? []),
      })),
    } as EditableProfile;
    setProfile(mapped);
  }, [queryData]);

  useEffect(() => {
    if (!isError || profile) return;
    setProfile({
      id: "",
      name: "",
      email: "",
      avatar: "",
      role: "",
      tagline: "",
      category: "reels",
      rate: 0,
      city: "",
      country: "",
      available: true,
      about: "",
      skills: [],
      languages: [],
      projects: [],
    });
  }, [isError, profile]);

  // Fade the "saved" badge after 2.6 s
  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 2600);
    return () => clearTimeout(t);
  }, [saved]);

  const completeness = useMemo(() => computeCompleteness(profile), [profile]);

  function patch(p: Partial<EditableProfile>) {
    setProfile((prev: EditableProfile | null) => (prev ? { ...prev, ...p } : prev));
    setSaved(false);
  }

  async function handleSave() {
    if (!profile) return;
    setSaveError("");

    // Validate required fields before sending
    if (!profile.name.trim()) {
      setSaveError("الاسم مطلوب");
      return;
    }
    if (profile.rate < 0) {
      setSaveError("سعر الساعة لا يمكن أن يكون سالباً");
      return;
    }

    // Only send fields the backend EditableProfileSaveInput expects
    const payload = {
      name: profile.name,
      tagline: profile.tagline,
      about: profile.about,
      city: profile.city,
      rate: profile.rate,
      available: profile.available,
      avatar: profile.avatar,
      skills: profile.skills,
      languages: profile.languages,
      // Drop untouched empty draft cards so backend validation checks only real projects.
      projects: (profile.projects ?? []).filter((p) => {
        const hasAnyContent =
          p.title.trim() !== "" ||
          p.summary.trim() !== "" ||
          p.description.trim() !== "" ||
          p.images.length > 0 ||
          (p.videoUrl?.trim() ?? "") !== "";
        return hasAnyContent;
      }),
    };

    console.log("Profile save payload:", payload); // Debug log

    try {
      await saveMutation.mutateAsync(payload as unknown as Record<string, unknown>);
      setSaved(true);
    } catch (err: unknown) {
      // Try to extract the actual error message from backend response
      let errorMsg = "تعذّر حفظ الملف الشخصي. حاول مجدداً.";
      if (isAxiosStatus(err)) {
        const data = err.response?.data as any;
        // Backend returns { error: "message", detail?: "details" }
        if (data?.error) {
          errorMsg = data.error;
          if (data.detail) {
            errorMsg = `${data.error}: ${data.detail}`;
          }
        } else {
          errorMsg = mapStatus2Message(err.response?.status ?? 400);
        }
      }
      setSaveError(errorMsg);
    }
  }

  return {
    profile,
    patch,
    saved,
    saveError,
    setSaveError,
    active,
    setActive,
    completeness,
    handleSave,
    saving: saveMutation.isPending,
    loading: isPending,
  };
}
