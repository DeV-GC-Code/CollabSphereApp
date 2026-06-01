package main

import (
	"context"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type Repository struct {
	col *mongo.Collection
}

func NewRepository(db *mongo.Database) *Repository {
	col := db.Collection("messages")
	// Ensure indexes
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	col.Indexes().CreateMany(ctx, []mongo.IndexModel{ //nolint:errcheck
		{Keys: bson.D{{Key: "senderId", Value: 1}}},
		{Keys: bson.D{{Key: "recipientId", Value: 1}}},
		{Keys: bson.D{{Key: "createdAt", Value: -1}}},
		{Keys: bson.D{{Key: "senderId", Value: 1}, {Key: "recipientId", Value: 1}, {Key: "createdAt", Value: -1}},
			Options: options.Index().SetName("conversation_created_idx")},
	})
	return &Repository{col: col}
}

// GetConversations returns inbox summaries (last message + unread count per partner).
func (r *Repository) GetConversations(ctx context.Context, userID int64) ([]ConversationSummary, error) {
	pipeline := mongo.Pipeline{
		{{"$match", bson.D{
			{"deletedAt", nil},
			{"$or", bson.A{
				bson.D{{"senderId", userID}},
				bson.D{{"recipientId", userID}},
			}},
		}}},
		{{"$sort", bson.D{{"createdAt", -1}}}},
		{{"$addFields", bson.D{
			{"partnerID", bson.D{{"$cond", bson.D{
				{"if", bson.D{{"$eq", bson.A{"$senderId", userID}}}},
				{"then", "$recipientId"},
				{"else", "$senderId"},
			}}}},
			{"isUnread", bson.D{{"$and", bson.A{
				bson.D{{"$eq", bson.A{"$recipientId", userID}}},
				bson.D{{"$eq", bson.A{"$isRead", false}}},
			}}}},
		}}},
		{{"$group", bson.D{
			{"_id", "$partnerID"},
			{"lastMessage", bson.D{{"$first", "$$ROOT"}}},
			{"unreadCount", bson.D{{"$sum", bson.D{{"$cond", bson.A{"$isUnread", 1, 0}}}}}},
		}}},
		{{"$sort", bson.D{{"lastMessage.createdAt", -1}}}},
	}

	cursor, err := r.col.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	type aggResult struct {
		ID          int64   `bson:"_id"`
		LastMessage Message `bson:"lastMessage"`
		UnreadCount int64   `bson:"unreadCount"`
	}

	var results []ConversationSummary
	for cursor.Next(ctx) {
		var row aggResult
		if err := cursor.Decode(&row); err != nil {
			continue
		}
		results = append(results, ConversationSummary{
			PartnerID:   row.ID,
			LastMessage: toResponse(row.LastMessage),
			UnreadCount: row.UnreadCount,
		})
	}
	return results, cursor.Err()
}

// GetConversation returns the full message thread between two users, oldest first.
func (r *Repository) GetConversation(ctx context.Context, userID, partnerID int64) ([]MessageResponse, error) {
	filter := bson.D{
		{"deletedAt", nil},
		{"$or", bson.A{
			bson.D{{"senderId", userID}, {"recipientId", partnerID}},
			bson.D{{"senderId", partnerID}, {"recipientId", userID}},
		}},
	}
	opts := options.Find().SetSort(bson.D{{Key: "createdAt", Value: 1}})
	cursor, err := r.col.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var msgs []MessageResponse
	for cursor.Next(ctx) {
		var m Message
		if err := cursor.Decode(&m); err != nil {
			continue
		}
		msgs = append(msgs, toResponse(m))
	}
	return msgs, cursor.Err()
}

// Send inserts a new message and returns it.
func (r *Repository) Send(ctx context.Context, senderID, recipientID int64, content string) (MessageResponse, error) {
	msg := Message{
		ID:          primitive.NewObjectID(),
		SenderID:    senderID,
		RecipientID: recipientID,
		Content:     strings.TrimSpace(content),
		IsRead:      false,
		CreatedAt:   time.Now().UTC(),
	}
	_, err := r.col.InsertOne(ctx, msg)
	if err != nil {
		return MessageResponse{}, err
	}
	return toResponse(msg), nil
}

// MarkRead marks all messages from partnerID to recipientID as read.
func (r *Repository) MarkRead(ctx context.Context, senderID, recipientID int64) error {
	filter := bson.D{
		{"senderId", senderID},
		{"recipientId", recipientID},
		{"isRead", false},
		{"deletedAt", nil},
	}
	_, err := r.col.UpdateMany(ctx, filter, bson.D{{"$set", bson.D{{"isRead", true}}}})
	return err
}

// SoftDelete marks the caller's message as deleted.
func (r *Repository) SoftDelete(ctx context.Context, messageID string, callerID int64) error {
	oid, err := primitive.ObjectIDFromHex(messageID)
	if err != nil {
		return errNotFound("message not found")
	}

	filter := bson.D{{"_id", oid}, {"deletedAt", nil}}
	var msg Message
	if err := r.col.FindOne(ctx, filter).Decode(&msg); err != nil {
		return errNotFound("message not found")
	}
	if msg.SenderID != callerID {
		return errForbidden("cannot delete another user's message")
	}

	now := time.Now().UTC()
	_, err = r.col.UpdateOne(ctx, bson.D{{"_id", oid}}, bson.D{{"$set", bson.D{{"deletedAt", now}}}})
	return err
}

// CountUnread returns how many unread messages the user has received.
func (r *Repository) CountUnread(ctx context.Context, userID int64) (int64, error) {
	return r.col.CountDocuments(ctx, bson.D{
		{"recipientId", userID},
		{"isRead", false},
		{"deletedAt", nil},
	})
}

// Sentinel error types for handler distinction.
type appError struct{ code int; msg string }

func (e appError) Error() string { return e.msg }
func errNotFound(msg string) appError  { return appError{404, msg} }
func errForbidden(msg string) appError { return appError{403, msg} }
