import os
import re
import uuid
import math
from datetime import datetime
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, Request, Response
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc, or_
from app.database import get_db
from app.models.user import User
from app.models.meeting_recording import MeetingRecording
from app.schemas.meeting_recording import RecordingOut, RecordingListResponse
from app.api.deps import get_current_user
from app.middleware.rate_limit import limiter
from app.signaling.events import sio, connected_admin_sids
from app.config import settings

router = APIRouter()

# NOTE: Recording files live on the process's local disk. On Render the filesystem is
# EPHEMERAL — everything under uploads/ is lost on every redeploy/restart while the
# database rows survive (the Records page would then 404). Move to external object
# storage (Supabase/S3/Cloudinary) or a mounted Render disk if recordings must persist.
UPLOAD_DIR = Path(settings.UPLOAD_DIR) if hasattr(settings, 'UPLOAD_DIR') else Path(__file__).resolve().parents[4] / "uploads" / "recordings"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MAX_RECORDING_SIZE = 500 * 1024 * 1024  # 500MB
UPLOAD_CHUNK_SIZE = 1024 * 1024  # 1MB — never hold the whole recording in memory


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

    # Validate file type before writing anything to disk.
    # Browsers send the full type with codec parameters (e.g.
    # "video/webm;codecs=vp9,opus") — normalize to the base media type first,
    # otherwise every real recording is rejected as an invalid type.
    base_mime = (file.content_type or "").split(";")[0].strip().lower()
    allowed_mime_types = ["video/webm", "video/mp4", "video/ogg", "video/x-matroska"]
    if base_mime and base_mime not in allowed_mime_types:
        raise HTTPException(status_code=400, detail=f"Invalid file type. Allowed: {', '.join(allowed_mime_types)}")

    ext = os.path.splitext(file.filename or "recording.webm")[1] or ".webm"
    safe_filename = f"{uuid.uuid4()}{ext}"
    filepath = UPLOAD_DIR / safe_filename

    # Stream to disk in 1MB chunks so a 500MB recording never sits in RAM (Render OOM guard)
    size = 0
    try:
        with open(filepath, "wb") as out:
            while True:
                chunk = await file.read(UPLOAD_CHUNK_SIZE)
                if not chunk:
                    break
                size += len(chunk)
                if size > MAX_RECORDING_SIZE:
                    raise HTTPException(status_code=413, detail="Recording file too large (max 500MB)")
                out.write(chunk)
    except HTTPException:
        try:
            filepath.unlink()
        except OSError:
            pass
        raise
    except Exception:
        try:
            filepath.unlink()
        except OSError:
            pass
        raise HTTPException(status_code=500, detail="Failed to store recording file")

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
        file_size=size,
        duration_seconds=duration_seconds if duration_seconds else None,
        mime_type=base_mime or "video/webm",
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
        payload = {
            "recording": {
                "id": str(out.id),
                "title": out.title,
                "duration_seconds": out.duration_seconds,
                "file_size": out.file_size,
                "created_at": out.created_at.isoformat() if out.created_at else None,
                "creator_name": out.creator_name,
            },
            "uploaded_by": current_user.full_name,
        }
        # Only connected admins care about this — do not broadcast metadata to everyone
        for admin_sid in list(connected_admin_sids):
            await sio.emit("recording_uploaded", payload, room=admin_sid)
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
    request: Request,
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

    media_type = recording.mime_type or "video/webm"
    filename = recording.original_filename or f"{recording.title}.webm"
    file_size = filepath.stat().st_size
    range_header = request.headers.get("range")

    if not range_header:
        # Full-body response; advertise Range support so <video> can seek
        return FileResponse(
            filepath,
            media_type=media_type,
            filename=filename,
            headers={"Accept-Ranges": "bytes"},
        )

    # HTTP Range support (206 Partial Content) — required for video seeking
    match = re.match(r"^bytes=(\d*)-(\d*)$", range_header.strip())
    if not match or (not match.group(1) and not match.group(2)):
        return Response(
            status_code=416,
            media_type="text/plain",
            headers={"Content-Range": f"bytes */{file_size}", "Accept-Ranges": "bytes"},
        )

    start_str, end_str = match.group(1), match.group(2)
    if start_str == "":
        # Suffix range: bytes=-N (last N bytes)
        suffix = int(end_str)
        if suffix <= 0:
            return Response(
                status_code=416,
                media_type="text/plain",
                headers={"Content-Range": f"bytes */{file_size}", "Accept-Ranges": "bytes"},
            )
        start = max(0, file_size - suffix)
        end = file_size - 1
    else:
        start = int(start_str)
        end = int(end_str) if end_str else file_size - 1

    if file_size == 0 or start >= file_size or start > end:
        return Response(
            status_code=416,
            media_type="text/plain",
            headers={"Content-Range": f"bytes */{file_size}", "Accept-Ranges": "bytes"},
        )
    end = min(end, file_size - 1)
    length = end - start + 1

    def iter_range(offset: int, count: int, chunk_size: int = 64 * 1024):
        with open(filepath, "rb") as src:
            src.seek(offset)
            remaining = count
            while remaining > 0:
                data = src.read(min(chunk_size, remaining))
                if not data:
                    break
                remaining -= len(data)
                yield data

    return StreamingResponse(
        iter_range(start, length),
        status_code=206,
        media_type=media_type,
        headers={
            "Content-Range": f"bytes {start}-{end}/{file_size}",
            "Accept-Ranges": "bytes",
            "Content-Length": str(length),
        },
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
