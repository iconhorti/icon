"""
ICON APP - JWT Authentication Dependency
Provides get_current_user dependency for all protected routes.
Role-based permission enforcement helper.
"""

import os
import secrets
import warnings
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from database import get_db
import models

# ─── Config ───────────────────────────────────────────────────────────────────
_IS_PRODUCTION = os.getenv("ICON_ENV", "").lower() == "production"
_DEV_KEY_FILE  = os.path.join(os.path.dirname(__file__), ".dev_secret_key")

_env_key = os.getenv("ICON_SECRET_KEY", "").strip()
if _env_key:
    SECRET_KEY = _env_key
elif _IS_PRODUCTION:
    raise RuntimeError(
        "FATAL: ICON_SECRET_KEY environment variable is not set. "
        "Refusing to start in production without a secure secret key. "
        "Generate one with: python -c \"import secrets; print(secrets.token_hex(32))\""
    )
else:
    # Development only: generate a stable key stored in a local file so
    # tokens survive server restarts. Never commit .dev_secret_key to git.
    if os.path.exists(_DEV_KEY_FILE):
        with open(_DEV_KEY_FILE) as _f:
            SECRET_KEY = _f.read().strip()
    else:
        SECRET_KEY = secrets.token_hex(32)
        with open(_DEV_KEY_FILE, "w") as _f:
            _f.write(SECRET_KEY)
    warnings.warn(
        "SECURITY WARNING: ICON_SECRET_KEY is not set. "
        f"Using a dev-only key stored in {_DEV_KEY_FILE}. "
        "Never use this in production — set ICON_SECRET_KEY via environment variable.",
        stacklevel=1,
    )

ALGORITHM          = "HS256"
TOKEN_EXPIRE_HOURS = 24

# Paths that remain accessible even when a password-change is required
_CHANGE_PWD_EXEMPT = ("/auth/change-password", "/auth/me", "/")

security = HTTPBearer(auto_error=False)


# ─── Role Hierarchy ───────────────────────────────────────────────────────────
ADMIN_ROLES        = {"admin", "owner"}
STAFF_ROLES        = {"admin", "owner", "office_staff"}
FIELD_ROLES        = {"admin", "owner", "office_staff", "project_manager"}
CONTRACTOR_ROLES   = {"structure_contractor", "drip_contractor", "bed_contractor", "plantation_contractor"}
ALL_INTERNAL_ROLES = STAFF_ROLES | FIELD_ROLES | CONTRACTOR_ROLES | {"bank_officer", "agency_officer", "agronomist"}

# ─── Token Creation ────────────────────────────────────────────────────────────
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(hours=TOKEN_EXPIRE_HOURS))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


# ─── Token Decode ──────────────────────────────────────────────────────────────
def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ─── Current User Dependency ──────────────────────────────────────────────────
def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db),
) -> models.Person:
    """Decode JWT → look up Person → return model. Raises 401 if invalid.

    If the JWT carries must_change_pwd=True (issued to accounts that have
    never set a password), all endpoints EXCEPT /auth/change-password and
    /auth/me return 403 until the user sets a new password.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please provide a Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload  = decode_token(credentials.credentials)
    user_id  = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    user = db.query(models.Person).filter(models.Person.id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is suspended")

    # Enforce mandatory password change at the API level
    if payload.get("must_change_pwd"):
        if not any(request.url.path.endswith(p) for p in _CHANGE_PWD_EXEMPT):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Password change required. Please set a new password before continuing.",
                headers={"X-Must-Change-Password": "true"},
            )

    return user


def get_current_user_optional(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db),
) -> Optional[models.Person]:
    """Same as get_current_user but returns None instead of raising if no token."""
    if not credentials:
        return None
    try:
        return get_current_user(request, credentials, db)
    except HTTPException:
        return None


# ─── Role Guard Helpers ────────────────────────────────────────────────────────
def require_roles(*allowed_roles: str):
    """
    Factory: returns a FastAPI dependency that raises 403 if the current user's
    role is not in `allowed_roles`.

    Usage:
        @router.delete("/{id}", dependencies=[Depends(require_roles("admin","owner"))])
    """
    allowed = set(allowed_roles)

    def checker(current_user: models.Person = Depends(get_current_user)) -> models.Person:
        if current_user.role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role(s): {', '.join(sorted(allowed))}. Your role: {current_user.role}",
            )
        return current_user

    return checker


def is_admin(user: models.Person) -> bool:
    return user.role in ADMIN_ROLES

def is_staff_or_above(user: models.Person) -> bool:
    return user.role in STAFF_ROLES

def is_field_or_above(user: models.Person) -> bool:
    return user.role in FIELD_ROLES

def is_contractor(user: models.Person) -> bool:
    return user.role in CONTRACTOR_ROLES


# ─── Ownership Check Helpers ──────────────────────────────────────────────────
def assert_project_access(
    project,
    current_user: models.Person,
    db: Optional[Session] = None,
):
    """
    Raises 403 if the user has no business seeing this project.
    Admins/owners/staff see all. Dealers see their projects. Farmers see theirs.
    Contractors see projects they are assigned to.

    Args:
        project:      The Project model instance to check.
        current_user: The authenticated user (from get_current_user).
        db:           The caller's SQLAlchemy Session. MUST be provided for
                      dealer-mapping checks — passing None falls back to
                      a conservative denial for dealers without a direct
                      project link. Never spawn a new SessionLocal here.
    """
    if is_staff_or_above(current_user):
        return  # full access
    if current_user.role in {"project_manager", "bank_officer", "agency_officer", "agronomist"}:
        return  # internal roles see all projects
    if current_user.role == "dealer":
        if project.dealer_id == current_user.id:
            return
        # Check dealer→farmer mapping using the caller's existing session
        if db is not None:
            has_mapping = db.query(models.DealerFarmerMapping).filter_by(
                dealer_id=current_user.id, farmer_id=project.farmer_id
            ).first()
            if has_mapping:
                return
    if current_user.role == "farmer" and project.farmer_id == current_user.id:
        return
    if is_contractor(current_user):
        # Check if they are assigned to this project
        assigned = any(pc.contractor_id == current_user.id for pc in project.contractors)
        if assigned:
            return
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You do not have access to this project.",
    )
