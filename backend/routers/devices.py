"""
ICON APP - Device token registration for push notifications.
The mobile app registers its Expo/FCM push token here after login.
"""

import logging
from fastapi import APIRouter, Depends, status
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session

from database import get_db
from auth_dep import get_current_user
import models

router = APIRouter(prefix="/devices", tags=["Devices"])
logger = logging.getLogger("icon.devices")


class DeviceRegisterInput(BaseModel):
    token: str
    platform: Optional[str] = None  # ios | android | web


@router.post("/register", status_code=status.HTTP_200_OK)
def register_device(
    body: DeviceRegisterInput,
    db: Session = Depends(get_db),
    current_user: models.Person = Depends(get_current_user),
):
    """
    Upsert a push token for the current user (idempotent by token).

    Tokens DO legitimately move between users on a shared/reissued device
    (logout → different user logs in), so we don't block reassignment. But a
    silent in-place mutation means a token someone else already owns can be
    re-pointed without trace — e.g. if a token leaked, the attacker's
    registration would silently steal the victim's future notifications.
    Instead we explicitly revoke (delete) the old registration and create a
    fresh one, and log cross-user reassignment for audit visibility.
    """
    existing = db.query(models.DeviceToken).filter(models.DeviceToken.token == body.token).first()

    if existing and existing.user_id != current_user.id:
        logger.warning(
            "Device token reassigned from user_id=%s to user_id=%s (token=%s...)",
            existing.user_id, current_user.id, body.token[:12],
        )
        db.delete(existing)
        db.flush()
        existing = None

    if existing:
        if body.platform:
            existing.platform = body.platform
    else:
        db.add(models.DeviceToken(
            user_id=current_user.id,
            token=body.token,
            platform=body.platform,
        ))
    db.commit()
    return {"status": "registered"}
