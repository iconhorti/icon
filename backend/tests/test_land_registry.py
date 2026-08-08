"""Tests for project land registry (joint owners / multiple khasras)."""
from sqlalchemy import inspect

from database import engine
from main import _run_migrations
from routers.projects import _share_fraction_to_pct


def test_land_registry_columns_exist():
    _run_migrations()
    project_cols = {c["name"] for c in inspect(engine).get_columns("projects")}
    assert "khatauni_number" in project_cols
    assert "ownership_type" in project_cols

    parcel_cols = {c["name"] for c in inspect(engine).get_columns("project_land_parcels")}
    for name in ("khatauni_number", "land_type", "encumbrance"):
        assert name in parcel_cols

    owner_cols = {c["name"] for c in inspect(engine).get_columns("project_land_owners")}
    for name in ("father_name", "share_percentage"):
        assert name in owner_cols


def test_share_fraction_to_pct():
    assert _share_fraction_to_pct("1/6") == 16.6667
    assert _share_fraction_to_pct("1/2") == 50.0
    assert _share_fraction_to_pct("") is None
    assert _share_fraction_to_pct("bad") is None
