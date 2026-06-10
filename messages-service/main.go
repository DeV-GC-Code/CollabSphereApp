package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func main() {
	_ = godotenv.Load()
	cfg := loadConfig()

	// ── MongoDB ──────────────────────────────────────────────────────────────
	mongoCtx, mongoCancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer mongoCancel()

	mongoClient, err := mongo.Connect(mongoCtx, options.Client().ApplyURI(cfg.MongoURI))
	if err != nil {
		log.Fatalf("[messages-service] MongoDB connect failed: %v", err)
	}
	if err := mongoClient.Ping(mongoCtx, nil); err != nil {
		log.Fatalf("[messages-service] MongoDB ping failed: %v", err)
	}
	log.Printf("[messages-service] Connected to MongoDB")

	db := mongoClient.Database("collabsphere_messages")
	repo := NewRepository(db)
	h := NewHandler(repo)

	// ── Gin router ───────────────────────────────────────────────────────────
	gin.SetMode(gin.ReleaseMode)
	router := gin.New()
	router.Use(gin.Recovery())

	router.GET("/actuator/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "UP"})
	})

	// All /messages/core routes require JWT
	core := router.Group("/messages/core", JWTMiddleware(cfg.JWTSecret))
	{
		core.GET("/conversations", h.GetConversations)
		core.GET("/conversations/:partnerId", h.GetConversation)
		core.POST("/conversations/:partnerId", h.Send)
		core.PUT("/conversations/:partnerId/read", h.MarkRead)
		core.DELETE("/:messageId", h.Delete)
		core.GET("/unread-count", h.UnreadCount)
	}

	// ── HTTP server ──────────────────────────────────────────────────────────
	addr := fmt.Sprintf(":%d", cfg.Port)
	srv := &http.Server{Addr: addr, Handler: router}

	go func() {
		log.Printf("[messages-service] Listening on %s", addr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("[messages-service] Server error: %v", err)
		}
	}()

	// ── Graceful shutdown ────────────────────────────────────────────────────
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("[messages-service] Shutting down …")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_ = srv.Shutdown(ctx)
	_ = mongoClient.Disconnect(ctx)
}
