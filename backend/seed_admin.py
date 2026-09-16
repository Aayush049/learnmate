import os
import sys

# Add parent directory to path so we can import 'app'
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models.user import User
from app.auth import get_password_hash

def seed_admin():
    db = SessionLocal()
    admin_email = "admin@learnmate.com"
    admin = db.query(User).filter(User.email == admin_email).first()

    if not admin:
        admin = User(
            email=admin_email,
            full_name="System Admin",
            hashed_password=get_password_hash("admin123"),
            is_admin=True,
            is_active=True
        )
        db.add(admin)
        db.commit()
        print("[SUCCESS] Admin created successfully!")
        print("   Email: admin@learnmate.com")
        print("   Password: admin123")
    else:
        admin.is_admin = True
        db.commit()
        print("[SUCCESS] Existing admin@learnmate.com user updated to have admin privileges!")
        print("   Email: admin@learnmate.com")
        print("   Password: (kept original)")

    db.close()

if __name__ == "__main__":
    print("Seeding admin user...")
    seed_admin()
