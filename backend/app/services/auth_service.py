import os
import hmac
import secrets
import hashlib
import logging
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.database.models import User, utc_now

logger = logging.getLogger(__name__)

def hash_password(password: str) -> str:
    """Generates a secure salted PBKDF2-SHA256 password hash."""
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        bytes.fromhex(salt),
        100_000
    )
    return f"{salt}${key.hex()}"

def verify_password(password: str, stored_hash: str) -> bool:
    """Verifies a plain password against the stored salted hash."""
    try:
        if "$" not in stored_hash:
            return False
        salt, key_hex = stored_hash.split("$", 1)
        expected_key = hashlib.pbkdf2_hmac(
            'sha256',
            password.encode('utf-8'),
            bytes.fromhex(salt),
            100_000
        )
        return hmac.compare_digest(expected_key.hex(), key_hex)
    except Exception as e:
        logger.error(f"Password verification error: {e}")
        return False

class AuthService:
    def seed_default_admin(self, db: Session):
        """Ensures the default administrator account exists with hashed credentials."""
        try:
            admin = db.query(User).filter(User.username == "admin").first()
            if not admin:
                logger.info("Seeding default administrator account (username: admin, password: admin@123)...")
                new_admin = User(
                    username="admin",
                    email="admin@gmail.com",
                    password_hash=hash_password("admin@123"),
                    role="admin",
                    created_at=utc_now()
                )
                db.add(new_admin)
                db.commit()
                logger.info("Default administrator seeded successfully.")
        except Exception as e:
            logger.error(f"Error seeding default admin: {e}")
            db.rollback()

    def authenticate_user(self, db: Session, username_or_email: str, password: str) -> Optional[User]:
        """Authenticates user by username or email and validates password hash."""
        user = db.query(User).filter(
            (User.username == username_or_email) | (User.email == username_or_email)
        ).first()
        if not user:
            return None
        if not verify_password(password, user.password_hash):
            return None
        return user

    def register_user(self, db: Session, email: str, username: str, password: str) -> Dict[str, Any]:
        """Registers a new user, storing salted PBKDF2 hash in the database."""
        clean_email = email.strip().lower()
        clean_username = username.strip()

        if not clean_email or not clean_username or not password:
            return {"success": False, "message": "Email, username, and password are required."}

        # Check existing username
        if db.query(User).filter(User.username == clean_username).first():
            return {"success": False, "message": f"Username '{clean_username}' is already taken."}

        # Check existing email
        if db.query(User).filter(User.email == clean_email).first():
            return {"success": False, "message": f"Email '{clean_email}' is already registered."}

        new_user = User(
            username=clean_username,
            email=clean_email,
            password_hash=hash_password(password),
            role="operator",
            created_at=utc_now()
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        return {
            "success": True,
            "message": "Account created successfully.",
            "user": {
                "id": new_user.id,
                "username": new_user.username,
                "email": new_user.email,
                "role": new_user.role
            }
        }

auth_service = AuthService()

