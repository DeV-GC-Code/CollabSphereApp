"""
Kafka consumer for CollabSphere notification events.

Consumes Avro-encoded messages published by the Java services through the
Confluent Schema Registry wire format:
  Byte 0  : magic byte (0x00)
  Bytes 1-4: schema ID (big-endian int32)
  Bytes 5+ : Avro binary payload
"""

import asyncio
import io
import json
import logging
import struct
from typing import Any

import asyncpg
import fastavro
import httpx
from aiokafka import AIOKafkaConsumer

from app.config import settings
from app.database import get_pool

log = logging.getLogger(__name__)

# Simple in-process schema cache: schema_id -> parsed fastavro schema
_schema_cache: dict[int, Any] = {}


async def _fetch_schema(schema_id: int) -> Any:
    if schema_id in _schema_cache:
        return _schema_cache[schema_id]
    url = f"{settings.schema_registry_url}/schemas/ids/{schema_id}"
    async with httpx.AsyncClient(timeout=5) as client:
        resp = await client.get(url)
        resp.raise_for_status()
    schema_str = resp.json()["schema"]
    parsed = fastavro.parse_schema(json.loads(schema_str))
    _schema_cache[schema_id] = parsed
    return parsed


async def _deserialize(raw: bytes) -> dict | None:
    if not raw or len(raw) < 5 or raw[0] != 0:
        return None
    schema_id = struct.unpack(">I", raw[1:5])[0]
    schema = await _fetch_schema(schema_id)
    return fastavro.schemaless_reader(io.BytesIO(raw[5:]), schema)


async def _save_notification(pool: asyncpg.Pool, **kwargs) -> None:
    await pool.execute(
        "INSERT INTO notifications (user_id, actor_id, type, post_id, message) VALUES ($1,$2,$3,$4,$5)",
        kwargs["user_id"],
        kwargs.get("actor_id"),
        kwargs["type"],
        kwargs.get("post_id"),
        kwargs["message"],
    )


async def _handle_post_created(pool: asyncpg.Pool, event: dict) -> None:
    """post-created-topic: notify the post author's connections (simplified: notify the author)."""
    user_id = event.get("userid") or event.get("userId") or event.get("id")
    post_id = event.get("id")
    content_preview = (event.get("content") or "")[:80]
    if not user_id:
        return
    await _save_notification(
        pool,
        user_id=user_id,
        actor_id=None,
        type="POST_CREATED",
        post_id=post_id,
        message=f"Your post was published: \"{content_preview}…\"",
    )
    log.info("[consumer] POST_CREATED for user=%s post=%s", user_id, post_id)


async def _handle_post_liked(pool: asyncpg.Pool, event: dict) -> None:
    """post-liked-topic: notify the post owner that someone liked their post."""
    owner_id = event.get("userid") or event.get("userId")
    liker_id = event.get("likedByUserId") or event.get("likedbyuserid")
    post_id = event.get("postid") or event.get("postId")
    if not owner_id or owner_id == liker_id:
        return
    await _save_notification(
        pool,
        user_id=owner_id,
        actor_id=liker_id,
        type="POST_LIKED",
        post_id=post_id,
        message=f"Someone liked your post.",
    )
    log.info("[consumer] POST_LIKED owner=%s liker=%s post=%s", owner_id, liker_id, post_id)


async def _handle_send_connection(pool: asyncpg.Pool, event: dict) -> None:
    """send-connection-topic: notify the receiver of a new connection request."""
    sender_id = event.get("senderId") or event.get("senderid")
    receiver_id = event.get("receiverId") or event.get("receiverid")
    if not receiver_id:
        return
    await _save_notification(
        pool,
        user_id=receiver_id,
        actor_id=sender_id,
        type="CONNECTION_REQUEST",
        post_id=None,
        message="You have a new connection request.",
    )
    log.info("[consumer] CONNECTION_REQUEST sender=%s receiver=%s", sender_id, receiver_id)


async def _handle_accept_connection(pool: asyncpg.Pool, event: dict) -> None:
    """accept-connection-topic: notify the original sender that their request was accepted."""
    sender_id = event.get("senderId") or event.get("senderid")
    receiver_id = event.get("receiverId") or event.get("receiverid")
    if not sender_id:
        return
    await _save_notification(
        pool,
        user_id=sender_id,
        actor_id=receiver_id,
        type="CONNECTION_ACCEPTED",
        post_id=None,
        message="Your connection request was accepted.",
    )
    log.info("[consumer] CONNECTION_ACCEPTED sender=%s receiver=%s", sender_id, receiver_id)


TOPIC_HANDLERS = {
    settings.topic_post_created:     _handle_post_created,
    settings.topic_post_liked:       _handle_post_liked,
    settings.topic_send_connection:  _handle_send_connection,
    settings.topic_accept_connection: _handle_accept_connection,
}


async def run_consumer(shutdown_event: asyncio.Event) -> None:
    """Main Kafka consumer loop. Runs until shutdown_event is set."""
    topics = list(TOPIC_HANDLERS.keys())
    consumer = AIOKafkaConsumer(
        *topics,
        bootstrap_servers=settings.kafka_bootstrap_servers,
        group_id="notification-service-py",
        auto_offset_reset="earliest",
        enable_auto_commit=True,
    )

    try:
        await consumer.start()
        log.info("[consumer] Started, subscribed to: %s", topics)
        pool = await get_pool()

        while not shutdown_event.is_set():
            try:
                batch = await asyncio.wait_for(consumer.getmany(timeout_ms=500, max_records=20), timeout=1.0)
            except asyncio.TimeoutError:
                continue

            for tp, messages in batch.items():
                handler = TOPIC_HANDLERS.get(tp.topic)
                if not handler:
                    continue
                for msg in messages:
                    if not msg.value:
                        continue
                    try:
                        event = await _deserialize(msg.value)
                        if event is None:
                            continue
                        await handler(pool, event)
                    except Exception as exc:
                        log.warning("[consumer] Failed to process %s: %s", tp.topic, exc)
    finally:
        await consumer.stop()
        log.info("[consumer] Stopped")
