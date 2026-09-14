import sys
import os

# Add the backend directory to Python path
sys.path.insert(0, os.path.dirname(__file__))

from app.database import SessionLocal
from app.services.auth_service import AuthService
from app.schemas.user import UserCreate

def seed():
    db = SessionLocal()
    try:
        auth = AuthService(db)
        
        admin_data = UserCreate(
            email="admin@psbc.edu.ph",
            password="admin123",
            full_name="System Administrator",
            role="admin",
            campus="control_room"
        )
        
        try:
            admin = auth.register(admin_data)
            print(f"Admin user created: {admin.email} (ID: {admin.id})")
        except ValueError as e:
            if "already registered" in str(e):
                print("Admin user already exists")
            else:
                print(f"Error: {e}")
                
    finally:
        db.close()

if __name__ == "__main__":
    seed()
