from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List
from uuid import UUID
from app.database import get_db
from app.models.bulletin_comment import BulletinComment
from app.models.announcement import Announcement
from app.models.user import User
from app.api.deps import get_current_user
from app.services.notification_service import NotificationService
from app.signaling.events import sio

router = APIRouter()


class CommentCreate(BaseModel):
    message: str


class CommentOut(BaseModel):
    id: UUID
    announcement_id: UUID
    user_id: UUID
    user_name: str
    message: str
    created_at: str


@router.get("/{announcement_id}/comments", response_model=List[CommentOut])
def get_comments(announcement_id: UUID, db: Session = Depends(get_db), _=Depends(get_current_user)):
    comments = (
        db.query(BulletinComment)
        .filter(BulletinComment.announcement_id == announcement_id)
        .order_by(BulletinComment.created_at.asc())
        .all()
    )
    results = []
    for c in comments:
        user = db.query(User).filter(User.id == c.user_id).first()
        results.append(CommentOut(
            id=c.id,
            announcement_id=c.announcement_id,
            user_id=c.user_id,
            user_name=user.full_name if user else "Unknown",
            message=c.message,
            created_at=c.created_at.isoformat() if c.created_at else "",
        ))
    return results


@router.post("/{announcement_id}/comments", response_model=CommentOut, status_code=status.HTTP_201_CREATED)
def add_comment(announcement_id: UUID, data: CommentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user), background_tasks: BackgroundTasks = BackgroundTasks()):
    if not data.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    if len(data.message) > 2000:
        raise HTTPException(status_code=400, detail="Message too long (max 2000 characters)")

    announcement = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    if not announcement:
        raise HTTPException(status_code=404, detail="Announcement not found")

    comment = BulletinComment(
        announcement_id=announcement_id,
        user_id=current_user.id,
        message=data.message.strip(),
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)

    if announcement.created_by != current_user.id:
        notif_service = NotificationService(db)
        notif_service.create(
            user_id=announcement.created_by,
            title="Comment on your bulletin",
            message=f"{current_user.full_name} commented on \"{announcement.title}\"",
            notif_type="bulletin",
        )
        creator_id = str(announcement.created_by)
        background_tasks.add_task(_emit_notification, creator_id)

    return CommentOut(
        id=comment.id,
        announcement_id=comment.announcement_id,
        user_id=comment.user_id,
        user_name=current_user.full_name,
        message=comment.message,
        created_at=comment.created_at.isoformat() if comment.created_at else "",
    )


async def _emit_notification(user_id: str):
    try:
        await sio.emit("notification_update", {"user_id": user_id}, room=f"user_{user_id}")
    except Exception:
        pass


@router.delete("/{announcement_id}/comments/{comment_id}")
def delete_comment(announcement_id: UUID, comment_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    comment = db.query(BulletinComment).filter(
        BulletinComment.id == comment_id,
        BulletinComment.announcement_id == announcement_id,
    ).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    if comment.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    db.delete(comment)
    db.commit()
    return {"ok": True}
