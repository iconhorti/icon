"""
ICON APP - Authentication Router
Real JWT-based login with bcrypt password verification.

NOTE: Uses the `bcrypt` library directly instead of passlib.CryptContext
to avoid a known incompatibility between passlib and bcrypt >= 4.0.0
on Windows where passlib's self-test hashes a 74-byte string and the
newer bcrypt library hard-errors on passwords > 72 bytes.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
import bcrypt as _bcrypt
from datetime import timedelta

from database import get_db
from auth_dep import create_access_token, get_current_user, TOKEN_EXPIRE_HOURS
import models

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ─── Password helpers (direct bcrypt, no passlib) ────────────────────────────
def hash_password(plain: str) -> str:
    """Hash a plaintext password using bcrypt.  Passwords are safely
    truncated to 72 bytes as required by the bcrypt specification."""
    secret = plain.encode("utf-8")[:72]
    return _bcrypt.hashpw(secret, _bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """Verify a plaintext password against a stored bcrypt hash."""
    try:
        secret     = plain.encode("utf-8")[:72]
        hashed_b   = hashed.encode("utf-8") if isinstance(hashed, str) else hashed
        return _bcrypt.checkpw(secret, hashed_b)
    except Exception:
        return False


# ─── Schemas ──────────────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    username: str   # phone_primary or "admin"
    password: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


# ─── Login ───────────────────────────────────────────────────────────────────
@router.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    """
    Authenticate and return a real JWT access token.
    Username = phone_primary (or 'admin' to find the admin user directly).
    Default password for new users = 'icon123'.
    """
    DEFAULT_PASSWORD = "icon123"
    needs_password_change = False

    # ── 1. Admin shortcut: username "admin" finds the admin Person ────────────
    if req.username == "admin":
        user = db.query(models.Person).filter(
            models.Person.role == "admin"
        ).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                                detail="No admin user found in database.")
    else:
        # 2. Normal lookup by phone number
        user = db.query(models.Person).filter(
            models.Person.phone_primary == req.username
        ).first()

    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Invalid phone number or password.")

    # 3. Password check
    if user.hashed_password:
        if not verify_password(req.password, user.hashed_password):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                                detail="Invalid phone number or password.")
    else:
        if req.password != DEFAULT_PASSWORD:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                                detail="Invalid phone number or password.")
        needs_password_change = True

    # 4. Active check
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="Account is suspended or pending admin approval.")

    # 5. Issue JWT
    token = create_access_token(
        {
            "sub":              str(user.id),
            "role":             user.role,
            "name":             user.first_name,
            "must_change_pwd":  needs_password_change,
        },
        expires_delta=timedelta(hours=TOKEN_EXPIRE_HOURS),
    )

    return {
        "id":                   user.id,
        "role":                 user.role,
        "first_name":           user.first_name,
        "token":                token,
        "token_type":           "bearer",
        "needs_password_change": needs_password_change,
    }


# ─── Change Password ──────────────────────────────────────────────────────────
@router.post("/change-password")
def change_password(
    req: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: models.Person = Depends(get_current_user),
):
    """Allow any logged-in user to change their own password."""
    DEFAULT_PASSWORD = "icon123"
    if current_user.hashed_password:
        if not verify_password(req.current_password, current_user.hashed_password):
            raise HTTPException(status_code=400, detail="Current password is incorrect.")
    else:
        if req.current_password != DEFAULT_PASSWORD:
            raise HTTPException(status_code=400, detail="Current password is incorrect.")

    if len(req.new_password) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters.")

    current_user.hashed_password = hash_password(req.new_password)
    db.commit()

    # Issue a fresh token without must_change_pwd so the client can proceed normally
    new_token = create_access_token(
        {
            "sub":             str(current_user.id),
            "role":            current_user.role,
            "name":            current_user.first_name,
            "must_change_pwd": False,
        },
        expires_delta=timedelta(hours=TOKEN_EXPIRE_HOURS),
    )
    return {
        "message":    "Password updated successfully.",
        "token":      new_token,
        "token_type": "bearer",
    }


# ─── Me ───────────────────────────────────────────────────────────────────────
@router.get("/me")
def get_me(current_user: models.Person = Depends(get_current_user)):
    """Return currently logged-in user's profile."""
    return {
        "id":         current_user.id,
        "first_name": current_user.first_name,
        "last_name":  current_user.last_name,
        "full_name":  current_user.full_name,
        "role":       current_user.role,
        "phone":      current_user.phone_primary,
        "email":      current_user.email,
        "district":   current_user.village.taluka.district.name if getattr(current_user, 'village', None) else None,
        "state":      "Maharashtra" if getattr(current_user, 'village', None) else None,
        "is_active":  current_user.is_active,
    }
