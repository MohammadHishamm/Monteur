package handler

import (
	"context"
	"net/http"
	"strconv"
	"time"

	"github.com/OmarHosny18/APP-frontend/common"
	"github.com/OmarHosny18/APP-frontend/internal/entity"
	"github.com/OmarHosny18/APP-frontend/internal/service"
)

// HandleSendMessage godoc
//
//	@Summary		Send message — User Access
//	@Description	Sends a message in a conversation. Messages containing external contact
//	@Description	information are automatically flagged for admin review.
//	@Tags			messages
//	@Accept			json
//	@Produce		json
//	@Param			conversationID	path		string						true	"Conversation ID"
//	@Param			payload			body		entity.SendMessageInput		true	"Message body"
//	@Success		201	{object}	common.DataEnvelope{data=entity.Message}
//	@Failure		400	{object}	common.ErrorEnvelope
//	@Failure		401	{object}	common.ErrorEnvelope
//	@Failure		403	{object}	common.ErrorEnvelope
//	@Failure		500	{object}	common.ErrorEnvelope
//	@Router			/conversations/{conversationID}/messages [post]
func (h *Handler) HandleSendMessage(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), time.Second*30)
	defer cancel()

	convID, err := common.ParseIDURLParam(r, "conversationID")
	if err != nil {
		common.ServeBadRequestResponse(w, r, err)
		return
	}

	sess, err := h.service.Auth.GetRequestSession(r, false)
	if err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}

	// Ensure the caller is a participant before allowing a write.
	participants, err := h.store.Message.GetConversationParticipantIDs(ctx, convID)
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

	// Reject banned users before hitting the DB write path.
	user, err := h.service.User.GetUserByID(ctx, sess.UserID)
	if err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}
	if user.IsBanned {
		common.ServeForbiddenResponse(w, r)
		return
	}

	input, err := common.ReadJson[entity.SendMessageInput](w, r)
	if err != nil {
		common.ServeBadRequestResponse(w, r, err)
		return
	}

	result, err := h.service.Message.SendMessage(ctx, service.SendMessageParams{
		ConversationID: convID,
		SenderUserID:   *sess.UserID,
		Body:           input.Body,
		Attachment:     input.Attachment,
	})
	if err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}

	go h.notifyConversationRecipients(result.Message, callerID, user.FullName)

	go h.broadcastNewMessage(result.Message)

	common.WriteJson(w, http.StatusCreated, common.DataEnvelope{Data: result.Message})
}

func (h *Handler) notifyConversationRecipients(msg *entity.Message, senderID, senderName string) {
	participantIDs, err := h.store.Message.GetConversationParticipantIDs(context.Background(), msg.ConversationID)
	if err != nil {
		return
	}

	preview := msg.Body
	if len(preview) > 120 {
		preview = preview[:120]
	}
	if senderName == "" {
		senderName = "مستخدم"
	}

	inputs := make([]entity.CreateNotificationParams, 0, len(participantIDs))
	for _, id := range participantIDs {
		if id == senderID {
			continue
		}

		inputs = append(inputs, entity.CreateNotificationParams{
			UserID:   id,
			Type:     "new_message",
			Title:    "رسالة جديدة",
			Message:  senderName + ": " + preview,
			Data:     []byte(`{"conversation_id":"` + msg.ConversationID.String() + `","message_id":"` + msg.ID.String() + `"}`),
			Priority: "normal",
		})
	}

	if len(inputs) == 0 {
		return
	}

	created, err := h.service.CreateNotifications(context.Background(), inputs)
	if err != nil {
		return
	}

	for _, item := range created {
		h.pushNotification(item)
	}
}

// HandleGetMessages godoc
//
//	@Summary		Get messages — User Access
//	@Description	Returns paginated messages for a conversation, ordered oldest-first.
//	@Tags			messages
//	@Produce		json
//	@Param			conversationID	path		string	true	"Conversation ID"
//	@Param			page			query		int		false	"Page number (default 1)"
//	@Param			limit			query		int		false	"Page size (default 50)"
//	@Success		200	{object}	common.DataMetaEnvelope
//	@Failure		400	{object}	common.ErrorEnvelope
//	@Failure		401	{object}	common.ErrorEnvelope
//	@Failure		500	{object}	common.ErrorEnvelope
//	@Router			/conversations/{conversationID}/messages [get]
func (h *Handler) HandleGetMessages(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), time.Second*30)
	defer cancel()

	convID, err := common.ParseIDURLParam(r, "conversationID")
	if err != nil {
		common.ServeBadRequestResponse(w, r, err)
		return
	}

	sess, err := h.service.Auth.GetRequestSession(r, false)
	if err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}

	// Ensure the caller is a participant before exposing messages.
	participants, err := h.store.Message.GetConversationParticipantIDs(ctx, convID)
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

	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if limit <= 0 {
		limit = 50
	}
	if page <= 0 {
		page = 1
	}
	offset := (page - 1) * limit

	msgs, err := h.service.Message.GetMessages(ctx, convID, limit, offset)
	if err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}

	common.WriteJson(w, http.StatusOK, common.DataMetaEnvelope{
		Data: msgs,
		Meta: common.ListMetaEnvelope{
			Page:   page,
			Limit:  limit,
			Offset: offset,
		},
	})
}
