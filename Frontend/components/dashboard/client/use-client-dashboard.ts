"use client";

import { axios } from "@/lib/api/axios";
import type {
  BestMatch,
  ClientDashboard,
  ReceivedProposal,
} from "@/types/client-dashboard";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { userKeys } from "~/api/user/keys";
import { useStartConversation } from "~/api/user/mutations";
import { getClientDashboard } from "~/api/user/queries";
import { isAxiosStatus, mapStatus2Message } from "@/lib/errors/http";

/**
 * Owns the client dashboard: the dashboard query, null-array normalisation,
 * optimistic local action state (hires, declines, closes, completions), and
 * all the hire/message/close/complete handlers.
 */
export function useClientDashboard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: queryData, isPending } = useQuery(getClientDashboard({})) as {
    data: { data: ClientDashboard } | undefined;
    isPending: boolean;
  };
  const raw = queryData?.data;
  // Normalise null arrays the backend may return when a client has no data yet
  const data = raw
    ? {
        ...raw,
        jobs: raw.jobs ?? [],
        proposals: (raw.proposals ?? []).map((p) => ({
          ...p,
          jobId: p.job_id,
          coverLetter: p.cover_letter,
          budgetType: p.budget_type,
          deliveryTime: p.delivery_time,
          freelancer: {
            id: p.freelancer_id,
            name: p.freelancer_name,
            role: p.freelancer_role,
            tier: p.freelancer_tier as "bronze" | "silver" | "gold" | "platinum",
            rating: p.freelancer_rating,
            reviews: p.freelancer_reviews,
            verified: p.freelancer_verified,
            color: p.color,
          },
        })) as ReceivedProposal[],
        projects: raw.projects ?? [],
        bestMatches: raw.bestMatches ?? [],
      }
    : undefined;

  const [hired, setHired] = useState<Set<string>>(new Set());
  const [declined] = useState<Set<string>>(new Set());
  const [closedJobs, setClosedJobs] = useState<Set<string>>(new Set());
  const [filledJobs, setFilledJobs] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [completedProjects, setCompletedProjects] = useState<Set<string>>(new Set());
  const [actionError, setActionError] = useState("");

  // seed the first job open once data arrives
  const seededRef = React.useRef(false);
  useEffect(() => {
    if (data && !seededRef.current) {
      seededRef.current = true;
      if (data.jobs[0]) setExpanded(new Set([data.jobs[0].id]));
    }
  }, [data]);

  const invalidateDashboard = () =>
    queryClient.invalidateQueries({ queryKey: userKeys.dashboard.client() });

  const hireProposalMutation = useMutation({
    mutationFn: (proposalId: string) => axios.post(`/proposals/${proposalId}/hire`),
  });
  const startConvMutation = useStartConversation();

  const markHired = (id: string) => setHired((p) => new Set(p).add(id));
  const markFilled = (id: string) => setFilledJobs((p) => new Set(p).add(id));
  const unmark = (set: React.Dispatch<React.SetStateAction<Set<string>>>, key: string) =>
    set((p) => { const n = new Set(p); n.delete(key); return n; });

  const onHireProposal = async (p: ReceivedProposal) => {
    markHired(p.freelancer.id);
    markFilled(p.jobId);
    try {
      await hireProposalMutation.mutateAsync(p.id);
      invalidateDashboard();
    } catch (err: unknown) {
      unmark(setHired, p.freelancer.id);
      unmark(setFilledJobs, p.jobId);
      setActionError(isAxiosStatus(err) ? mapStatus2Message(err.response?.status ?? 400) : "فشل التعاقد. حاول مجدداً.");
    }
  };

  const onHireMatch = async (m: BestMatch) => {
    markHired(m.freelancer.id);
    markFilled(m.job_id);
    try {
      await axios.post(`/jobs/${m.job_id}/hire`, { freelancer_id: m.freelancer.id });
      invalidateDashboard();
    } catch (err: unknown) {
      unmark(setHired, m.freelancer.id);
      unmark(setFilledJobs, m.job_id);
      setActionError(isAxiosStatus(err) ? mapStatus2Message(err.response?.status ?? 400) : "فشل التعاقد. حاول مجدداً.");
    }
  };

  const onMessage = async (freelancerId: string) => {
    try {
      const convId = await startConvMutation.mutateAsync(freelancerId);
      router.push(`/messages?c=${convId}`);
    } catch (err: unknown) {
      setActionError(isAxiosStatus(err) ? mapStatus2Message(err.response?.status ?? 400) : "تعذّر بدء المحادثة.");
    }
  };

  const onCloseJob = async (jobId: string) => {
    setClosedJobs((p) => new Set(p).add(jobId));
    try {
      await axios.post(`/jobs/${jobId}/close`);
      invalidateDashboard();
    } catch (err: unknown) {
      unmark(setClosedJobs, jobId);
      setActionError(isAxiosStatus(err) ? mapStatus2Message(err.response?.status ?? 400) : "تعذّر إغلاق الوظيفة.");
    }
  };

  const onCompleteProject = async (projectId: string) => {
    setCompletedProjects((p) => new Set(p).add(projectId));
    try {
      await axios.post(`/projects/${projectId}/complete`);
      invalidateDashboard();
    } catch (err: unknown) {
      unmark(setCompletedProjects, projectId);
      setActionError(isAxiosStatus(err) ? mapStatus2Message(err.response?.status ?? 400) : "تعذّر اعتماد المشروع.");
    }
  };

  const toggleExpand = (jobId: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });

  return {
    data,
    isPending,
    hired,
    declined,
    closedJobs,
    filledJobs,
    expanded,
    completedProjects,
    actionError,
    setActionError,
    onHireProposal,
    onHireMatch,
    onMessage,
    onCloseJob,
    onCompleteProject,
    toggleExpand,
  };
}
