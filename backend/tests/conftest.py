"""Pytest fixtures for ICON backend."""
import os
import pytest
from fastapi.testclient import TestClient

# Use in-memory SQLite for tests
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("ICON_SECRET_KEY", "test-secret-key-for-ci-only")

from database import Base, engine, SessionLocal  # noqa: E402
import models  # noqa: E402, F401
from main import app  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    yield


@pytest.fixture()
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def client():
    return TestClient(app)
