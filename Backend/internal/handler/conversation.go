package handler

import (
	"context"
	"net/http"
	"time"

	"github.com/OmarHosny18/APP-frontend/common"
	"github.com/google/uuid"
)

// HandleListConversations godoc
//
//	@Summary		List conversations for the authenticated user
//	@Tags			conversations
//	@Produce		json
//	@Router			/conversations [get]
func (h *Handler) HandleListConversations(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), time.Second*30)
	defer cancel()

	sess, err := h.service.Auth.GetRequestSession(r, false)
	if err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}

	convs, err := h.store.Message.ListConversationsByUser(ctx, *sess.UserID)
	if err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}

	common.WriteJson(w, http.StatusOK, common.DataEnvelope{Data: convs})
}

// HandleGetConversation godoc
//
//	@Summary		Get a single conversation thread
//	@Tags			conversations
//	@Produce		json
//	@Param			conversationID	path	string	true	"Conversation UUID"
//	@Router			/conversations/{conversationID} [get]
func (h *Handler) HandleGetConversation(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), time.Second*30)
	defer cancel()

	id, err := common.ParseIDURLParam(r, "conversationID")
	if err != nil {
		common.ServeBadRequestResponse(w, r, err)
		return
	}

	sess, err := h.service.Auth.GetRequestSession(r, false)
	if err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}

	conv, err := h.store.Message.FindConversationByID(ctx, id)
	if err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}
	if conv == nil {
		common.ServeNotFoundResponse(w, r, nil)
		return
	}

	// Ensure the caller is a participant in this conversation.
	participants, err := h.store.Message.GetConversationParticipantIDs(ctx, id)
	if err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}
	callerID := sess.UserID.String()
	isParticipant := false
	for _, pid := range participants {
		if pid == callerID {
			isParticipant = true
			break
		}
	}
	if !isParticipant {
		common.ServeForbiddenResponse(w, r)
		return
	}

	common.WriteJson(w, http.StatusOK, common.DataEnvelope{Data: conv})
}

// HandleCreateConversation godoc
//
//	@Summary		Start a new conversation
//	@Tags			conversations
//	@Accept			json
//	@Produce		json
//	@Router			/conversations [post]
func (h *Handler) HandleCreateConversation(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), time.Second*30)
	defer cancel()

	sess, err := h.service.Auth.GetRequestSession(r, false)
	if err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}

	type createConvInput struct {
		ParticipantID string `json:"participant_id"`
		Kind          string `json:"kind"`
		JobID         string `json:"job_id,omitempty"`
	}

	input, err := common.ReadJson[createConvInput](w, r)
	if err != nil {
		common.ServeBadRequestResponse(w, r, err)
		return
	}

	participantID, err := uuid.Parse(input.ParticipantID)
	if err != nil {
		common.ServeBadRequestResponse(w, r, err)
		return
	}

	conv, err := h.store.Message.CreateDirectConversation(ctx, *sess.UserID, participantID)
	if err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}

	common.WriteJson(w, http.StatusCreated, common.DataEnvelope{Data: conv})
}
