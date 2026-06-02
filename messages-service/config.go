package main

import (
	"fmt"
	"os"
	"strconv"
)

type Config struct {
	Port       int
	MongoURI   string
	JWTSecret  string
	AdminEmail string
}

func loadConfig() Config {
	port, _ := strconv.Atoi(getEnv("PORT", "8010"))
	return Config{
		Port:       port,
		MongoURI:   mustEnv("MONGODB_URI"),
		JWTSecret:  mustEnv("JWT_SECRET"),
		AdminEmail: getEnv("ADMIN_EMAIL", "admin@example.com"),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func mustEnv(key string) string {
	v := os.Getenv(key)
	if v == "" {
		panic(fmt.Sprintf("required env var %q is not set", key))
	}
	return v
}
