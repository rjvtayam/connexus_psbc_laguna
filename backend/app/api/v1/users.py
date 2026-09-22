from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel
from app.database import get_db
from app.schemas.user import UserResponse
from app.services.user_service import UserService
from app.services.cache import invalidate, get_user_list_cache, get_profile_cache
from app.api.deps import get_current_user, require_admin, require_principal

router = APIRouter()


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    campus: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None


@router.get("/", response_model=List[UserResponse])
def list_users(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    service = UserService(db)
    if current_user.role == "admin":
        return service.get_all_users()
    return service.get_users_by_campus(current_user.campus)


@router.get("/by-campus/{campus}", response_model=List[UserResponse])
def list_users_by_campus(campus: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    service = UserService(db)
    return service.get_users_by_campus(campus)


@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: UUID, db: Session = Depends(get_db), _=Depends(get_current_user)):
    service = UserService(db)
    user = service.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.put("/{user_id}", response_model=UserResponse)
def update_user(user_id: UUID, updates: UserUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    if current_user.role not in ("admin", "principal"):
        raise HTTPException(status_code=403, detail="Not authorized")
    service = UserService(db)
    try:
        result = service.update_user(user_id, updates.model_dump(exclude_none=True))
        invalidate(get_user_list_cache(), "users")
        invalidate(get_profile_cache(), "profile")
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{user_id}")
def deactivate_user(user_id: UUID, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    if current_user.role not in ("admin", "principal"):
        raise HTTPException(status_code=403, detail="Not authorized")
    service = UserService(db)
    try:
        service.deactivate_user(user_id, current_user.id)
        invalidate(get_user_list_cache(), "users")
        invalidate(get_profile_cache(), "profile")
        return {"message": "User deactivated"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{user_id}/permanent")
def permanent_delete_user(user_id: UUID, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can permanently delete users")
    service = UserService(db)
    try:
        service.soft_delete_user(user_id, current_user.id)
        invalidate(get_user_list_cache(), "users")
        invalidate(get_profile_cache(), "profile")
        return {"message": "User permanently deleted (soft delete)"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{user_id}/restore")
def restore_user(user_id: UUID, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    if current_user.role not in ("admin", "principal"):
        raise HTTPException(status_code=403, detail="Not authorized")
    service = UserService(db)
    try:
        service.restore_user(user_id, current_user.id)
        invalidate(get_user_list_cache(), "users")
        invalidate(get_profile_cache(), "profile")
        return {"message": "User restored"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
