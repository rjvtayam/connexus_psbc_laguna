from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.notification import Notification
from app.api.deps import get_current_user
from app.models.user import User
from uuid import UUID
from app.services.cache import invalidate, get_profile_cache
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("")
def get_notifications(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        notifications = (
            db.query(Notification)
            .filter(Notification.user_id == current_user.id)
            .order_by(Notification.created_at.desc())
            .limit(50)
            .all()
        )
        return [
            {
                "id": str(n.id),
                "title": n.title,
                "message": n.message,
                "type": n.type,
                "is_read": n.is_read,
                "link": n.link,
                "created_at": n.created_at.isoformat() if n.created_at else None,
            }
            for n in notifications
        ]
    except Exception as e:
        logger.warning(f"Notifications query failed (table may not exist): {e}")
        db.rollback()
        return []


@router.get("/unread-count")
def get_unread_count(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        count = (
            db.query(func.count(Notification.id))
            .filter(Notification.user_id == current_user.id, Notification.is_read == False)
            .scalar()
        )
        return {"count": count or 0}
    except Exception as e:
        logger.warning(f"Unread count query failed (table may not exist): {e}")
        db.rollback()
        return {"count": 0}


@router.put("/{notification_id}/read")
def mark_read(notification_id: UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    notif = (
        db.query(Notification)
        .filter(Notification.id == notification_id, Notification.user_id == current_user.id)
        .first()
    )
    if not notif:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    try:
        notif.is_read = True
        db.commit()
        invalidate(get_profile_cache(), "profile")
    except Exception:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to mark as read")
    return {"ok": True}


@router.put("/read-all")
def mark_all_read(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        db.query(Notification).filter(
            Notification.user_id == current_user.id,
            Notification.is_read == False,
        ).update({"is_read": True})
        db.commit()
        invalidate(get_profile_cache(), "profile")
    except Exception:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to mark all as read")
    return {"ok": True}


@router.delete("/{notification_id}")
def delete_notification(notification_id: UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    notif = (
        db.query(Notification)
        .filter(Notification.id == notification_id, Notification.user_id == current_user.id)
        .first()
    )
    if not notif:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    try:
        db.delete(notif)
        db.commit()
        invalidate(get_profile_cache(), "profile")
    except Exception:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to delete notification")
    return {"ok": True}
