"use client";

import { FreelancerCard } from "@/components/freelancers/freelancer-card";
import type { Freelancer as CardFreelancer } from "@/components/freelancers/types";
import { MarketingLayout } from "@/components/marketing/marketing-layout";
import { BG, P } from "@/lib/design-tokens";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Bookmark } from "lucide-react";
import Link from "next/link";
import { getSavedFreelancers } from "~/api/freelancers/queries";
import type { Freelancer as ApiFreelancer } from "~/types/freelancer";

function toCardFreelancer(freelancer: ApiFreelancer): CardFreelancer {
  return {
    id: freelancer.id,
    name: freelancer.full_name,
    role: freelancer.role ?? "",
    category: freelancer.category ?? "youtube",
    showreelDuration: freelancer.showreel_duration,
    tier: freelancer.tier,
    matchScore: freelancer.match_score ?? 0,
    rating: freelancer.rating ?? 0,
    reviews: freelancer.total_reviews ?? 0,
    skills: freelancer.skills ?? [],
    city: freelancer.city ?? "",
    country: freelancer.country ?? "",
    rate: freelancer.hourly_rate ?? 0,
    available: freelancer.available ?? false,
    verified: freelancer.verified ?? false,
    completed: freelancer.completed_jobs ?? 0,
    color: freelancer.color ?? "#10b981",
    tagline: freelancer.tagline ?? "",
    avatar: freelancer.avatar_url ?? undefined,
  };
}

export default function SavedFreelancersPage() {
  const { data: queryData, isPending: loading } = useQuery(getSavedFreelancers({})) as {
    data: { data: ApiFreelancer[] } | undefined;
    isPending: boolean;
  };

  const list = (queryData?.data ?? []).map(toCardFreelancer);

  return (
    <MarketingLayout>
      <section style={{ background: BG.main }}>
        <div className="mx-auto max-w-6xl px-5 py-12 lg:px-8 lg:py-16">
          {/* header */}
          <div className="mb-10 flex items-center gap-3">
            <span
              className="flex size-10 shrink-0 items-center justify-center rounded-xl"
              style={{ background: `${P.primary}14`, color: P.primary }}
            >
              <Bookmark className="size-5" />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight" style={{ color: P.text }}>
                المونتيرون المحفوظون
              </h1>
              <p className="mt-0.5 text-sm" style={{ color: P.muted }}>
                قائمة المونتيرين الذين حفظتهم للرجوع إليهم لاحقاً
              </p>
            </div>
          </div>

          {loading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-64 animate-pulse rounded-2xl"
                  style={{ background: P.subtle }}
                />
              ))}
            </div>
          ) : list.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-24 text-center">
              <span
                className="flex size-16 items-center justify-center rounded-2xl"
                style={{ background: `${P.primary}10`, color: P.primary }}
              >
                <Bookmark className="size-8" strokeWidth={1.5} />
              </span>
              <p className="text-lg font-semibold" style={{ color: P.text }}>
                لا يوجد مونتيرون محفوظون بعد
              </p>
              <p className="max-w-xs text-sm" style={{ color: P.muted }}>
                عند زيارة ملف مونتير اضغط على أيقونة الحفظ لإضافته إلى هذه القائمة.
              </p>
              <Link
                href="/freelancers"
                className="mt-2 inline-flex h-10 items-center gap-2 rounded-full px-5 text-sm font-semibold text-white"
                style={{ background: P.primary }}
              >
                استعرض المونتيرين
              </Link>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((f) => (
                <FreelancerCard key={f.id} f={f} />
              ))}
            </div>
          )}
        </div>
      </section>
    </MarketingLayout>
  );
}
