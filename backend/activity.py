"""
ICON APP - Activity log helper.

Single place to append audit-trail rows so every write path records the same
shape. Adds to the caller's session; the caller is responsible for commit
(usually it already commits the primary change in the same transaction).
"""

import models


def log_activity(
    db,
    project_id: int,
    actor,
    action: str,
    from_stage: str | None = None,
    to_stage: str | None = None,
    note: str | None = None,
) -> None:
    """Append a ProjectActivity row. Best-effort — never raises."""
    try:
        actor_name = None
        if actor is not None:
            first = getattr(actor, "first_name", "") or ""
            last = getattr(actor, "last_name", "") or ""
            actor_name = (f"{first} {last}").strip() or getattr(actor, "phone_primary", None)
        db.add(models.ProjectActivity(
            project_id=project_id,
            actor_id=getattr(actor, "id", None),
            actor_name=actor_name or "System",
            actor_role=getattr(actor, "role", None),
            action=action,
            from_stage=from_stage,
            to_stage=to_stage,
            note=note,
        ))
    except Exception:
        # Auditing must never break the primary operation.
        pass
