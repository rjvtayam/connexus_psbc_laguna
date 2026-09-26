from fastapi import APIRouter, Depends
from sqlalchemy import asc, case
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User

router = APIRouter()

ROLE_ORDER = {"admin": 0, "principal": 1, "teacher": 2, "staff": 3}


@router.get("")
def list_team_members(db: Session = Depends(get_db)):
    """Public, read-only roster for the landing page's Teams modal.

    Returns only display fields (name, role, campus) — never emails, IDs,
    or anything else — and is intentionally unauthenticated.
    """
    users = (
        db.query(User)
        .filter(User.is_active == True, User.deleted_at.is_(None))  # noqa: E712
        .order_by(
            case(*[(User.role == role, rank) for role, rank in ROLE_ORDER.items()], else_=9),
            asc(User.full_name),
        )
        .all()
    )
    return [
        {"full_name": u.full_name, "role": u.role, "campus": u.campus}
        for u in users
    ]
