"""Tests for project land registry (joint owners / multiple khasras)."""
from sqlalchemy import inspect

from database import engine
from main import _run_migrations
from routers.projects import _share_fraction_to_pct, _sync_project_land_summary
import models


def test_land_registry_columns_exist():
    _run_migrations()
    project_cols = {c["name"] for c in inspect(engine).get_columns("projects")}
    assert "khatauni_number" in project_cols
    assert "ownership_type" in project_cols

    parcel_cols = {c["name"] for c in inspect(engine).get_columns("project_land_parcels")}
    for name in ("khatauni_number", "land_type", "encumbrance", "is_project_khasra"):
        assert name in parcel_cols

    owner_cols = {c["name"] for c in inspect(engine).get_columns("project_land_owners")}
    for name in ("father_name", "share_percentage", "owner_type"):
        assert name in owner_cols


def test_share_fraction_to_pct():
    assert _share_fraction_to_pct("1/6") == 16.6667
    assert _share_fraction_to_pct("1/2") == 50.0
    assert _share_fraction_to_pct("") is None
    assert _share_fraction_to_pct("bad") is None


def test_sync_project_land_summary_uses_project_khasras_only():
    project = models.Project()
    project.land_parcels = [
        models.ProjectLandParcel(khasra_no="100/1", is_project_khasra=1, area_sqm=5000, sort_order=0),
        models.ProjectLandParcel(khasra_no="200/2", is_project_khasra=0, area_sqm=3000, sort_order=1),
    ]
    project.land_owners = [
        models.ProjectLandOwner(
            owner_name="A", khasra_no="100/1", owner_type="project", area_sqm=5000, sort_order=0,
        ),
        models.ProjectLandOwner(
            owner_name="B", khasra_no="200/2", owner_type="other", area_sqm=3000, sort_order=1,
        ),
    ]
    _sync_project_land_summary(project)
    assert project.khasra_no == "100/1"
    assert project.land_area == 5000
    assert project.ownership_type == "single"

    project.land_owners.append(models.ProjectLandOwner(
        owner_name="C", khasra_no="100/1", owner_type="project", area_sqm=2500, sort_order=2,
    ))
    _sync_project_land_summary(project)
    assert project.ownership_type == "joint"
