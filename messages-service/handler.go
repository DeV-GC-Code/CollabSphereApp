package main

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	repo *Repository
}

func NewHandler(repo *Repository) *Handler {
	return &Handler{repo: repo}
}

// GET /messages/core/conversations
func (h *Handler) GetConversations(c *gin.Context) {
	me := caller(c)
	summaries, err := h.repo.GetConversations(c.Request.Context(), me.UserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if summaries == nil {
		summaries = []ConversationSummary{}
	}
	c.JSON(http.StatusOK, summaries)
}

// GET /messages/core/conversations/:partnerId
func (h *Handler) GetConversation(c *gin.Context) {
	me := caller(c)
	partnerID, err := strconv.ParseInt(c.Param("partnerId"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid partnerId"})
		return
	}

	msgs, err := h.repo.GetConversation(c.Request.Context(), me.UserID, partnerID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if msgs == nil {
		msgs = []MessageResponse{}
	}
	c.JSON(http.StatusOK, msgs)
}

// POST /messages/core/conversations/:partnerId
func (h *Handler) Send(c *gin.Context) {
	me := caller(c)
	partnerID, err := strconv.ParseInt(c.Param("partnerId"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid partnerId"})
		return
	}

	var req SendMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	msg, err := h.repo.Send(c.Request.Context(), me.UserID, partnerID, req.Content)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, msg)
}

// PUT /messages/core/conversations/:partnerId/read
func (h *Handler) MarkRead(c *gin.Context) {
	me := caller(c)
	partnerID, err := strconv.ParseInt(c.Param("partnerId"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid partnerId"})
		return
	}

	if err := h.repo.MarkRead(c.Request.Context(), partnerID, me.UserID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "marked read"})
}

// DELETE /messages/core/:messageId
func (h *Handler) Delete(c *gin.Context) {
	me := caller(c)
	if err := h.repo.SoftDelete(c.Request.Context(), c.Param("messageId"), me.UserID); err != nil {
		var ae appError
		if errors.As(err, &ae) {
			c.JSON(ae.code, gin.H{"error": ae.msg})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}

// GET /messages/core/unread-count
func (h *Handler) UnreadCount(c *gin.Context) {
	me := caller(c)
	count, err := h.repo.CountUnread(c.Request.Context(), me.UserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"count": count})
}
