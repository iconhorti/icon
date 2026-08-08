-- Indian agricultural land record schema (Khatauni + Khasra)
-- SQLite 3.x | 3NF | snake_case

PRAGMA foreign_keys = ON;

-- ─── Khatauni (owner / khata account master) ─────────────────────────────────
CREATE TABLE khatauni (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    khatauni_number   TEXT    NOT NULL,
    owner_name        TEXT    NOT NULL,
    father_name       TEXT,
    village           TEXT    NOT NULL,
    tehsil            TEXT    NOT NULL,
    district          TEXT    NOT NULL,
    state             TEXT    NOT NULL,
    total_land_area   REAL    NOT NULL CHECK (total_land_area >= 0),
    ownership_type    TEXT    NOT NULL DEFAULT 'single'
                              CHECK (ownership_type IN ('single', 'joint')),
    created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE (khatauni_number, village, tehsil, district, state)
);

-- ─── Khasra (land parcel / plot) ─────────────────────────────────────────────
CREATE TABLE khasra (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    khatauni_id        INTEGER NOT NULL,
    khasra_number      TEXT    NOT NULL,
    land_area          REAL    NOT NULL CHECK (land_area >= 0),
    land_type          TEXT    NOT NULL DEFAULT 'agricultural'
                               CHECK (land_type IN (
                                   'irrigated', 'unirrigated', 'barren',
                                   'residential', 'commercial', 'agricultural', 'other'
                               )),
    soil_type          TEXT,
    irrigation_source  TEXT,
    crop_type          TEXT,
    encumbrance        INTEGER NOT NULL DEFAULT 0 CHECK (encumbrance IN (0, 1)),
    latitude           REAL    CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90)),
    longitude          REAL    CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180)),
    created_at         TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (khatauni_id) REFERENCES khatauni (id) ON DELETE CASCADE,
    UNIQUE (khatauni_id, khasra_number)
);

-- ─── Owner share (joint ownership breakdown) ─────────────────────────────────
CREATE TABLE owner_share (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    khatauni_id       INTEGER NOT NULL,
    owner_name        TEXT    NOT NULL,
    share_percentage  REAL    NOT NULL CHECK (share_percentage > 0 AND share_percentage <= 100),
    created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (khatauni_id) REFERENCES khatauni (id) ON DELETE CASCADE,
    UNIQUE (khatauni_id, owner_name)
);

-- ─── Crop history (seasonal yield per khasra) ────────────────────────────────
CREATE TABLE crop_history (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    khasra_id    INTEGER NOT NULL,
    season       TEXT    NOT NULL CHECK (season IN ('kharif', 'rabi', 'zaid', 'other')),
    year         INTEGER NOT NULL CHECK (year >= 1900 AND year <= 2100),
    crop_name    TEXT    NOT NULL,
    yield        REAL    CHECK (yield IS NULL OR yield >= 0),
    yield_unit   TEXT    DEFAULT 'quintal',
    created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (khasra_id) REFERENCES khasra (id) ON DELETE CASCADE,
    UNIQUE (khasra_id, season, year, crop_name)
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX idx_khatauni_number       ON khatauni (khatauni_number);
CREATE INDEX idx_khatauni_location     ON khatauni (state, district, tehsil, village);
CREATE INDEX idx_khatauni_owner_name   ON khatauni (owner_name);

CREATE INDEX idx_khasra_khatauni_id    ON khasra (khatauni_id);
CREATE INDEX idx_khasra_number         ON khasra (khasra_number);
CREATE INDEX idx_khasra_land_type      ON khasra (land_type);
CREATE INDEX idx_khasra_encumbrance    ON khasra (encumbrance);

CREATE INDEX idx_owner_share_khatauni  ON owner_share (khatauni_id);

CREATE INDEX idx_crop_history_khasra   ON crop_history (khasra_id);
CREATE INDEX idx_crop_history_season   ON crop_history (season, year);
CREATE INDEX idx_crop_history_crop     ON crop_history (crop_name);
