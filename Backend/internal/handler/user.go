package handler


import (
	"context"
	"encoding/csv"
	"errors"
	"fmt"
	"log"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/OmarHosny18/APP-frontend/common"
	"github.com/OmarHosny18/APP-frontend/internal/apperror"
	"github.com/OmarHosny18/APP-frontend/internal/entity"
)

// HandleGetActiveUserCount godoc
//
//	@Summary		Get active users count with growth - Admin/Publisher Access
//	@Description	Get the active users count and growth compared to yesterday. Requires authentication.
//	@Tags			users
//	@Accept			json
//	@Produce		json
//	@Success		200	{object}	common.DataEnvelope{data=entity.ResourceCountWithGrowth}
//	@Failure		401	{object}	common.ErrorEnvelope
//	@Failure		403	{object}	common.ErrorEnvelope
//	@Failure		500	{object}	common.ErrorEnvelope
//	@Router			/science/active/users/count [get]
func (h *Handler) HandleGetActiveUserCount(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), time.Second*30)
	defer cancel()

	sess, err := h.service.Auth.GetRequestSession(r, false)
	if err != nil {
		common.ServeBadRequestResponse(w, r, err)
		return
	}

	if !sess.Roles.IsAdmin() && !sess.Roles.IsAccountant() {
		common.ServeForbiddenResponse(w, r)
		return
	}

	stats, err := h.service.User.CountActiveUsersWithGrowth(ctx)
	if err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}

	common.WriteJson(w, http.StatusOK, common.DataEnvelope{Data: stats})
}

// HandleGetUserAuth godoc
//
//	@Summary		Get authenticated user data - User Access
//	@Description	Get the currently authenticated user's data. Requires authentication.
//	@Tags			users
//	@Accept			json
//	@Produce		json
//	@Success		200	{object}	common.DataEnvelope{data=entity.User}
//	@Failure		401	{object}	common.ErrorEnvelope
//	@Failure		404	{object}	common.ErrorEnvelope
//	@Failure		500	{object}	common.ErrorEnvelope
//	@Router			/users/auth [get]
func (h *Handler) HandleGetUserAuth(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), time.Second*30)
	defer cancel()

	sess, err := h.service.Auth.GetRequestSession(r, false)
	if err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}

	user, err := h.service.User.GetUserByID(ctx, sess.UserID)
	if err != nil && !errors.Is(err, apperror.ErrUserNotFound) {
		common.ServeInternalServerResponse(w, r, err)
		return
	}

	common.WriteJson(w, http.StatusOK, common.DataEnvelope{Data: user})
}

// HandleGetUser godoc
//
//	@Summary		Get user - Public Access
//	@Description	Get user. Requires no authentication.
//	@Tags			users
//	@Accept			json
//	@Produce		json
//	@Param			userID	path		string	true	"User ID"
//	@Success		200		{object}	common.DataEnvelope{data=entity.User}
//	@Failure		400		{object}	common.ErrorEnvelope
//	@Failure		401		{object}	common.ErrorEnvelope
//	@Failure		404		{object}	common.ErrorEnvelope
//	@Failure		500		{object}	common.ErrorEnvelope
//	@Router			/users/{userID} [get]
func (h *Handler) HandleGetUser(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), time.Second*30)
	defer cancel()

	uID, err := common.ParseIDURLParam(r, "userID")
	if err != nil {
		common.ServeBadRequestResponse(w, r, err)
		return
	}

	u, err := h.service.User.GetUserByID(ctx, &uID)
	if err != nil {
		if errors.Is(err, apperror.ErrUserNotFound) {
			common.ServeNotFoundResponse(w, r, apperror.ErrUserNotFound)
			return
		}

		common.ServeInternalServerResponse(w, r, err)
		return
	}

	common.WriteJson(w, http.StatusOK, common.DataEnvelope{Data: u})
}

// HandleUpdateUser godoc
//
//	@Summary		Update user - Moderator/User Access
//	@Description	Update user. Requires authentication and either user ownership or MODERATOR role.
//	@Tags			users
//	@Accept			json
//	@Produce		json
//	@Param			userID	path		string						true	"User ID"
//	@Param			payload	body		entity.UpdateUserRequest	true	"User metadata update payload"
//	@Success		200		{object}	common.DataEnvelope{data=entity.User}
//	@Failure		400		{object}	common.ErrorEnvelope
//	@Failure		401		{object}	common.ErrorEnvelope
//	@Failure		403		{object}	common.ErrorEnvelope
//	@Failure		500		{object}	common.ErrorEnvelope
//	@Router			/users/{userID} [put]
func (h *Handler) HandleUpdateUser(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), time.Second*30)
	defer cancel()

	sess, err := h.service.Auth.GetRequestSession(r, false)
	if err != nil {
		common.ServeBadRequestResponse(w, r, err)
		return
	}

	uID, err := common.ParseIDURLParam(r, "userID")
	if err != nil {
		common.ServeBadRequestResponse(w, r, err)
		return
	}

	common.Logger.Debug("updating user",
		slog.Any("userID", uID),
		slog.Bool("can", sess.Roles.IsModerator() || sess.IsUser(&uID)),
		slog.String("component", "user.handler"),
		slog.String("method", "HandleUpdateUser"))

	if !sess.Roles.IsModerator() && !sess.IsUser(&uID) {
		common.ServeForbiddenResponse(w, r)
		return
	}

	data, err := common.ReadJson[entity.UserUpdateRequest](w, r)
	if err != nil {
		common.ServeBadRequestResponse(w, r, err)
		return
	}

	u, err := h.service.User.UpdateUserByID(ctx, &uID, data)
	if err != nil {
		common.Logger.Error("failed to update user",
			slog.Any("error", err),
			slog.String("component", "user.handler"),
			slog.String("method", "HandleUpdateUser"))

		if errors.Is(err, apperror.ErrUserNotFound) {
			common.ServeNotFoundResponse(w, r, err)
			return
		}

		common.ServeInternalServerResponse(w, r, err)
		return
	}

	common.WriteJson(w, http.StatusOK, common.DataEnvelope{Data: u})
}

// HandleUpdateUserAvatar godoc
//
//	@Summary		Update user avatar - Moderator/User Access
//	@Description	Update user avatar image. Requires authentication and either user ownership or MODERATOR role.
//	@Tags			users
//	@Accept			multipart/form-data
//	@Produce		json
//	@Param			userID	path		string	true	"User ID"
//	@Param			avatar	formData	file	true	"User Avatar Image"
//	@Success		200		{object}	common.DataEnvelope{data=entity.User}
//	@Failure		400		{object}	common.ErrorEnvelope
//	@Failure		401		{object}	common.ErrorEnvelope
//	@Failure		403		{object}	common.ErrorEnvelope
//	@Failure		404		{object}	common.ErrorEnvelope
//	@Failure		500		{object}	common.ErrorEnvelope
//	@Router			/users/{userID}/avatar [put]
func (h *Handler) HandleUpdateUserAvatar(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Minute)
	defer cancel()

	sess, err := h.service.Auth.GetRequestSession(r, false)
	if err != nil {
		common.ServeBadRequestResponse(w, r, err)
		return
	}

	uID, err := common.ParseIDURLParam(r, "userID")
	if err != nil {
		common.ServeBadRequestResponse(w, r, err)
		return
	}

	if !sess.Roles.IsModerator() && !sess.IsUser(&uID) {
		common.ServeForbiddenResponse(w, r)
		return
	}

	u, err := h.service.User.GetUserByID(ctx, &uID)
	if err != nil {
		if errors.Is(err, apperror.ErrUserNotFound) {
			common.ServeNotFoundResponse(w, r, err)
			return
		}
		common.ServeInternalServerResponse(w, r, err)
		return
	}

	if err := r.ParseMultipartForm(common.MaxUploadSize); err != nil {
		common.ServeBadRequestResponse(w, r, err)
		return
	}

	avatarPath, err := common.DefaultUploader.SaveFile(r, "avatar", common.UserImagesPath)
	if err != nil {
		common.ServeBadRequestResponse(w, r, err)
		return
	}

	oldAvatarURL := u.AvatarURL
	newAvatarURL := "/uploads/" + avatarPath
	u.AvatarURL = &newAvatarURL
	u.UpdatedAt = time.Now()

	_, err = h.service.User.UpdateUser(ctx, u, &entity.UserUpdateRequest{
		Email:       u.Email,
		UserName:    u.UserName,
		FirstName:   u.FirstName,
		LastName:    u.LastName,
		AvatarURL:   u.AvatarURL,
		Bio:         u.Bio,
		SocialLinks: u.SocialLinks,
	})
	if err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}

	if oldAvatarURL != nil && strings.HasPrefix(*oldAvatarURL, "/uploads/") {
		oldPath := strings.TrimPrefix(*oldAvatarURL, "/uploads/")
		common.DefaultUploader.DeleteFiles([]string{oldPath})
	}

	common.WriteJson(w, http.StatusOK, common.DataEnvelope{Data: u})
}

// HandleGetUserList godoc
//
//	@Summary		Get user list - Moderator Access
//	@Description	Get a paginated list of all users. Requires authentication and MODERATOR role.
//	@Tags			users
//	@Accept			json
//	@Produce		json
//	@Param			page		query		integer		true	"Page number (starting from 1)"
//	@Param			limit		query		integer		false	"Items per page (1-100)"	default(10)
//	@Param			search		query		string		false	"Search keyword"
//	@Param			direction	query		string		false	"Sort direction"							Enums(asc,desc)		default(desc)
//	@Param			order		query		string		false	"Order by field"							Enums(created_at)	default(created_at)
//	@Param			roles		query		[]string	false	"Filter by roles (can specify multiple)"	Enums(Admin,Moderator,Publisher,SuperAdmin,Accountant)
//	@Success		200			{object}	common.DataMetaEnvelope{data=[]entity.User,meta=common.ListMetaEnvelope}
//	@Failure		400			{object}	common.ErrorEnvelope
//	@Failure		401			{object}	common.ErrorEnvelope
//	@Failure		403			{object}	common.ErrorEnvelope
//	@Failure		500			{object}	common.ErrorEnvelope
//	@Router			/users [get]
func (h *Handler) HandleGetUserList(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), time.Second*30)
	defer cancel()

	q := entity.NewUserSearchQueryDefault()
	if err := q.Parse(r); err != nil {
		common.ServeBadRequestResponse(w, r, apperror.ErrBadRequest)
		return
	}

	list, err := h.service.User.GetUsers(ctx, q)
	if err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}

	common.WriteJson(w, http.StatusOK, common.DataMetaEnvelope{
		Data: list,
		Meta: common.ListMetaEnvelope{
			Offset: q.GetOffset(),
			Limit:  q.Limit,
		},
	})
}

// HandleDeleteUser godoc
//
//	@Summary		Delete user - Admin Access
//	@Description	Delete a user and all associated data. Requires authentication and admin role.
//	@Tags			users
//	@Accept			json
//	@Produce		json
//	@Param			userID	path		string	true	"User ID"
//	@Success		200		{object}	common.DataEnvelope{data=nil}
//	@Failure		400		{object}	common.ErrorEnvelope
//	@Failure		401		{object}	common.ErrorEnvelope
//	@Failure		403		{object}	common.ErrorEnvelope
//	@Failure		404		{object}	common.ErrorEnvelope
//	@Failure		500		{object}	common.ErrorEnvelope
//	@Router			/users/{userID} [delete]
func (h *Handler) HandleDeleteUser(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), time.Second*30)
	defer cancel()

	uID, err := common.ParseIDURLParam(r, "userID")
	if err != nil {
		common.Logger.Error("failed to parse user ID",
			slog.Any("error", err),
			slog.String("component", "handler.user"),
			slog.String("method", "HandleDeleteUserByID"))
		common.ServeBadRequestResponse(w, r, err)
		return
	}

	_, err = h.service.User.DeleteUserByID(ctx, &uID)
	if err != nil {
		common.Logger.Error("failed to delete user",
			slog.Any("error", err),
			slog.String("component", "handler.user"),
			slog.String("method", "HandleDeleteUserByID"))
		common.ServeInternalServerResponse(w, r, err)
		return
	}

	common.Logger.Error("deleted user",
		slog.Any("error", err),
		slog.Any("userID", uID),
		slog.String("component", "handler.user"),
		slog.String("method", "HandleDeleteUserByID"))

	common.WriteJson(w, http.StatusOK, common.DataEnvelope{Data: nil})
}

// HandleUpdateUserRoles godoc
//
//	@Summary		Update user roles - admin Access
//	@Description	Update user roles. Requires authentication and admin role.
//	@Tags			users
//	@Accept			json
//	@Produce		json
//	@Param			userID	path		string							true	"User ID"
//	@Param			payload	body		entity.UpdateUserRolesRequest	true	"User roles payload"
//	@Success		200		{object}	common.DataEnvelope{data=entity.User}
//	@Failure		400		{object}	common.ErrorEnvelope
//	@Failure		401		{object}	common.ErrorEnvelope
//	@Failure		403		{object}	common.ErrorEnvelope
//	@Failure		500		{object}	common.ErrorEnvelope
//	@Router			/users/{userID}/roles [put]
func (h *Handler) HandleUpdateUserRoles(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), time.Second*30)
	defer cancel()

	sess, err := h.service.Auth.GetRequestSession(r, false)
	if err != nil {
		common.ServeBadRequestResponse(w, r, err)
		return
	}

	uID, err := common.ParseIDURLParam(r, "userID")
	if err != nil {
		common.ServeBadRequestResponse(w, r, err)
		return
	}

	data, err := common.ReadJson[entity.UpdateUserRolesRequest](w, r)
	if err != nil {
		common.Logger.Error("failed to read json",
			slog.Any("error", err),
			slog.String("adminID", sess.UserID.String()),
			slog.String("useID", uID.String()),
			slog.String("component", "user.handler"),
			slog.String("method", "HandleUpdateUserRoles"))

		common.ServeBadRequestResponse(w, r, err)
		return
	}

	if err := common.Validator.Struct(data); err != nil {
		common.ServeBadRequestResponse(w, r, err)
		return
	}

	u, err := h.service.User.UpdateUserRolesByID(ctx, &uID, data)
	if err != nil {
		common.Logger.Error("failed to update user roles",
			slog.Any("error", err),
			slog.String("adminID", sess.UserID.String()),
			slog.String("useID", uID.String()),
			slog.String("component", "user.handler"),
			slog.String("method", "HandleUpdateUserRolesByID"))

		if errors.Is(err, apperror.ErrUserNotFound) {
			common.ServeNotFoundResponse(w, r, err)
			return
		}

		if errors.Is(err, apperror.ErrUserNotFound) {
			common.ServeNotFoundResponse(w, r, err)
			return
		}

		common.ServeInternalServerResponse(w, r, err)
		return
	}

	common.Logger.Info("updated user roles",
		slog.String("adminID", sess.UserID.String()),
		slog.String("useID", uID.String()),
		slog.String("component", "user.handler"),
		slog.String("method", "HandleUpdateUserRolesByID"))

	common.WriteJson(w, http.StatusOK, common.DataEnvelope{Data: u})
}

func (h *Handler) HandleExportUsers(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 20*time.Second)
	defer cancel()

	sess, err := h.service.Auth.GetRequestSession(r, false)
	if err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}

	if !sess.IsAuth() {
		common.ServeNotFoundResponse(w, r, apperror.ErrUserNotAuthorized)
		return
	}

	if !sess.Roles.IsSuperAdmin() && !sess.Roles.IsAdmin() && !sess.Roles.IsAccountant() {
		common.Logger.Warn("unauthorized export users access attempt",
			slog.String("userID", sess.UserID.String()),
			slog.String("component", "handler.user"),
			slog.String("method", "HandleExportUsers"))
		common.ServeForbiddenResponse(w, r)
		return
	}

	Users, count, err := h.service.User.ExportUsers(ctx)
	if err != nil {
		log.Printf("Error fetching users from database: %v", err)
		http.Error(w, fmt.Sprintf("Failed to fetch users: %v", err), http.StatusInternalServerError)
		return
	}

	timestamp := time.Now().Format("20060102_150405")
	filename := fmt.Sprintf("Ariatoon_Users_%s.csv", timestamp)

	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))

	// Write UTF-8 BOM for Excel
	w.Write([]byte{0xEF, 0xBB, 0xBF})
	writer := csv.NewWriter(w)
	defer writer.Flush()

	// CSV header
	writer.Write([]string{
		"userid",
		"email",
		"user_name",
		"first_name",
		"last_name",
		"bio",
		"roles",
		"created_at",
		"updated_at",
	})

	for _, user := range Users {
		// Convert each role to string
		roleStrings := make([]string, len(user.Roles))
		for i, role := range user.Roles {
			roleStrings[i] = string(role)
		}
		rolesStr := strings.Join(roleStrings, ", ")

		bio := ""
		if user.Bio != nil {
			bio = *user.Bio
		}

		row := []string{
			user.ID.String(),
			user.Email,
			user.UserName,
			*user.FirstName,
			*user.LastName,
			bio,
			rolesStr,
			user.CreatedAt.Format("2006-01-02 15:04:05"),
			user.UpdatedAt.Format("2006-01-02 15:04:05"),
		}

		if err := writer.Write(row); err != nil {
			log.Printf("Error writing row: %v", err)
			continue
		}
	}
	writer.Write([]string{})
	writer.Write([]string{"SUMMARY"})
	writer.Write([]string{"Total Users", strconv.Itoa(count)})
}

type submitVerificationRequest struct {
	IDFrontURL string `json:"id_front_url" validate:"required"`
	IDBackURL  string `json:"id_back_url" validate:"required"`
	SelfieURL  string `json:"selfie_url" validate:"required"`
}

// HandleSubmitVerification godoc
//
//	@Summary		Submit user verification documents
//	@Description	Submit ID front, ID back, and selfie URLs for identity verification
//	@Tags			users
//	@Accept			json
//	@Produce		json
//	@Param			payload	body		submitVerificationRequest	true	"Verification document URLs"
//	@Success		200		{object}	common.DataEnvelope{data=entity.UserVerification}
//	@Failure		400		{object}	common.ErrorEnvelope
//	@Failure		401		{object}	common.ErrorEnvelope
//	@Failure		500		{object}	common.ErrorEnvelope
//	@Router			/users/verification [post]
func (h *Handler) HandleSubmitVerification(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), time.Second*30)
	defer cancel()

	sess, err := h.service.Auth.GetRequestSession(r, false)
	if err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}

	data, err := common.ReadJson[submitVerificationRequest](w, r)
	if err != nil {
		common.ServeBadRequestResponse(w, r, err)
		return
	}

	if data.IDFrontURL == "" || data.IDBackURL == "" || data.SelfieURL == "" {
		common.ServeBadRequestResponse(w, r, fmt.Errorf("id_front_url, id_back_url, and selfie_url are required"))
		return
	}

	verification, err := h.service.Verification.SubmitVerification(ctx, *sess.UserID, data.IDFrontURL, data.IDBackURL, data.SelfieURL)
	if err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}

	common.WriteJson(w, http.StatusOK, common.DataEnvelope{Data: verification})
}
