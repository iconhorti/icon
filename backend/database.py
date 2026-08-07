"""
ICON APP — Database Engine
Supports SQLite (development) and PostgreSQL (production).

Set DATABASE_URL to a PostgreSQL DSN to switch engines, e.g.:
  DATABASE_URL=postgresql+psycopg2://user:pass@localhost/icon_db
Leave it unset to use the local SQLite file (icon_app.db).
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base

_DATABASE_URL = os.getenv("DATABASE_URL", "").strip()

if _DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        _DATABASE_URL,
        connect_args={"check_same_thread": False},
    )
elif _DATABASE_URL:
    # PostgreSQL (or any other SQLAlchemy-compatible DSN)
    # psycopg2 connection pooling: pool_size=5, max_overflow=10
    engine = create_engine(
        _DATABASE_URL,
        pool_size=5,
        max_overflow=10,
        pool_pre_ping=True,   # verify connections before use
    )
else:
    # Development fallback — SQLite
    _DB_PATH = os.path.join(os.path.dirname(__file__), "icon_app.db")
    _SQLITE_URL = f"sqlite:///{_DB_PATH}"
    engine = create_engine(
        _SQLITE_URL,
        connect_args={"check_same_thread": False},
    )

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for all ORM models
Base = declarative_base()


# FastAPI dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
