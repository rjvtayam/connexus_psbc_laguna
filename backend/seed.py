"""Seed initial users for testing"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.database import SessionLocal
from app.models.user import User
from app.utils.security import hash_password

USERS = [
    {
        "email": "principal_paete@psbc.edu.ph",
        "password": "testprincipal123",
        "full_name": "ARIANNE LOULLE L. GATBONTON",
        "role": "principal",
        "campus": "paete",
    },
    {
        "email": "principal_pagsanjan@psbc.edu.ph",
        "password": "testprincipal123",
        "full_name": "MARIA JENILAH C. OSERO",
        "role": "principal",
        "campus": "pagsanjan",
    },
    {
        "email": "admin@psbc.edu.ph",
        "password": "admin123",
        "full_name": "JUSTIN RAIN M. SANTOS",
        "role": "admin",
        "campus": "control_room",
    },
    {
        "email": "paete@psbc.edu.ph",
        "password": "teacher123",
        "full_name": "REEMA SHANE P. AFABLE",
        "role": "teacher",
        "campus": "paete",
    },
    {
        "email": "pagsanjan@psbc.edu.ph",
        "password": "teacher123",
        "full_name": "MART JACOB C. CABRIGA",
        "role": "teacher",
        "campus": "pagsanjan",
    },
    {
        "email": "staff_paete@psbc.edu.ph",
        "password": "teststaff123",
        "full_name": "RIMER JAMES G. TUMBAGA",
        "role": "staff",
        "campus": "paete",
    },
    {
        "email": "staff2_pagsanjan@psbc.edu.ph",
        "password": "teststaff123",
        "full_name": "ANGELYN GIL BACSAFRA",
        "role": "staff",
        "campus": "pagsanjan",
    },
    {
        "email": "staff_pagsanjan@psbc.edu.ph",
        "password": "teststaff123",
        "full_name": "JUANA FRANCEZKA V. HERRADURA",
        "role": "staff",
        "campus": "pagsanjan",
    },
]


def seed():
    db = SessionLocal()
    try:
        for user_data in USERS:
            existing = db.query(User).filter(User.email == user_data["email"]).first()
            if not existing:
                user = User(
                    email=user_data["email"],
                    password_hash=hash_password(user_data["password"]),
                    full_name=user_data["full_name"],
                    role=user_data["role"],
                    campus=user_data["campus"],
                )
                db.add(user)
                print(f"Created: {user_data['full_name']} ({user_data['email']})")
            else:
                print(f"Exists: {user_data['email']}")

        db.commit()
        print("\nSeed completed!")
        print("\nTest Accounts:")
        print("  Principal (Paete):     principal_paete@psbc.edu.ph / testprincipal123")
        print("  Principal (Pagsanjan): principal_pagsanjan@psbc.edu.ph / testprincipal123")
        print("  Admin:                 admin@psbc.edu.ph / admin123")
        print("  Paete Teacher:         paete@psbc.edu.ph / teacher123")
        print("  Pagsanjan Teacher:     pagsanjan@psbc.edu.ph / teacher123")
        print("  Paete Staff:           staff_paete@psbc.edu.ph / teststaff123")
        print("  Pagsanjan Staff 2:     staff2_pagsanjan@psbc.edu.ph / teststaff123")
        print("  Pagsanjan Staff:       staff_pagsanjan@psbc.edu.ph / teststaff123")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
