package main

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

type callerKey struct{}

const callerCtxKey = "caller"

type Caller struct {
	UserID int64
	Email  string
}

// JWTMiddleware extracts and validates the Bearer token, storing the caller in the context.
func JWTMiddleware(secret string) gin.HandlerFunc {
	key := []byte(secret)

	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if !strings.HasPrefix(header, "Bearer ") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Authorization token required"})
			return
		}
		tokenStr := strings.TrimPrefix(header, "Bearer ")

		token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return key, nil
		}, jwt.WithValidMethods([]string{"HS256"}))

		if err != nil || !token.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid token claims"})
			return
		}

		sub, _ := claims["sub"].(string)
		userID, err := strconv.ParseInt(sub, 10, 64)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid subject in token"})
			return
		}

		email, _ := claims["email"].(string)
		c.Set(callerCtxKey, Caller{UserID: userID, Email: email})
		c.Next()
	}
}

// caller retrieves the authenticated caller from Gin context.
func caller(c *gin.Context) Caller {
	v, _ := c.Get(callerCtxKey)
	return v.(Caller)
}
