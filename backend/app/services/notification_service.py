from sqlalchemy.orm import Session
from app.models.notification import Notification
from app.models.user import User
from uuid import UUID
import uuid


class NotificationService:
    def __init__(self, db: Session):
        self.db = db

    def create(self, user_id: UUID, title: str, message: str = "", notif_type: str = "info", link: str = None):
        notif = Notification(
            id=uuid.uuid4(),
            user_id=user_id,
            title=title,
            message=message,
            type=notif_type,
            link=link,
        )
        self.db.add(notif)
        self.db.commit()
        self.db.refresh(notif)
        return notif

    def create_for_campus(self, campus: str, title: str, message: str = "", notif_type: str = "info", link: str = None):
        users = self.db.query(User).filter(User.campus == campus, User.is_active == True).all()
        for user in users:
            self.create(user.id, title, message, notif_type, link)

    def create_for_all(self, title: str, message: str = "", notif_type: str = "info", link: str = None):
        users = self.db.query(User).filter(User.is_active == True).all()
        for user in users:
            self.create(user.id, title, message, notif_type, link)

    def create_for_all_except(self, exclude_user_id: UUID, title: str, message: str = "", notif_type: str = "info", link: str = None):
        users = self.db.query(User).filter(User.is_active == True, User.id != exclude_user_id).all()
        for user in users:
            self.create(user.id, title, message, notif_type, link)

    def create_for_campus_except(self, campus: str, exclude_user_id: UUID, title: str, message: str = "", notif_type: str = "info", link: str = None):
        users = self.db.query(User).filter(User.campus == campus, User.is_active == True, User.id != exclude_user_id).all()
        for user in users:
            self.create(user.id, title, message, notif_type, link)

    def get_unread_count(self, user_id: UUID):
        from sqlalchemy import func
        return self.db.query(func.count(Notification.id)).filter(
            Notification.user_id == user_id,
            Notification.is_read == False,
        ).scalar()

    def mark_read(self, notification_id: UUID, user_id: UUID):
        notif = self.db.query(Notification).filter(
            Notification.id == notification_id,
            Notification.user_id == user_id,
        ).first()
        if notif:
            notif.is_read = True
            self.db.commit()
            return True
        return False

    def mark_all_read(self, user_id: UUID):
        self.db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.is_read == False,
        ).update({"is_read": True})
        self.db.commit()
