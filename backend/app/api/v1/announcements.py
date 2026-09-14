from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel
from app.database import get_db
from app.schemas.announcement import AnnouncementCreate, AnnouncementResponse
from app.schemas.announcement_reaction import ReactionToggle, ReactionSummary
from app.services.announcement_service import AnnouncementService
from app.services.announcement_reaction_service import AnnouncementReactionService
from app.services.notification_service import NotificationService
from app.services.cache import invalidate, get_announcement_cache
from app.api.deps import get_current_user, require_admin
from app.models.user import User
from app.signaling.events import sio

router = APIRouter()


class AnnouncementUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    link: Optional[str] = None
    image_url: Optional[str] = None
    type: Optional[str] = None
    target_campus: Optional[str] = None


@router.post("/", response_model=AnnouncementResponse, status_code=status.HTTP_201_CREATED)
def create_announcement(data: AnnouncementCreate, db: Session = Depends(get_db), user=Depends(require_admin)):
    service = AnnouncementService(db)
    result = service.create_announcement(data, user.id)
    invalidate(get_announcement_cache(), "announcement")
    return result


@router.get("/", response_model=List[AnnouncementResponse])
def list_announcements(
    campus: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    service = AnnouncementService(db)
    return service.get_active_announcements(campus)


@router.get("/{announcement_id}", response_model=AnnouncementResponse)
def get_announcement(announcement_id: UUID, db: Session = Depends(get_db), _=Depends(get_current_user)):
    service = AnnouncementService(db)
    announcement = service.get_announcement_by_id(announcement_id)
    if not announcement:
        raise HTTPException(status_code=404, detail="Announcement not found")
    return announcement


@router.put("/{announcement_id}", response_model=AnnouncementResponse)
def update_announcement(announcement_id: UUID, updates: AnnouncementUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    service = AnnouncementService(db)
    announcement = service.get_announcement_by_id(announcement_id)
    if not announcement:
        raise HTTPException(status_code=404, detail="Announcement not found")
    if announcement.created_by != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only the creator or an admin can edit this bulletin")
    try:
        result = service.update_announcement(announcement_id, updates.model_dump(exclude_unset=True))
        invalidate(get_announcement_cache(), "announcement")
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{announcement_id}")
def soft_delete_announcement(announcement_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    service = AnnouncementService(db)
    announcement = service.get_announcement_by_id(announcement_id)
    if not announcement:
        raise HTTPException(status_code=404, detail="Announcement not found")
    if announcement.created_by != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only the creator or an admin can delete this bulletin")
    try:
        service.soft_delete_announcement(announcement_id)
        invalidate(get_announcement_cache(), "announcement")
        return {"message": "Bulletin deleted"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{announcement_id}/reactions", response_model=dict)
def toggle_reaction(announcement_id: UUID, data: ReactionToggle, db: Session = Depends(get_db), user=Depends(get_current_user), background_tasks: BackgroundTasks = BackgroundTasks()):
    service = AnnouncementReactionService(db)
    result = service.toggle_reaction(announcement_id, user.id, data.emoji)

    if result.get("action") == "added":
        announcement = AnnouncementService(db).get_announcement_by_id(announcement_id)
        if announcement and announcement.created_by != user.id:
            notif_service = NotificationService(db)
            notif_service.create(
                user_id=announcement.created_by,
                title="Reaction to your bulletin",
                message=f"{user.full_name} reacted {data.emoji} to \"{announcement.title}\"",
                notif_type="bulletin",
            )
            creator_id = str(announcement.created_by)
            background_tasks.add_task(_emit_notification, creator_id)

    return result


async def _emit_notification(user_id: str):
    try:
        await sio.emit("notification_update", {"user_id": user_id}, room=f"user_{user_id}")
    except Exception:
        pass


@router.get("/{announcement_id}/reactions", response_model=List[ReactionSummary])
def get_reactions(announcement_id: UUID, db: Session = Depends(get_db), user=Depends(get_current_user)):
    service = AnnouncementReactionService(db)
    return service.get_reactions(announcement_id, user.id)
