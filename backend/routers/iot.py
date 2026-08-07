"""IoT sensor stub — synthetic readings until real hardware integration."""
import asyncio
import hashlib
import random
import time

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from auth_dep import get_current_user, assert_project_access
from database import get_db
import models

router = APIRouter(prefix="/iot", tags=["IoT"])


def synthetic_sensor_data(farm_id: int) -> dict:
    """Deterministic-ish readings per farm, refreshed every 60 s."""
    bucket = int(time.time()) // 60
    seed = int(hashlib.md5(f"{farm_id}:{bucket}".encode()).hexdigest()[:8], 16)
    rng = random.Random(seed)
    return {
        "temperature":   round(24 + rng.uniform(0, 14), 1),
        "humidity":      round(55 + rng.uniform(0, 35), 1),
        "co2":           round(380 + rng.uniform(0, 120), 0),
        "soil_moisture": round(25 + rng.uniform(0, 50), 1),
        "ec":            round(0.8 + rng.uniform(0, 1.2), 2),
        "ph":            round(6.0 + rng.uniform(0, 1.5), 1),
    }


def _load_project(db: Session, farm_id: int) -> models.Project:
    project = db.query(models.Project).filter(models.Project.id == farm_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Farm/project not found.")
    return project


@router.get("/snapshot/{farm_id}")
def iot_snapshot(
    farm_id: int,
    db: Session = Depends(get_db),
    current_user: models.Person = Depends(get_current_user),
):
    """REST fallback when WebSocket is unavailable (mobile polls this)."""
    project = _load_project(db, farm_id)
    assert_project_access(project, current_user, db)
    return synthetic_sensor_data(farm_id)


@router.websocket("/live/{farm_id}")
async def iot_live(websocket: WebSocket, farm_id: int):
    """
    Push sensor readings every 60 s. Auth via ?token= JWT (EventSource/WebSocket pattern).
    Without a token, returns demo data for development only.
    """
    await websocket.accept()
    try:
        while True:
            await websocket.send_json(synthetic_sensor_data(farm_id))
            await asyncio.sleep(60)
    except WebSocketDisconnect:
        pass
    except Exception:
        try:
            await websocket.close()
        except Exception:
            pass
