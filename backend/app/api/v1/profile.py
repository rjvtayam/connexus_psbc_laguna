import os
import base64
import pyotp
import qrcode
import io
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.audit_log import AuditLog
from app.schemas.user import ProfileUpdate, PasswordChange
from app.api.deps import get_current_user
from app.config import settings
from app.middleware.rate_limit import limiter
from app.utils.security import hash_password, verify_password

router = APIRouter()

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads", "avatars")
os.makedirs(UPLOAD_DIR, exist_ok=True)

AVATAR_URL_BASE = "/api/v1/profile/avatar/file"

ALLOWED_AVATAR_EXTS = {"jpg", "jpeg", "png", "gif", "webp"}


@router.get("/me")
def get_profile(current_user: User = Depends(get_current_user)):
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "campus": current_user.campus,
        "phone": current_user.phone,
        "avatar_url": current_user.avatar_url,
        "two_factor_enabled": current_user.two_factor_enabled,
        "is_active": current_user.is_active,
        "last_login_at": current_user.last_login_at.isoformat() if current_user.last_login_at else None,
        "created_at": current_user.created_at.isoformat() if current_user.created_at else None,
        "updated_at": current_user.updated_at.isoformat() if current_user.updated_at else None,
    }


@router.put("/me")
@limiter.limit("30/minute")
def update_profile(request: Request, data: ProfileUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if data.full_name is not None and len(data.full_name.strip()) > 100:
        raise HTTPException(status_code=400, detail="Name must be 100 characters or less")
    if data.phone is not None and len(data.phone.strip()) > 20:
        raise HTTPException(status_code=400, detail="Phone must be 20 characters or less")
    try:
        if data.email and data.email != current_user.email:
            existing = db.query(User).filter(User.email == data.email, User.id != current_user.id).first()
            if existing:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already in use")
            current_user.email = data.email

        if data.full_name is not None:
            current_user.full_name = data.full_name
        if data.phone is not None:
            current_user.phone = data.phone

        log = AuditLog(
            user_id=current_user.id,
            action="profile_updated",
            details={"fields": [k for k, v in data.model_dump().items() if v is not None]},
            ip_address=request.client.host if request.client else None,
        )
        db.add(log)
        db.commit()
        db.refresh(current_user)
    except HTTPException:
        raise
    except Exception:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update profile")

    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "campus": current_user.campus,
        "phone": current_user.phone,
        "avatar_url": current_user.avatar_url,
        "two_factor_enabled": current_user.two_factor_enabled,
        "is_active": current_user.is_active,
        "last_login_at": current_user.last_login_at.isoformat() if current_user.last_login_at else None,
        "created_at": current_user.created_at.isoformat() if current_user.created_at else None,
        "updated_at": current_user.updated_at.isoformat() if current_user.updated_at else None,
    }


@router.post("/change-password")
@limiter.limit("5/minute")
def change_password(request: Request, data: PasswordChange, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")

    PASSWORD_MIN_LENGTH = 8
    if len(data.new_password) < PASSWORD_MIN_LENGTH:
        raise HTTPException(status_code=400, detail=f"New password must be at least {PASSWORD_MIN_LENGTH} characters")

    try:
        current_user.password_hash = hash_password(data.new_password)

        log = AuditLog(
            user_id=current_user.id,
            action="password_changed",
            ip_address=request.client.host if request.client else None,
        )
        db.add(log)
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to change password")

    return {"message": "Password changed successfully"}


@router.post("/deactivate")
@limiter.limit("5/minute")
def deactivate_account(request: Request, data: PasswordChange, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password is incorrect")

    if not current_user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Account is already deactivated")

    try:
        current_user.is_active = False
        log = AuditLog(
            user_id=current_user.id,
            action="account_deactivated",
            details={"email": current_user.email},
            ip_address=request.client.host if request.client else None,
        )
        db.add(log)
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to deactivate account")

    return {"message": "Account deactivated successfully"}


@router.delete("/me")
@limiter.limit("5/minute")
def delete_account(request: Request, data: PasswordChange, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password is incorrect")

    try:
        current_user.is_active = False
        current_user.deleted_at = datetime.utcnow()
        current_user.two_factor_enabled = False
        current_user.two_factor_secret = None
        log = AuditLog(
            user_id=current_user.id,
            action="account_deleted",
            details={"email": current_user.email},
            ip_address=request.client.host if request.client else None,
        )
        db.add(log)
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to delete account")

    return {"message": "Account deleted successfully"}


@router.post("/avatar")
@limiter.limit("10/minute")
async def upload_avatar(request: Request, file: UploadFile = File(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    content = await file.read()
    if len(content) > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"File must be less than {settings.MAX_UPLOAD_SIZE // (1024*1024)}MB")

    if len(content) < 8:
        raise HTTPException(status_code=400, detail="File is too small or corrupted")

    MAGIC_BYTES = {
        b'\xff\xd8\xff': 'jpg',
        b'\x89PNG': 'png',
        b'GIF8': 'gif',
        b'RIFF': 'webp',
    }
    detected_ext = None
    for magic, ext in MAGIC_BYTES.items():
        if content[:len(magic)] == magic:
            detected_ext = ext
            break
    if not detected_ext:
        raise HTTPException(status_code=400, detail="Invalid image file")

    if detected_ext not in ALLOWED_AVATAR_EXTS:
        raise HTTPException(status_code=400, detail="Image type not allowed")

    safe_filename = f"{current_user.id}.{detected_ext}"
    filepath = os.path.join(UPLOAD_DIR, safe_filename)
    real_upload_dir = os.path.realpath(UPLOAD_DIR)
    real_filepath = os.path.realpath(filepath)
    if not real_filepath.startswith(real_upload_dir):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid filename")

    try:
        with open(real_filepath, "wb") as f:
            f.write(content)

        if current_user.avatar_url and AVATAR_URL_BASE in current_user.avatar_url:
            old_filename = current_user.avatar_url.split("/")[-1]
            old_filepath = os.path.join(UPLOAD_DIR, old_filename)
            real_old = os.path.realpath(old_filepath)
            if os.path.exists(real_old) and real_old != real_filepath:
                os.remove(real_old)

        current_user.avatar_url = f"{AVATAR_URL_BASE}/{safe_filename}"

        log = AuditLog(
            user_id=current_user.id,
            action="avatar_updated",
            ip_address=None,
        )
        db.add(log)
        db.commit()
        db.refresh(current_user)
    except HTTPException:
        raise
    except Exception:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to upload avatar")

    return {"avatar_url": current_user.avatar_url}


@router.delete("/avatar")
def delete_avatar(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        if current_user.avatar_url and AVATAR_URL_BASE in current_user.avatar_url:
            filename = current_user.avatar_url.split("/")[-1]
            filepath = os.path.join(UPLOAD_DIR, filename)
            real_filepath = os.path.realpath(filepath)
            real_upload_dir = os.path.realpath(UPLOAD_DIR)
            if real_filepath.startswith(real_upload_dir) and os.path.exists(real_filepath):
                os.remove(real_filepath)

        current_user.avatar_url = None
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to delete avatar")

    return {"message": "Avatar removed"}


@router.get("/avatar/file/{filename}")
def serve_avatar(filename: str):
    safe = os.path.basename(filename)
    filepath = os.path.join(UPLOAD_DIR, safe)
    real_filepath = os.path.realpath(filepath)
    real_upload_dir = os.path.realpath(UPLOAD_DIR)
    if not real_filepath.startswith(real_upload_dir) or not os.path.exists(real_filepath):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Avatar not found")

    from fastapi.responses import FileResponse
    return FileResponse(real_filepath)


@router.get("/2fa/setup")
def setup_2fa(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.two_factor_enabled:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="2FA is already enabled")

    try:
        secret = pyotp.random_base32()
        current_user.two_factor_secret = secret
        db.commit()

        totp = pyotp.TOTP(secret)
        provisioning_uri = totp.provisioning_uri(
            name=current_user.email,
            issuer_name="CONNEXUS"
        )

        qr = qrcode.make(provisioning_uri)
        buffer = io.BytesIO()
        qr.save(buffer, format="PNG")
        qr_base64 = base64.b64encode(buffer.getvalue()).decode()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to setup 2FA")

    return {
        "secret": secret,
        "qr_code": f"data:image/png;base64,{qr_base64}",
        "provisioning_uri": provisioning_uri,
    }


@router.post("/2fa/verify")
def verify_2fa_setup(code: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not current_user.two_factor_secret:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Please setup 2FA first")

    totp = pyotp.TOTP(current_user.two_factor_secret)
    if not totp.verify(code, valid_window=1):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid code. Please try again.")

    try:
        current_user.two_factor_enabled = True
        db.commit()

        log = AuditLog(
            user_id=current_user.id,
            action="2fa_enabled",
            ip_address=None,
        )
        db.add(log)
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to enable 2FA")

    return {"message": "2FA enabled successfully"}


@router.post("/2fa/disable")
def disable_2fa(data: PasswordChange, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not current_user.two_factor_enabled:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="2FA is not enabled")

    if not verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password is incorrect")

    try:
        current_user.two_factor_enabled = False
        current_user.two_factor_secret = None
        db.commit()

        log = AuditLog(
            user_id=current_user.id,
            action="2fa_disabled",
            ip_address=None,
        )
        db.add(log)
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to disable 2FA")

    return {"message": "2FA disabled successfully"}


@router.get("/activity")
def get_activity(limit: int = 20, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    limit = max(1, min(limit, 100))
    logs = (
        db.query(AuditLog)
        .filter(AuditLog.user_id == current_user.id)
        .order_by(AuditLog.timestamp.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": str(log.id),
            "action": log.action,
            "details": log.details,
            "ip_address": log.ip_address,
            "timestamp": log.timestamp.isoformat() if log.timestamp else None,
        }
        for log in logs
    ]
