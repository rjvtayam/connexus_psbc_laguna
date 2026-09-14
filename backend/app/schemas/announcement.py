from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime


class AnnouncementCreate(BaseModel):
    title: str
    content: Optional[str] = None
    link: Optional[str] = None
    image_url: Optional[str] = None
    type: str = "bulletin"
    target_campus: str = "both"
    display_until: Optional[datetime] = None


class AnnouncementResponse(BaseModel):
    id: UUID
    title: str
    content: Optional[str]
    link: Optional[str]
    image_url: Optional[str]
    type: str
    target_campus: str
    created_by: UUID
    creator_name: Optional[str] = None
    is_active: bool
    display_until: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True
