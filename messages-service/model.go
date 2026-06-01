package main

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Message is the MongoDB document stored in the "messages" collection.
type Message struct {
	ID          primitive.ObjectID  `bson:"_id,omitempty"   json:"id"`
	SenderID    int64               `bson:"senderId"        json:"senderId"`
	RecipientID int64               `bson:"recipientId"     json:"recipientId"`
	Content     string              `bson:"content"         json:"content"`
	IsRead      bool                `bson:"isRead"          json:"isRead"`
	CreatedAt   time.Time           `bson:"createdAt"       json:"createdAt"`
	DeletedAt   *time.Time          `bson:"deletedAt"       json:"deletedAt,omitempty"`
}

// MessageResponse is the DTO returned to clients.
type MessageResponse struct {
	ID          string    `json:"id"`
	SenderID    int64     `json:"senderId"`
	RecipientID int64     `json:"recipientId"`
	Content     string    `json:"content"`
	IsRead      bool      `json:"isRead"`
	CreatedAt   time.Time `json:"createdAt"`
}

func toResponse(m Message) MessageResponse {
	return MessageResponse{
		ID:          m.ID.Hex(),
		SenderID:    m.SenderID,
		RecipientID: m.RecipientID,
		Content:     m.Content,
		IsRead:      m.IsRead,
		CreatedAt:   m.CreatedAt,
	}
}

// ConversationSummary groups the last message and unread count per conversation partner.
type ConversationSummary struct {
	PartnerID   int64           `json:"partnerId"`
	LastMessage MessageResponse `json:"lastMessage"`
	UnreadCount int64           `json:"unreadCount"`
}

// SendMessageRequest is the JSON request body for sending a message.
type SendMessageRequest struct {
	Content string `json:"content" binding:"required,max=2000"`
}
