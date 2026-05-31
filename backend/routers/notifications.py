"""
ICON APP - Notifications Router
Role-based: users only see their own notifications.

Permissions:
  GET /my             → any authenticated user (own only)
  GET /unread-count   → any authenticated user
  PUT /{id}/read      → owner of notification only
  PUT /read-all       → any authenticated user (own)
  POST /              → admin, owner (system-generated or admin broadcast)
  DELETE /{id}        → admin, owner only
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from database import get_db
from auth_dep import get_current_user, require_roles, ADMIN_ROLES
import models, schemas

router = APIRouter(prefix="/notifications", tags=["Notifications"])


# ─── Create schema ─────────────────────────────────────────────────────────────
class NotificationCreate(BaseModel):
    user_id:             int
    title:               str
    message:             str
    type:                Optional[str] = "general"
    related_entity_type: Optional[str] = None
    related_entity_id:   Optional[int] = None
    project_id:          Optional[int] = None


# ─── MY NOTIFICATIONS ─────────────────────────────────────────────────────────
@router.get("/my", response_model=List[schemas.NotificationResponse])
def get_my_notifications(
    unread_only: bool = False,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: models.Person = Depends(get_current_user),
):
    """Return notifications for the current logged-in user."""
    query = db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id
    )
    if unread_only:
        query = query.filter(models.Notification.is_read == 0)
    return query.order_by(models.Notification.created_at.desc()).offset(skip).limit(limit).all()


# ─── UNREAD COUNT ─────────────────────────────────────────────────────────────
@router.get("/unread-count")
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: models.Person = Depends(get_current_user),
):
    """Get unread notification count for the current user."""
    count = db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id,
        models.Notification.is_read == 0,
    ).count()
    return {"unread_count": count}


# ─── GET BY USER (admin only) ─────────────────────────────────────────────────
@router.get("/{user_id}", response_model=List[schemas.NotificationResponse])
def get_user_notifications(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.Person = Depends(get_current_user),
):
    """Get notifications for a specific user. Admin/owner only, or self."""
    if current_user.id != user_id and current_user.role not in ADMIN_ROLES:
        raise HTTPException(status_code=403, detail="Access denied. You can only view your own notifications.")

    return db.query(models.Notification).filter(
        models.Notification.user_id == user_id
    ).order_by(models.Notification.created_at.desc()).all()


# ─── MARK ONE AS READ ────────────────────────────────────────────────────────
@router.put("/{notification_id}/read")
def mark_as_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: models.Person = Depends(get_current_user),
):
    """Mark a notification as read. Only the owner of the notification."""
    notif = db.query(models.Notification).filter(models.Notification.id == notification_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found.")
    if notif.user_id != current_user.id and current_user.role not in ADMIN_ROLES:
        raise HTTPException(status_code=403, detail="You can only mark your own notifications as read.")
    notif.is_read = 1
    db.commit()
    return {"message": "Marked as read."}


# ─── MARK ALL AS READ ─────────────────────────────────────────────────────────
@router.put("/read-all/me")
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: models.Person = Depends(get_current_user),
):
    """Mark all notifications as read for the current user."""
    db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id,
        models.Notification.is_read == 0,
    ).update({"is_read": 1})
    db.commit()
    return {"message": "All notifications marked as read."}


# ─── CREATE NOTIFICATION (admin broadcast) ────────────────────────────────────
@router.post("/", status_code=status.HTTP_201_CREATED,
             dependencies=[Depends(require_roles("admin", "owner"))])
def create_notification(notif: NotificationCreate, db: Session = Depends(get_db)):
    """Send a notification to a user. Admin/Owner only."""
    new_notif = models.Notification(**notif.model_dump())
    db.add(new_notif)
    db.commit()
    db.refresh(new_notif)
    return {"message": "Notification sent.", "id": new_notif.id}


# ─── DELETE NOTIFICATION ──────────────────────────────────────────────────────
@router.delete("/{notification_id}", dependencies=[Depends(require_roles("admin", "owner"))])
def delete_notification(notification_id: int, db: Session = Depends(get_db)):
    """Delete a notification. Admin/Owner only."""
    notif = db.query(models.Notification).filter(models.Notification.id == notification_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found.")
    db.delete(notif)
    db.commit()
    return {"message": f"Notification ID {notification_id} deleted."}
