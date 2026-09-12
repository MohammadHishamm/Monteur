"use client";

import { Block } from "@/components/jobs/job-detail-block";
import { JobFactsGrid } from "@/components/jobs/job-facts-grid";
import type { JobGating } from "@/components/jobs/job-gating";
import { JobHero } from "@/components/jobs/job-hero";
import { JobMobileCta } from "@/components/jobs/job-mobile-cta";
import { JobRail } from "@/components/jobs/job-rail";
import { JobSkeleton } from "@/components/jobs/job-skeleton";
import { ProposalPanel } from "@/components/jobs/proposal-panel";
import { useJobProposal } from "@/components/jobs/use-job-proposal";
import { MarketingLayout } from "@/components/marketing/marketing-layout";
import { BG, P } from "@/lib/design-tokens";
import { useAuth } from "@/lib/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { notFound, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getJob } from "~/api/jobs/queries";
import type { Job } from "~/types/job";

export default function JobDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const auth = useAuth();

  const { data: queryData, isPending } = useQuery(getJob({ id })) as {
    data: { data: Job } | undefined;
    isPending: boolean;
  };

  // Auth-derived flags — evaluated AFTER hooks so they are always called.
  const isLoggedIn = auth.isAuth();
  const isFreelancer = auth.isRoleFreelance();
  const authLoading = auth.isLoading();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Verification status + role come from the DB-backed /auth/session response
  // (see useAuth). The old cookie source (`verification-status` / `user-role`)
  // was never written — the app keeps all auth data in the server session — so
  // reading it left every freelancer permanently "unverified".
  const session = auth.session();
  const verificationStatus = session?.verificationStatus ?? "unverified";
  // Whether the session query has resolved with an authenticated user. Used to
  // gate the loading skeleton (previously a synchronous cookie fast-path).
  const hasSession = !!session;

  const effectiveLoggedIn = isLoggedIn;
  const effectiveFreelancer = isFreelancer || session?.userType === "freelancer";
  const effectiveClient = effectiveLoggedIn && !effectiveFreelancer;
  const isVerified = verificationStatus === "verified";
  const isUnverifiedFreelancer = effectiveFreelancer && !isVerified;

  const jRaw = queryData?.data;

  // Proposal hook is called unconditionally (before the notFound/skeleton
  // early-exits) to keep hook order stable across renders. It tolerates an
  // empty job while loading because the panel only renders once `j` exists.
  const proposal = useJobProposal((jRaw ?? ({} as Job)), id, isLoggedIn);

  if (!isPending && !jRaw) notFound();
  if (isPending || !jRaw) return <JobSkeleton />;

  const j = jRaw;
  const gating: JobGating = {
    mounted,
    authLoading,
    hasSession,
    effectiveLoggedIn,
    effectiveClient,
    isUnverifiedFreelancer,
    verificationStatus,
  };

  return (
    <MarketingLayout>
      <JobHero job={j} />
      <JobFactsGrid job={j} />

      {/* ════════════ BODY ════════════ */}
      <section style={{ background: BG.main }}>
        <div className="mx-auto grid max-w-6xl gap-x-12 px-5 lg:grid-cols-[1fr_320px] lg:px-8">
          {/* ── MAIN COLUMN ── */}
          <div className="min-w-0">
            <Block label="وصف الوظيفة">
              <p className="max-w-2xl whitespace-pre-line text-base leading-loose" style={{ color: P.muted }}>
                {j.description}
              </p>
            </Block>

            <Block label="المخرجات المطلوبة">
              <ul className="flex max-w-2xl flex-col gap-3">
                {j.deliverables.map((d) => (
                  <li key={d} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0" style={{ color: P.green }} />
                    <span className="text-base leading-relaxed" style={{ color: P.text }}>
                      {d}
                    </span>
                  </li>
                ))}
              </ul>
            </Block>

            <Block label="الأدوات المطلوبة">
              <div className="flex flex-wrap gap-2.5">
                {j.skills.map((s) => (
                  <span
                    key={s}
                    className="rounded-lg px-3.5 py-2 text-sm font-medium"
                    style={{ border: `1px solid ${P.border}`, color: P.primaryText, background: P.subtle }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </Block>

            <ProposalPanel job={j} id={id} proposal={proposal} gating={gating} />
          </div>

          {/* ── RAIL ── */}
          <JobRail job={j} proposal={proposal} gating={gating} />
        </div>
      </section>

      {/* ════════════ MOBILE STICKY CTA ════════════ */}
      <JobMobileCta job={j} proposal={proposal} gating={gating} />
    </MarketingLayout>
  );
}
