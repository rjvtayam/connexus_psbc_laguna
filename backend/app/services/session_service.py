from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from app.models.session import VideoSession, SessionParticipant
from app.schemas.session import SessionCreate
from app.services.cache import get_session_cache, invalidate


class SessionService:
    def __init__(self, db: Session):
        self.db = db

    def create_session(self, title: str, initiated_by: UUID) -> VideoSession:
        session = VideoSession(
            title=title,
            initiated_by=initiated_by,
            status="active",
        )
        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)
        invalidate(get_session_cache())
        return session

    def get_active_session(self) -> Optional[VideoSession]:
        cache = get_session_cache()
        key = "session:active"
        if key in cache:
            return cache[key]
        result = self.db.query(VideoSession).filter(VideoSession.status == "active").first()
        cache[key] = result
        return result

    def get_session_by_id(self, session_id: UUID) -> Optional[VideoSession]:
        cache = get_session_cache()
        key = f"session:{session_id}"
        if key in cache:
            return cache[key]
        result = self.db.query(VideoSession).filter(VideoSession.id == session_id).first()
        if result:
            cache[key] = result
        return result

    def get_all_sessions(self, limit: int = 50) -> List[VideoSession]:
        cache = get_session_cache()
        key = f"session:list:{limit}"
        if key in cache:
            return cache[key]
        result = self.db.query(VideoSession).order_by(VideoSession.created_at.desc()).limit(limit).all()
        cache[key] = result
        return result

    def join_session(self, session_id: UUID, user_id: UUID) -> SessionParticipant:
        existing = self.db.query(SessionParticipant).filter(
            SessionParticipant.session_id == session_id,
            SessionParticipant.user_id == user_id,
            SessionParticipant.left_at.is_(None),
        ).first()

        if existing:
            return existing

        participant = SessionParticipant(
            session_id=session_id,
            user_id=user_id,
        )
        self.db.add(participant)
        self.db.commit()
        self.db.refresh(participant)
        invalidate(get_session_cache())
        return participant

    def leave_session(self, session_id: UUID, user_id: UUID) -> bool:
        participant = self.db.query(SessionParticipant).filter(
            SessionParticipant.session_id == session_id,
            SessionParticipant.user_id == user_id,
            SessionParticipant.left_at.is_(None),
        ).first()

        if participant:
            participant.left_at = datetime.utcnow()
            self.db.commit()
            invalidate(get_session_cache())
            return True
        return False

    def end_session(self, session_id: UUID) -> VideoSession:
        session = self.get_session_by_id(session_id)
        if not session:
            raise ValueError("Session not found")

        session.status = "ended"
        session.ended_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(session)
        invalidate(get_session_cache())
        return session
