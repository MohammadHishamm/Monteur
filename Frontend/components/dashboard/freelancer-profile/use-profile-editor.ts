"use client";

import { computeCompleteness } from "@/components/dashboard/freelancer-profile/constants";
import type { Category, LanguageSkill } from "@/components/freelancers/types";
import { isAxiosStatus, mapStatus2Message } from "@/lib/errors/http";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSaveMyProfile } from "~/api/user/mutations";
import { getMyProfile } from "~/api/user/queries";
import type { EditableProfile } from "~/components/dashboard/profile-editor-types";

/** Profile as returned by GET /me/profile and inside the PUT response (snake_case, loosely typed). */
interface RawShowcase {
  id?: string;
  title?: string;
  summary?: string;
  category?: string;
  year_label?: string;
  year?: string;
  duration?: string;
  live_url?: string | null;
  liveUrl?: string;
  description?: string;
  video_url?: string | null;
  cover?: string | null;
  gallery?: { url?: string }[] | null;
  images?: string[];
}
interface RawProfile {
  id?: string;
  full_name?: string;
  name?: string;
  email?: string;
  avatar_url?: string;
  avatar?: string;
  title?: string;
  role?: string;
  headline?: string;
  tagline?: string;
  category?: string;
  hourly_rate?: number;
  rate?: number;
  city?: string;
  country?: string;
  available?: boolean;
  bio?: string;
  about?: string;
  skills?: string[];
  languages?: LanguageSkill[];
  projects?: RawShowcase[];
}

/**
 * The backend stores images[0] as `cover` and the rest as `gallery`, so both have
 * to be read back. Dropping the gallery here would make the next save send a
 * shorter list — and the server deletes every image missing from it.
 */
function mapImages(p: RawShowcase): string[] {
  const gallery = (p.gallery ?? []).map((g) => g?.url ?? "").filter(Boolean);
  if (p.cover) return [p.cover, ...gallery];
  if (gallery.length > 0) return gallery;
  return p.images ?? [];
}

/**
 * Backend → editor shape. The backend returns projects as entity.Showcase
 * (snake_case), so we map video_url → videoUrl and cover → images[0].
 */
function mapProfile(raw: RawProfile): EditableProfile {
  return {
    id: raw.id ?? "",
    name: raw.full_name ?? raw.name ?? "",
    email: raw.email ?? "",
    avatar: raw.avatar_url ?? raw.avatar ?? "",
    role: raw.title ?? raw.role ?? "",
    tagline: raw.headline ?? raw.tagline ?? "",
    category: (raw.category ?? "reels") as Category,
    rate: Number(raw.hourly_rate ?? raw.rate ?? 0),
    city: raw.city ?? "",
    country: raw.country ?? "",
    available: Boolean(raw.available ?? true),
    about: raw.bio ?? raw.about ?? "",
    skills: raw.skills ?? [],
    languages: raw.languages ?? [],
    projects: (raw.projects ?? []).map((p) => ({
      id: p.id ?? `new-${Date.now()}`,
      title: p.title ?? "",
      summary: p.summary ?? "",
      category: (p.category ?? "reels") as Category,
      year: p.year_label ?? p.year ?? "",
      duration: p.duration ?? "",
      liveUrl: p.live_url ?? p.liveUrl ?? "",
      description: p.description ?? "",
      videoUrl: p.video_url ?? "",
      images: mapImages(p),
    })),
  };
}

/**
 * Owns the freelancer profile editor state: the profile query, seeding, local
 * edits, completeness, and save (with validation + backend error extraction).
 * Used by both the profile editor and the portfolio (أعمالي) page — the backend
 * saves profile and showcases together through PUT /me/profile.
 */
export function useProfileEditor() {
  const { data: queryData, isPending, isFetching, isError } = useQuery(getMyProfile({})) as {
    data: { data: RawProfile } | undefined;
    isPending: boolean;
    isFetching: boolean;
    isError: boolean;
  };
  const saveMutation = useSaveMyProfile();
  const queryClient = useQueryClient();
  // Showcase IDs as they were the last time we loaded or saved. Anything the
  // server has outside this set appeared after we loaded — i.e. another open
  // editor created it — so it must survive our save.
  const baselineIds = useRef<Set<string>>(new Set());

  const [profile, setProfile] = useState<EditableProfile | null>(null);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [active, setActive] = useState("basics");

  // Seed local state once. Wait for any in-flight refetch: a save deletes every
  // showcase it doesn't include, so seeding from stale cached data (e.g. right
  // after saving on the other page) and saving again would drop videos.
  useEffect(() => {
    if (!queryData?.data || profile || isFetching) return;
    const seeded = mapProfile(queryData.data);
    baselineIds.current = new Set(seeded.projects.map((pr) => pr.id));
    setProfile(seeded);
  }, [queryData, profile, isFetching]);

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

  /**
   * PUT /me/profile replaces the whole showcase list and deletes everything the
   * payload omits, so sending our cached list would wipe projects added since we
   * loaded (a second open tab, or the other editor page). Re-read the server copy
   * and append only what is new to it — projects missing locally but present in
   * our baseline were deleted here on purpose and stay deleted.
   */
  async function withServerProjects(
    local: EditableProfile["projects"],
  ): Promise<EditableProfile["projects"]> {
    let server: EditableProfile["projects"];
    try {
      const latest = (await queryClient.fetchQuery({
        ...getMyProfile({}),
        staleTime: 0,
      })) as { data: RawProfile };
      server = mapProfile(latest.data).projects;
    } catch {
      return local; // refetch failed — save what we have rather than blocking
    }
    const localIds = new Set(local.map((pr) => pr.id));
    return [
      ...local,
      ...server.filter((pr) => !localIds.has(pr.id) && !baselineIds.current.has(pr.id)),
    ];
  }

  /**
   * Saves the profile. `override` is merged on top of the current state first,
   * so callers can save a change in one step (e.g. a new projects list).
   * Resolves to true on success.
   */
  async function handleSave(override?: Partial<EditableProfile>): Promise<boolean> {
    if (!profile) return false;
    const target = override ? { ...profile, ...override } : profile;
    setSaveError("");

    // Validate required fields before sending
    if (!target.name.trim()) {
      setSaveError("الاسم مطلوب");
      return false;
    }
    if (target.rate < 0) {
      setSaveError("سعر الساعة لا يمكن أن يكون سالباً");
      return false;
    }

    const projects = await withServerProjects(target.projects ?? []);

    // Only send fields the backend EditableProfileSaveInput expects
    const payload = {
      name: target.name,
      tagline: target.tagline,
      about: target.about,
      city: target.city,
      rate: target.rate,
      available: target.available,
      avatar: target.avatar,
      skills: target.skills,
      languages: target.languages,
      // Drop untouched empty draft cards so backend validation checks only real projects.
      projects: projects.filter((p) => {
        const hasAnyContent =
          p.title.trim() !== "" ||
          p.summary.trim() !== "" ||
          p.description.trim() !== "" ||
          p.images.length > 0 ||
          (p.videoUrl?.trim() ?? "") !== "";
        return hasAnyContent;
      }),
    };

    try {
      const res = (await saveMutation.mutateAsync(
        payload as unknown as Record<string, unknown>,
      )) as { data?: { profile?: RawProfile } } | undefined;
      // Adopt the server's copy: new projects get real IDs there. Keeping the
      // temporary "new-…" IDs would make the next save re-create them and delete
      // the previous copy (and its video file).
      const fresh = res?.data?.profile;
      const next = fresh ? mapProfile(fresh) : { ...target, projects };
      baselineIds.current = new Set(next.projects.map((pr) => pr.id));
      setProfile(next);
      setSaved(true);
      return true;
    } catch (err: unknown) {
      // Try to extract the actual error message from backend response
      let errorMsg = "تعذّر حفظ الملف الشخصي. حاول مجدداً.";
      if (isAxiosStatus(err)) {
        const data = err.response?.data as { error?: string; detail?: string } | undefined;
        // Backend returns { error: "message", detail?: "details" }
        if (data?.error) {
          errorMsg = data.detail ? `${data.error}: ${data.detail}` : data.error;
        } else {
          errorMsg = mapStatus2Message(err.response?.status ?? 400);
        }
      }
      setSaveError(errorMsg);
      return false;
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
