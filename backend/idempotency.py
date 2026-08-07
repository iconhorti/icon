"""Idempotency-Key support for mobile offline-queue replays."""
import json
from typing import Any, Optional

import models


def get_cached(db, key: str) -> Optional[tuple[int, Any]]:
    if not key or len(key) > 64:
        return None
    row = db.query(models.IdempotencyKey).filter(models.IdempotencyKey.key == key).first()
    if not row:
        return None
    try:
        body = json.loads(row.response_json)
    except Exception:
        body = {"message": "replay"}
    return row.status_code, body


def save_cached(db, key: str, route: str, status_code: int, body: Any) -> None:
    if not key or len(key) > 64:
        return
    existing = db.query(models.IdempotencyKey).filter(models.IdempotencyKey.key == key).first()
    payload = json.dumps(body, default=str)
    if existing:
        existing.route = route
        existing.response_json = payload
        existing.status_code = status_code
    else:
        db.add(models.IdempotencyKey(
            key=key,
            route=route,
            response_json=payload,
            status_code=status_code,
        ))
    db.commit()
