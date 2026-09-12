package handler

import (
	"net/http"
	"os"

	"github.com/OmarHosny18/APP-frontend/common"
	"github.com/OmarHosny18/APP-frontend/internal/realtime"
	"github.com/OmarHosny18/APP-frontend/internal/service"
	"github.com/OmarHosny18/APP-frontend/internal/store"

	"github.com/go-chi/chi/v5"
)

type Handler struct {
	store   *store.Store
	service *service.Service
	mailer  *common.Mailer
	// Hub is the real-time WebSocket connection pool. It is initialised inside
	// New() so callers do not need to manage its lifecycle.
	Hub *realtime.Hub
}

func New(s *service.Service, st *store.Store, ml *common.Mailer) *Handler {
	return &Handler{
		service: s,
		store:   st,
		mailer:  ml,
		Hub:     realtime.NewHub(),
	}
}

func (h *Handler) Init(r chi.Router) {
	r.Use(h.WithIPBanEnforcement)

	// Serve uploaded files statically at /uploads/<filename>
	uploadsDir := "./uploads"
	if err := os.MkdirAll(uploadsDir, 0755); err == nil {
		fs := http.FileServer(http.Dir(uploadsDir))
		r.Get("/uploads/{filename}", func(w http.ResponseWriter, r *http.Request) {
			filename := chi.URLParam(r, "filename")
			r.URL.Path = "/" + filename
			fs.ServeHTTP(w, r)
		})
	}

	r.Group(func(r chi.Router) {
		// Public routes (no authentication required)
	})

	r.Group(func(r chi.Router) {
		r.Use(h.EnsureSession)

		// Routes
		r.Route("/v1", func(r chi.Router) {
			h.initPublicRoutes(r)
			h.initAdminRoutes(r)
		})

	})
}

func (h *Handler) initPublicRoutes(r chi.Router) {

	r.Group(func(r chi.Router) {
		// Auth
		r.Get("/auth/session", h.HandleGetSession)
		r.Post("/auth/refresh", h.HandleRefreshToken)
		r.Post("/auth/activate", h.HandleEmailActivation)
		r.Post("/auth/email/signup", h.HandleEmailSignup)
		r.Post("/auth/email/signin", h.HandleEmailSignin)
		r.Post("/auth/signout", h.HandleSignout)
		r.Post("/auth/forgetpassword", h.HandleForgotPassword)
		r.Post("/auth/reset-password", h.HandleResetPassword)
	})

	// ── Public read-only endpoints ──
	r.Group(func(r chi.Router) {
		// Freelancers
		r.Get("/freelancers/cities", h.HandleGetFreelancerCities)
		r.Get("/freelancers", h.HandleListFreelancers)
		r.Get("/freelancers/{freelancerID}", h.HandleGetFreelancer)
		r.Get("/freelancers/{freelancerID}/similar", h.HandleGetSimilarFreelancers)
		r.Get("/freelancers/{freelancerID}/showcases", h.HandleGetFreelancerShowcases)
		r.Get("/freelancers/{freelancerID}/reviews", h.HandleListFreelancerReviews)

		// Jobs
		r.Get("/jobs", h.HandleListJobs)
		r.Get("/jobs/{jobID}", h.HandleGetJob)

		// Single showcase
		r.Get("/showcases/{showcaseID}", h.HandleGetShowcase)
	})

	// ── Authenticated endpoints ──
	r.Group(func(r chi.Router) {
		r.Use(h.WithRequiredAuth)

		// Authenticated user
		r.Get("/users/auth", h.HandleGetUserAuth)
		r.Post("/users/verification", h.HandleSubmitVerification)

		// Freelancer bookmarks
		r.Get("/freelancers/{freelancerID}/save", h.HandleGetSavedStatus)
		r.Post("/freelancers/{freelancerID}/save", h.HandleSaveFreelancer)
		r.Delete("/freelancers/{freelancerID}/save", h.HandleUnsaveFreelancer)
		r.Get("/me/saved-freelancers", h.HandleListSavedFreelancers)

		// Restricted to verified users. NOTE: kept OUT of this group on purpose —
		// upload, verification submit, /users/auth and onboarding must stay
		// reachable by unverified users, otherwise they could never get verified.
		r.Group(func(r chi.Router) {
			r.Use(h.WithRequiredVerifiedUser)

			// Conversations (messaging requires a verified account)
			r.Get("/conversations", h.HandleListConversations)
			r.Post("/conversations", h.HandleCreateConversation)
			r.Get("/conversations/{conversationID}", h.HandleGetConversation)
			r.Get("/conversations/{conversationID}/messages", h.HandleGetMessages)
			r.Post("/conversations/{conversationID}/messages", h.HandleSendMessage)

			// Jobs (write)
			r.Post("/jobs", h.HandleCreateJob)
			r.Put("/jobs/{jobID}", h.HandleUpdateJob)
			r.Post("/jobs/{jobID}/close", h.HandleCloseJob)
			r.Post("/jobs/{jobID}/proposals", h.HandleSubmitProposal)
			r.Post("/jobs/{jobID}/hire", h.HandleHireBestMatch)

			// Proposals
			r.Get("/me/proposals", h.HandleListMyProposals)
			r.Post("/proposals/{proposalID}/hire", h.HandleHireProposal)
			r.Patch("/proposals/{proposalID}/status", h.HandleUpdateProposalStatus)

			// Projects
			r.Get("/me/projects", h.HandleListMyProjects)
			r.Get("/projects/{projectID}", h.HandleGetProject)
			r.Patch("/projects/{projectID}", h.HandleUpdateProjectProgress)
			r.Post("/projects/{projectID}/complete", h.HandleCompleteProject)
			r.Post("/projects/{projectID}/review", h.HandleSubmitReview)

			// Dashboards
			r.Get("/dashboard/client", h.HandleGetClientDashboard)
			r.Get("/dashboard/freelancer", h.HandleGetFreelancerDashboard)

			// Profile editor + account settings (verified-only, matching the
			// frontend gate which redirects unverified users to /verify)
			r.Get("/me/profile", h.HandleGetMyProfile)
			r.Put("/me/profile", h.HandleSaveMyProfile)
			r.Put("/me/account", h.HandleUpdateAccount)
			r.Post("/me/password", h.HandleChangePassword)
		})

		// Onboarding
		r.Post("/onboarding/client", h.HandleClientOnboarding)
		r.Post("/onboarding/freelancer", h.HandleFreelancerOnboarding)

		// File upload
		r.Post("/upload", h.HandleUploadFile)
		r.Post("/upload/video", h.HandleUploadVideo)

		// Notifications
		r.Get("/notifications", h.HandleListNotifications)
		r.Post("/notifications/{notificationID}/read", h.HandleMarkNotificationRead)
		r.Get("/ws/notifications", h.HandleNotificationWebSocket)
	})
}

func (h *Handler) initAdminRoutes(r chi.Router) {
	// Public — no JWT required
	r.Post("/admin/auth/signin", h.HandleAdminSignin)

	r.Group(func(r chi.Router) {
		r.Use(h.WithRequiredAdmin)

		// ── Analytics ──
		r.Get("/admin/analytics", h.HandleAdminAnalytics)

		// ── Users ──
		r.Get("/admin/users", h.HandleAdminListUsers)
		r.Delete("/admin/users/{userID}", h.HandleAdminDeleteUser)
		r.Post("/admin/users/{userID}/ban", h.HandleBanUser)
		r.Post("/admin/users/{userID}/unban", h.HandleUnbanUser)
		r.Post("/admin/users/{userID}/warning", h.HandleAdminSendWarning)
		r.Post("/admin/users/{userID}/balance", h.HandleAdminAddBalance)
		r.Post("/admin/users/{userID}/deduct-balance", h.HandleAdminDeductBalance)

		// ── Support chat ──
		r.Get("/admin/support/conversations", h.HandleAdminListSupportConversations)
		r.Get("/admin/support/conversations/{conversationID}/messages", h.HandleAdminGetSupportMessages)
		r.Post("/admin/support/conversations/{conversationID}/messages", h.HandleAdminReplySupportMessage)

		// ── Moderation (existing) ──
		r.Get("/admin/moderation/flagged-messages", h.HandleListFlaggedMessages)
		r.Post("/admin/moderation/flagged-messages/{flaggedID}/warn", h.HandleWarnUser)
		r.Post("/admin/moderation/flagged-messages/{flaggedID}/dismiss", h.HandleDismissFlag)
		r.Get("/admin/users/{userID}/warnings", h.HandleGetUserWarnings)
		r.Post("/admin/users/{userID}/ban", h.HandleBanUser)
		r.Post("/admin/users/{userID}/unban", h.HandleUnbanUser)

		// Verifications
		r.Get("/admin/verifications", h.HandleListPendingVerifications)
		r.Post("/admin/verifications/{id}/review", h.HandleReviewVerification)
	})
}
