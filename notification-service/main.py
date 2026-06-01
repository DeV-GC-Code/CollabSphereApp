"""CollabSphere Notification Service — Python + FastAPI"""

import asyncio
import logging
import sys
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI
from fastapi.responses import JSONResponse

from app.config import settings
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

    # Eureka registration (best-effort)
    asyncio.create_task(register_with_eureka())

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


# ── Eureka ────────────────────────────────────────────────────────────────────

async def register_with_eureka() -> None:
    instance_id = f"{settings.service_host}:notification-service:{settings.port}"
    base_url = f"http://{settings.eureka_host}:{settings.eureka_port}/eureka/apps/NOTIFICATION-SERVICE"

    payload = {
        "instance": {
            "instanceId": instance_id,
            "hostName": settings.service_host,
            "app": "NOTIFICATION-SERVICE",
            "ipAddr": settings.service_host,
            "status": "UP",
            "port": {"$": settings.port, "@enabled": "true"},
            "vipAddress": "notification-service",
            "secureVipAddress": "notification-service",
            "metadata": {"management.port": str(settings.port)},
            "dataCenterInfo": {
                "@class": "com.netflix.appinfo.InstanceInfo$DefaultDataCenterInfo",
                "name": "MyOwn",
            },
            "healthCheckUrl": f"http://{settings.service_host}:{settings.port}/actuator/health",
            "statusPageUrl": f"http://{settings.service_host}:{settings.port}/actuator/health",
            "homePageUrl": f"http://{settings.service_host}:{settings.port}/",
        }
    }

    heartbeat_url = f"{base_url}/{instance_id}"

    for attempt in range(1, 11):
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                resp = await client.post(base_url, json=payload)
                if resp.status_code in (200, 204):
                    log.info("[notification-service] Registered with Eureka")
                    break
        except Exception:
            pass
        log.info("[notification-service] Eureka not ready, retry %d/10 …", attempt)
        await asyncio.sleep(5)

    # Heartbeat loop
    while True:
        await asyncio.sleep(25)
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                await client.put(heartbeat_url)
        except Exception:
            pass


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=settings.port, log_level="info")
