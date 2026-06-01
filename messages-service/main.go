package main

import (
	"bytes"
	"context"
	"encoding/json"
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

	// ── Eureka registration ──────────────────────────────────────────────────
	go registerWithEureka(cfg)

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

func registerWithEureka(cfg Config) {
	instanceID := fmt.Sprintf("%s:messages-service:%d", cfg.ServiceHost, cfg.Port)
	eurekaURL := fmt.Sprintf("http://%s:%s/eureka/apps/MESSAGES-SERVICE", cfg.EurekaHost, cfg.EurekaPort)

	payload := map[string]interface{}{
		"instance": map[string]interface{}{
			"instanceId":      instanceID,
			"hostName":        cfg.ServiceHost,
			"app":             "MESSAGES-SERVICE",
			"ipAddr":          cfg.ServiceHost,
			"status":          "UP",
			"port":            map[string]interface{}{"$": cfg.Port, "@enabled": "true"},
			"vipAddress":      "messages-service",
			"secureVipAddress": "messages-service",
			"metadata":        map[string]string{"management.port": fmt.Sprintf("%d", cfg.Port)},
			"dataCenterInfo": map[string]interface{}{
				"@class": "com.netflix.appinfo.InstanceInfo$DefaultDataCenterInfo",
				"name":   "MyOwn",
			},
			"healthCheckUrl": fmt.Sprintf("http://%s:%d/actuator/health", cfg.ServiceHost, cfg.Port),
			"statusPageUrl":  fmt.Sprintf("http://%s:%d/actuator/health", cfg.ServiceHost, cfg.Port),
			"homePageUrl":    fmt.Sprintf("http://%s:%d/", cfg.ServiceHost, cfg.Port),
		},
	}

	for attempt := 1; attempt <= 10; attempt++ {
		if register(eurekaURL, payload) {
			log.Printf("[messages-service] Registered with Eureka")
			break
		}
		log.Printf("[messages-service] Eureka not ready, retry %d/10 …", attempt)
		time.Sleep(5 * time.Second)
	}

	// Heartbeat every 25 seconds
	heartbeatURL := fmt.Sprintf("http://%s:%s/eureka/apps/MESSAGES-SERVICE/%s",
		cfg.EurekaHost, cfg.EurekaPort, instanceID)
	for {
		time.Sleep(25 * time.Second)
		req, _ := http.NewRequest(http.MethodPut, heartbeatURL, nil)
		resp, err := http.DefaultClient.Do(req)
		if err == nil {
			resp.Body.Close()
		}
	}
}

func register(url string, payload map[string]interface{}) bool {
	body, _ := json.Marshal(payload)
	resp, err := http.Post(url, "application/json", bytes.NewReader(body))
	if err != nil {
		return false
	}
	defer resp.Body.Close()
	return resp.StatusCode == http.StatusNoContent || resp.StatusCode == http.StatusOK
}
