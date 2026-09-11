/**
 * Auth/verification flags derived on the job-detail page and shared by the
 * proposal panel, the sidebar rail, and the mobile sticky CTA.
 */
export interface JobGating {
  mounted: boolean;
  authLoading: boolean;
  hasSession: boolean;
  effectiveLoggedIn: boolean;
  effectiveClient: boolean;
  isUnverifiedFreelancer: boolean;
  verificationStatus: string;
}
