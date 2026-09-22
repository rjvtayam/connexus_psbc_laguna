import os
import uuid
import math
from datetime import datetime
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, Request
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc, or_
from app.database import get_db
from app.models.user import User
from app.models.meeting_recording import MeetingRecording
from app.schemas.meeting_recording import RecordingOut, RecordingListResponse
from app.api.deps import get_current_user
from app.middleware.rate_limit import limiter
from app.signaling.events import sio
from app.config import settings

router = APIRouter()

UPLOAD_DIR = Path(settings.UPLOAD_DIR) if hasattr(settings, 'UPLOAD_DIR') else Path(__file__).resolve().parents[4] / "uploads" / "recordings"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MAX_RECORDING_SIZE = 500 * 1024 * 1024  # 500MB


@router.post("/upload", response_model=RecordingOut)
@limiter.limit("5/minute")
async def upload_recording(
    request: Request,
    file: UploadFile = File(...),
    title: str = Form(...),
    description: str = Form(""),
    duration_seconds: int = Form(0),
    room_id: str = Form(""),
    started_at: str = Form(""),
    ended_at: str = Form(""),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can upload recordings")

    content = await file.read()
    if len(content) > MAX_RECORDING_SIZE:
        raise HTTPException(status_code=413, detail="Recording file too large (max 500MB)")

    # Validate file type
    allowed_mime_types = ["video/webm", "video/mp4", "video/ogg", "video/x-matroska"]
    if file.content_type and file.content_type not in allowed_mime_types:
        raise HTTPException(status_code=400, detail=f"Invalid file type. Allowed: {', '.join(allowed_mime_types)}")

    ext = os.path.splitext(file.filename or "recording.webm")[1] or ".webm"
    safe_filename = f"{uuid.uuid4()}{ext}"
    filepath = UPLOAD_DIR / safe_filename

    with open(filepath, "wb") as f:
        f.write(content)

    started_at_dt = None
    ended_at_dt = None
    if started_at:
        try:
            started_at_dt = datetime.fromisoformat(started_at.replace("Z", "+00:00"))
        except Exception:
            pass
    if ended_at:
        try:
            ended_at_dt = datetime.fromisoformat(ended_at.replace("Z", "+00:00"))
        except Exception:
            pass

    recording = MeetingRecording(
        title=title,
        description=description or None,
        filename=safe_filename,
        original_filename=file.filename,
        file_size=len(content),
        duration_seconds=duration_seconds if duration_seconds else None,
        mime_type=file.content_type or "video/webm",
        status="completed",
        started_at=started_at_dt,
        ended_at=ended_at_dt,
        created_by=current_user.id,
        room_id=room_id or None,
    )
    db.add(recording)
    db.commit()
    db.refresh(recording)

    out = _recording_to_out(recording, current_user.full_name)
    try:
        await sio.emit("recording_uploaded", {
            "recording": {
                "id": str(out.id),
                "title": out.title,
                "duration_seconds": out.duration_seconds,
                "file_size": out.file_size,
                "created_at": out.created_at.isoformat() if out.created_at else None,
                "creator_name": out.creator_name,
            },
            "uploaded_by": current_user.full_name,
        })
    except Exception:
        pass

    return out


@router.get("", response_model=RecordingListResponse)
@limiter.limit("30/minute")
async def list_recordings(
    request: Request,
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=50),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    search: str = Query(""),
    trash: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can list recordings")

    query = db.query(MeetingRecording)

    if trash:
        query = query.filter(MeetingRecording.deleted_at.isnot(None))
    else:
        query = query.filter(MeetingRecording.deleted_at.is_(None))

    if search:
        query = query.filter(MeetingRecording.title.ilike(f"%{search}%"))

    allowed_sorts = {"created_at", "duration_seconds", "file_size", "title"}
    sort_field = sort_by if sort_by in allowed_sorts else "created_at"
    sort_col = getattr(MeetingRecording, sort_field)
    query = query.order_by(desc(sort_col) if sort_order == "desc" else asc(sort_col))

    total = query.count()
    total_pages = math.ceil(total / page_size) if total > 0 else 1
    recordings = query.offset((page - 1) * page_size).limit(page_size).all()

    # Batch fetch creators to avoid N+1 query
    creator_ids = {r.created_by for r in recordings}
    creators = db.query(User).filter(User.id.in_(creator_ids)).all() if creator_ids else []
    creator_map = {str(c.id): c.full_name for c in creators}

    items = []
    for r in recordings:
        creator_name = creator_map.get(str(r.created_by), "Unknown")
        items.append(_recording_to_out(r, creator_name))

    return RecordingListResponse(
        recordings=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/{recording_id}/stream")
async def stream_recording(
    recording_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can stream recordings")

    recording = db.query(MeetingRecording).filter(MeetingRecording.id == recording_id).first()
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")

    filepath = UPLOAD_DIR / recording.filename
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Recording file not found")

    return FileResponse(
        filepath,
        media_type=recording.mime_type or "video/webm",
        filename=recording.original_filename or f"{recording.title}.webm",
    )


@router.delete("/{recording_id}")
async def soft_delete_recording(
    recording_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can delete recordings")

    recording = db.query(MeetingRecording).filter(
        MeetingRecording.id == recording_id,
        MeetingRecording.deleted_at.is_(None),
    ).first()
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")

    recording.deleted_at = datetime.utcnow()
    db.commit()

    return {"detail": "Recording moved to trash"}


@router.post("/{recording_id}/restore")
async def restore_recording(
    recording_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can restore recordings")

    recording = db.query(MeetingRecording).filter(
        MeetingRecording.id == recording_id,
        MeetingRecording.deleted_at.isnot(None),
    ).first()
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found in trash")

    recording.deleted_at = None
    db.commit()

    return {"detail": "Recording restored"}


@router.delete("/{recording_id}/permanent")
async def permanent_delete_recording(
    recording_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can permanently delete recordings")

    recording = db.query(MeetingRecording).filter(MeetingRecording.id == recording_id).first()
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")

    filepath = UPLOAD_DIR / recording.filename
    if filepath.exists():
        filepath.unlink()

    db.delete(recording)
    db.commit()

    return {"detail": "Recording permanently deleted"}


def _recording_to_out(recording: MeetingRecording, creator_name: str) -> RecordingOut:
    return RecordingOut(
        id=recording.id,
        title=recording.title,
        description=recording.description,
        filename=recording.filename,
        original_filename=recording.original_filename,
        file_size=recording.file_size,
        duration_seconds=recording.duration_seconds,
        mime_type=recording.mime_type,
        status=recording.status,
        started_at=recording.started_at,
        ended_at=recording.ended_at,
        created_by=recording.created_by,
        creator_name=creator_name,
        room_id=recording.room_id,
        created_at=recording.created_at,
    )
