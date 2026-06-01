from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    port: int = 9070
    database_url: str = "postgresql://postgres:postgres@localhost:5432/postgres"
    jwt_secret: str                          # required — no default
    kafka_bootstrap_servers: str = "localhost:9092"
    schema_registry_url: str = "http://localhost:8081"
    eureka_host: str = "localhost"
    eureka_port: int = 8761
    service_host: str = "localhost"
    admin_email: str = "admin@example.com"

    topic_post_created: str = "post-created-topic"
    topic_post_liked: str = "post-liked-topic"
    topic_send_connection: str = "send-connection-topic"
    topic_accept_connection: str = "accept-connection-topic"

    @field_validator("jwt_secret")
    @classmethod
    def jwt_secret_must_be_set(cls, v: str) -> str:
        if not v or len(v) < 32:
            raise ValueError("JWT_SECRET must be at least 32 characters")
        return v


settings = Settings()
