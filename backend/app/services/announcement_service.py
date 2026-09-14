from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from app.models.announcement import Announcement
from app.schemas.announcement import AnnouncementCreate


class AnnouncementService:
    def __init__(self, db: Session):
        self.db = db

    def create_announcement(self, data: AnnouncementCreate, created_by: UUID) -> Announcement:
        announcement = Announcement(
            title=data.title,
            content=data.content,
            link=data.link,
            image_url=data.image_url,
            type=data.type,
            target_campus=data.target_campus,
            created_by=created_by,
            display_until=data.display_until,
        )
        self.db.add(announcement)
        self.db.commit()
        self.db.refresh(announcement)
        return announcement

    def get_active_announcements(self, campus: Optional[str] = None) -> List[dict]:
        query = self.db.query(Announcement).filter(
            Announcement.is_active == True,
            Announcement.deleted_at.is_(None),
        )

        if campus and campus != "control_room":
            query = query.filter(
                (Announcement.target_campus == campus) | (Announcement.target_campus == "both")
            )

        announcements = query.order_by(Announcement.created_at.desc()).all()

        from app.models.user import User
        results = []
        for ann in announcements:
            creator = self.db.query(User).filter(User.id == ann.created_by).first()
            results.append({
                "id": ann.id,
                "title": ann.title,
                "content": ann.content,
                "link": ann.link,
                "image_url": ann.image_url,
                "type": ann.type,
                "target_campus": ann.target_campus,
                "created_by": ann.created_by,
                "creator_name": creator.full_name if creator else None,
                "is_active": ann.is_active,
                "display_until": ann.display_until,
                "created_at": ann.created_at,
            })
        return results

    def get_announcement_by_id(self, announcement_id: UUID) -> Optional[Announcement]:
        return self.db.query(Announcement).filter(
            Announcement.id == announcement_id,
            Announcement.deleted_at.is_(None),
        ).first()

    def update_announcement(self, announcement_id: UUID, updates: dict) -> Announcement:
        announcement = self.get_announcement_by_id(announcement_id)
        if not announcement:
            raise ValueError("Announcement not found")

        allowed_fields = {"title", "content", "link", "image_url", "type", "target_campus"}
        for key, value in updates.items():
            if key in allowed_fields and hasattr(announcement, key):
                setattr(announcement, key, value)

        announcement.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(announcement)
        return announcement

    def soft_delete_announcement(self, announcement_id: UUID) -> bool:
        announcement = self.get_announcement_by_id(announcement_id)
        if not announcement:
            raise ValueError("Announcement not found")

        announcement.deleted_at = datetime.utcnow()
        announcement.is_active = False
        self.db.commit()
        return True

    def deactivate_announcement(self, announcement_id: UUID) -> bool:
        announcement = self.get_announcement_by_id(announcement_id)
        if not announcement:
            raise ValueError("Announcement not found")

        announcement.is_active = False
        self.db.commit()
        return True
