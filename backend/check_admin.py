import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from app.database import SessionLocal
from app.models.user import User
from app.utils.security import verify_password, hash_password

def check():
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == "admin@psbc.edu.ph").first()
        if not user:
            print("ERROR: Admin user not found!")
            return
        
        print(f"User found: {user.email}")
        print(f"Password hash: {user.password_hash[:30]}...")
        print(f"Role: {user.role}")
        print(f"Campus: {user.campus}")
        print(f"Is active: {user.is_active}")
        
        result = verify_password("admin123", user.password_hash)
        print(f"Verify admin123: {result}")
        
        if not result:
            print("\nHash mismatch! Re-hashing with current bcrypt...")
            new_hash = hash_password("admin123")
            print(f"New hash: {new_hash[:30]}...")
            user.password_hash = new_hash
            db.commit()
            print("Password updated! Try logging in again.")
        
    finally:
        db.close()

if __name__ == "__main__":
    check()
