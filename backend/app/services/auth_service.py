from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.audit_log import AuditLog
from app.schemas.user import UserCreate, UserLogin, Token, UserResponse, ProfileUpdate, PasswordChange
from app.utils.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token, create_temp_token
from app.services.cache import get_user_list_cache, invalidate

MAX_FAILED_ATTEMPTS = 5
LOCKOUT_DURATION_MINUTES = 30


class AuthService:
    def __init__(self, db: Session):
        self.db = db

    def register(self, user_data: UserCreate) -> User:
        existing = self.db.query(User).filter(User.email == user_data.email).first()
        if existing:
            raise ValueError("Email already registered")

        user = User(
            email=user_data.email,
            password_hash=hash_password(user_data.password),
            full_name=user_data.full_name,
            role=user_data.role,
            campus=user_data.campus,
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        invalidate(get_user_list_cache())
        return user

    def _log_failed_login(self, user: User, email: str, ip_address: str = None):
        user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
        if user.failed_login_attempts >= MAX_FAILED_ATTEMPTS:
            user.locked_until = datetime.utcnow() + timedelta(minutes=LOCKOUT_DURATION_MINUTES)
        log = AuditLog(
            user_id=user.id,
            action="login_failed",
            details={
                "email": email,
                "attempts": user.failed_login_attempts,
                "locked": user.locked_until is not None,
            },
            ip_address=ip_address,
        )
        self.db.add(log)
        self.db.commit()

    def _log_successful_login(self, user: User, ip_address: str = None):
        log = AuditLog(
            user_id=user.id,
            action="login_success",
            details={"email": user.email},
            ip_address=ip_address,
        )
        self.db.add(log)
        self.db.commit()

    def login(self, credentials: UserLogin, ip_address: str = None) -> dict:
        user = self.db.query(User).filter(User.email == credentials.email).first()

        if not user:
            dummy_hash = "$2b$12$" + "x" * 53
            verify_password(credentials.password, dummy_hash)
            raise ValueError("Invalid credentials")

        if not user.is_active:
            raise ValueError("Account is deactivated")

        if user.locked_until and user.locked_until > datetime.utcnow():
            remaining = (user.locked_until - datetime.utcnow()).seconds // 60 + 1
            raise ValueError(f"Account locked. Try again in {remaining} minutes")

        if not verify_password(credentials.password, user.password_hash):
            self._log_failed_login(user, credentials.email, ip_address)
            remaining_attempts = MAX_FAILED_ATTEMPTS - (user.failed_login_attempts or 0)
            if remaining_attempts <= 0:
                raise ValueError("Account locked due to too many failed attempts. Try again later.")
            raise ValueError(f"Invalid credentials. {remaining_attempts} attempts remaining.")

        if user.failed_login_attempts and user.failed_login_attempts > 0:
            user.failed_login_attempts = 0
            user.locked_until = None
            self.db.commit()

        self._log_successful_login(user, ip_address)

        user.last_login_at = datetime.utcnow()
        self.db.commit()

        if user.two_factor_enabled:
            temp_token = create_temp_token(data={"sub": str(user.id), "type": "2fa_pending"})
            return {
                "requires_2fa": True,
                "temp_token": temp_token,
            }

        access_token = create_access_token(data={"sub": str(user.id), "role": user.role, "campus": user.campus})
        refresh_token = create_refresh_token(data={"sub": str(user.id)})

        return {
            "requires_2fa": False,
            "access_token": access_token,
            "refresh_token": refresh_token,
            "user": UserResponse.model_validate(user).model_dump(),
        }

    def refresh_token(self, token: str) -> Token:
        payload = decode_token(token)
        if not payload or payload.get("type") != "refresh":
            raise ValueError("Invalid refresh token")

        user = self.db.query(User).filter(User.id == payload["sub"]).first()
        if not user:
            raise ValueError("User not found")

        if not user.is_active:
            raise ValueError("Account is deactivated")

        access_token = create_access_token(data={"sub": str(user.id), "role": user.role, "campus": user.campus})
        new_refresh_token = create_refresh_token(data={"sub": str(user.id)})

        return Token(
            access_token=access_token,
            refresh_token=new_refresh_token,
            user=UserResponse.model_validate(user),
        )

    def get_current_user(self, user_id: str) -> User:
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError("User not found")
        return user

    def update_profile(self, user: User, data: ProfileUpdate, ip_address: str = None) -> User:
        if data.email and data.email != user.email:
            existing = self.db.query(User).filter(User.email == data.email, User.id != user.id).first()
            if existing:
                raise ValueError("Email already in use")
            user.email = data.email

        if data.full_name is not None:
            user.full_name = data.full_name
        if data.phone is not None:
            user.phone = data.phone

        log = AuditLog(
            user_id=user.id,
            action="profile_updated",
            details={"fields": [k for k, v in data.model_dump().items() if v is not None]},
            ip_address=ip_address,
        )
        self.db.add(log)
        self.db.commit()
        self.db.refresh(user)
        return user

    def change_password(self, user: User, data: PasswordChange, ip_address: str = None) -> None:
        if not verify_password(data.current_password, user.password_hash):
            raise ValueError("Current password is incorrect")

        user.password_hash = hash_password(data.new_password)

        log = AuditLog(
            user_id=user.id,
            action="password_changed",
            ip_address=ip_address,
        )
        self.db.add(log)
        self.db.commit()

    def get_activity_log(self, user_id: str, limit: int = 20) -> list:
        logs = (
            self.db.query(AuditLog)
            .filter(AuditLog.user_id == user_id)
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
