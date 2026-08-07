"""Decode base64 data-URI photos from mobile field-capture payloads."""
import base64
import os
import re
import uuid
from typing import Any

_DATA_URI_RE = re.compile(r"^data:image/(?P<fmt>\w+);base64,(?P<data>.+)$", re.DOTALL)
_MAX_BYTES = 20 * 1024 * 1024


def save_base64_photos(project_id: int, photos: list[dict[str, Any]], folder: str) -> list[dict[str, str]]:
    """Save mobile photos under uploads/project_{id}/{folder}/. Returns [{slot, path}, ...]."""
    if not photos:
        return []

    base_dir = os.path.join("uploads", f"project_{project_id}", folder)
    os.makedirs(base_dir, exist_ok=True)

    saved: list[dict[str, str]] = []
    for item in photos:
        slot = str(item.get("slot", "photo"))
        data = item.get("data", "")
        if not isinstance(data, str):
            continue
        match = _DATA_URI_RE.match(data.strip())
        if not match:
            continue
        fmt = match.group("fmt").lower()
        ext = "jpg" if fmt in ("jpeg", "jpg") else fmt
        try:
            raw = base64.b64decode(match.group("data"), validate=True)
        except Exception:
            continue
        if len(raw) > _MAX_BYTES:
            continue
        filename = f"{slot}_{uuid.uuid4().hex[:12]}.{ext}"
        path = os.path.join(base_dir, filename)
        with open(path, "wb") as fh:
            fh.write(raw)
        saved.append({"slot": slot, "path": path.replace("\\", "/")})
    return saved
