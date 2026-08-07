"""Smoke tests for stage-workflow schema and API surface."""
from sqlalchemy import inspect

from database import engine
from main import _run_migrations


def test_stage_workflow_columns_exist():
    _run_migrations()
    cols = {c["name"] for c in inspect(engine).get_columns("projects")}
    for name in (
        "loan_amount",
        "goc_number",
        "subsidy_claim_reference",
        "subsidy_bank_credit_date",
        "completion_certificate_date",
        "project_stage_entered_at",
    ):
        assert name in cols


def test_health_endpoint(client):
    res = client.get("/")
    assert res.status_code == 200
    assert res.json().get("status") == "LIVE"
