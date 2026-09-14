import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from app.database import SessionLocal
from app.services.auth_service import AuthService
from app.schemas.user import UserCreate

USERS = [
    {"email": "admin@psbc.edu.ph",       "password": "admin123",  "full_name": "System Administrator",  "role": "admin",      "campus": "control_room"},
    {"email": "principal@paete.edu.ph",   "password": "admin123",  "full_name": "Maria Santos",          "role": "principal",  "campus": "paete"},
    {"email": "principal@pagsanjan.edu.ph","password": "admin123", "full_name": "Juan Dela Cruz",        "role": "principal",  "campus": "pagsanjan"},
    {"email": "teacher1@paete.edu.ph",    "password": "admin123",  "full_name": "Ana Reyes",             "role": "teacher",    "campus": "paete"},
    {"email": "teacher1@pagsanjan.edu.ph","password": "admin123",  "full_name": "Carlos Garcia",         "role": "teacher",    "campus": "pagsanjan"},
    {"email": "staff1@paete.edu.ph",      "password": "admin123",  "full_name": "Liza Mendoza",          "role": "staff",      "campus": "paete"},
    {"email": "staff1@pagsanjan.edu.ph",  "password": "admin123",  "full_name": "Pedro Lim",             "role": "staff",      "campus": "pagsanjan"},
]

def seed():
    db = SessionLocal()
    try:
        auth = AuthService(db)
        for u in USERS:
            data = UserCreate(**u)
            try:
                user = auth.register(data)
                print(f"Created: {user.email} ({user.role}/{user.campus})")
            except ValueError as e:
                if "already registered" in str(e):
                    print(f"Exists:  {u['email']}")
                else:
                    print(f"Error:   {u['email']} - {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
