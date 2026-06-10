from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.auth import get_current_user
from app.database import get_pool

router = APIRouter(prefix="/notifications/core", tags=["notifications"])

CurrentUser = Annotated[dict, Depends(get_current_user)]


class NotificationOut(BaseModel):
    id: int
    user_id: int
    actor_id: int | None
    type: str
    post_id: int | None
    message: str
    is_read: bool
    created_at: str

    @classmethod
    def from_row(cls, row: dict) -> "NotificationOut":
        return cls(
            id=row["id"],
            user_id=row["user_id"],
            actor_id=row["actor_id"],
            type=row["type"],
            post_id=row["post_id"],
            message=row["message"],
            is_read=row["is_read"],
            created_at=row["created_at"].isoformat(),
        )


@router.get("", response_model=list[NotificationOut])
async def list_notifications(user: CurrentUser, limit: int = 30, offset: int = 0):
    """Return the caller's notifications, newest first."""
    pool = await get_pool()
    rows = await pool.fetch(
        "SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
        user["user_id"], limit, offset,
    )
    return [NotificationOut.from_row(dict(r)) for r in rows]


@router.get("/unread-count")
async def unread_count(user: CurrentUser):
    pool = await get_pool()
    count = await pool.fetchval(
        "SELECT COUNT(*) FROM notifications WHERE user_id=$1 AND is_read=FALSE",
        user["user_id"],
    )
    return {"count": count or 0}


@router.put("/{notification_id}/read", response_model=NotificationOut)
async def mark_read(notification_id: int, user: CurrentUser):
    pool = await get_pool()
    row = await pool.fetchrow(
        "UPDATE notifications SET is_read=TRUE WHERE id=$1 AND user_id=$2 RETURNING *",
        notification_id, user["user_id"],
    )
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    return NotificationOut.from_row(dict(row))


@router.put("/read-all")
async def mark_all_read(user: CurrentUser):
    pool = await get_pool()
    await pool.execute(
        "UPDATE notifications SET is_read=TRUE WHERE user_id=$1 AND is_read=FALSE",
        user["user_id"],
    )
    return {"status": "all marked read"}


@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_notification(notification_id: int, user: CurrentUser):
    pool = await get_pool()
    result = await pool.execute(
        "DELETE FROM notifications WHERE id=$1 AND user_id=$2",
        notification_id, user["user_id"],
    )
    if result == "DELETE 0":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
