"""CollabSphere Notification Service — Python + FastAPI"""

import asyncio
import logging
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.responses import JSONResponse

from app.consumer import run_consumer
from app.database import close_pool, get_pool
from app.router import router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    stream=sys.stdout,
)
log = logging.getLogger("notification-service")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ──────────────────────────────────────────────────────────────
    log.info("[notification-service] Starting …")

    # Bootstrap DB schema
    await get_pool()
    log.info("[notification-service] PostgreSQL ready")

    # Kafka consumer (runs until shutdown)
    shutdown_event = asyncio.Event()
    consumer_task = asyncio.create_task(run_consumer(shutdown_event))

    yield

    # ── Shutdown ─────────────────────────────────────────────────────────────
    log.info("[notification-service] Shutting down …")
    shutdown_event.set()
    await asyncio.wait_for(consumer_task, timeout=10)
    await close_pool()


app = FastAPI(
    title="CollabSphere Notification Service",
    version="1.0.0",
    lifespan=lifespan,
)

app.include_router(router)


@app.get("/actuator/health")
async def health():
    return JSONResponse({"status": "UP"})


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=settings.port, log_level="info")
