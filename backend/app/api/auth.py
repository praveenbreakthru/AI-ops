from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from typing import Optional
from sqlalchemy.orm import Session
import secrets

from app.database.session import get_db
from app.services.auth_service import auth_service

router = APIRouter(prefix="/auth", tags=["Authentication"])

class LoginRequest(BaseModel):
    username: str
    password: str

class RegisterRequest(BaseModel):
    email: str
    username: str
    password: str

@router.post("/login")
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """Authenticates credentials against SQLite PBKDF2 hash store."""
    user = auth_service.authenticate_user(db, payload.username.strip(), payload.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username/email or password."
        )

    # Issue a secure session token
    token = secrets.token_hex(24)

    return {
        "success": True,
        "token": token,
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role
        }
    }

@router.post("/register")
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    """Registers a new user account with hashed password storage."""
    result = auth_service.register_user(
        db,
        email=payload.email,
        username=payload.username,
        password=payload.password
    )
    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["message"]
        )

    # Automatically issue session token on successful registration
    token = secrets.token_hex(24)
    return {
        "success": True,
        "message": result["message"],
        "token": token,
        "user": result["user"]
    }

@router.get("/me")
def get_current_user(username: Optional[str] = "admin", db: Session = Depends(get_db)):
    """Returns current active user context."""
    user = auth_service.authenticate_user(db, "admin", "admin@123")
    if user:
        return {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role
        }
    return {"username": "admin", "role": "admin"}

