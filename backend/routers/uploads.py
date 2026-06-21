"""
uploads.py — Full Document Management CRUD
Endpoints:
  POST   /uploads/project/{project_id}         — upload a file
  GET    /uploads/project/{project_id}         — list all docs for a project
  GET    /uploads/all                          — list docs (all projects, with filters)
  PATCH  /uploads/{doc_id}/verify             — verify a document (office staff / admin)
  DELETE /uploads/{doc_id}                    — delete a document
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc
from typing import Optional
from datetime import datetime
from collections import defaultdict
from database import get_db
from auth_dep import get_current_user, assert_project_access
import models
import shutil
import os
import uuid

router = APIRouter(prefix="/uploads", tags=["Document Management"])

UPLOAD_ROOT    = "uploads"
MAX_FILE_SIZE  = 20 * 1_048_576   # 20 MB hard limit
os.makedirs(UPLOAD_ROOT, exist_ok=True)

# Allowed file extensions (lowercase, with dot)
ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".webp", ".doc", ".docx", ".xls", ".xlsx"}


def _sniff_mime(header: bytes, ext: str) -> str:
    """
    Determine MIME type from magic bytes and validate the extension matches.
    Raises HTTP 400 if the content does not match the claimed extension,
    or if the format is not in the whitelist.

    `header` must be at least the first 12 bytes of the file.
    """
    if header[:3] == b"\xff\xd8\xff":
        if ext not in (".jpg", ".jpeg"):
            raise HTTPException(400, "File bytes indicate JPEG but extension is not .jpg/.jpeg.")
        return "image/jpeg"

    if header[:8] == b"\x89PNG\r\n\x1a\n":
        if ext != ".png":
            raise HTTPException(400, "File bytes indicate PNG but extension is not .png.")
        return "image/png"

    if header[:4] == b"RIFF" and header[8:12] == b"WEBP":
        if ext != ".webp":
            raise HTTPException(400, "File bytes indicate WebP but extension is not .webp.")
        return "image/webp"

    if header[:4] == b"%PDF":
        if ext != ".pdf":
            raise HTTPException(400, "File bytes indicate PDF but extension is not .pdf.")
        return "application/pdf"

    if header[:4] == b"PK\x03\x04":
        # ZIP-based Office formats (DOCX / XLSX)
        if ext == ".docx":
            return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        if ext == ".xlsx":
            return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        raise HTTPException(400, "File bytes indicate an Office Open XML (ZIP) file but extension is not .docx/.xlsx.")

    if header[:4] == b"\xd0\xcf\x11\xe0":
        # OLE2-based legacy Office formats (DOC / XLS)
        if ext == ".doc":
            return "application/msword"
        if ext == ".xls":
            return "application/vnd.ms-excel"
        raise HTTPException(400, "File bytes indicate a legacy Office file but extension is not .doc/.xls.")

    raise HTTPException(
        400,
        f"Unrecognised or disallowed file format (extension: '{ext}'). "
        f"Allowed: PDF, JPG, PNG, WebP, DOC, DOCX, XLS, XLSX."
    )

# ── Document type catalogue ──────────────────────────────────────────────────
DOCUMENT_TYPES = [
    # KYC
    "Aadhaar Card (Front)", "Aadhaar Card (Back)", "PAN Card",
    "7/12 Extract (Land Record)", "8A Certificate", "Land Map",
    "Bank Passbook", "Caste Certificate", "Farmer Photograph", "Contractor Quotation",
    # Bank (Stage 6) — Bank Officer only
    "Bank Sanction Letter",      # compulsory
    "Bank Appraisal Report",     # compulsory
    "Bank Legal Search Report",  # compulsory
    "KCC Letter",                # optional
    "Bank Correspondence",       # letters / queries to-from bank
    # GOC & Subsidy
    "GOC Letter",
    # Project Documents
    "DPR Document", "BOQ Sheet", "Site Photograph",
    "M1 Foundation Photo", "M2 Structure Erection Photo",
    "M3 Covering Material Photo", "M4 Trellising Photo",
    "M5 Drip Fitting Photo", "M6 Bed Preparation Photo",
    "M7 Plantation Photo",
    # Agency & Completion
    "Subsidy Claim Form", "Inspection Report",
    "Committee Approval Letter", "Subsidy Release Order",
    "Completion Certificate", "Other",
]

# Bank documents — required vs optional (used by checklist UI)
BANK_DOCS_REQUIRED = [
    "Bank Sanction Letter",
    "Bank Appraisal Report",
    "Bank Legal Search Report",
]
BANK_DOCS_OPTIONAL = ["KCC Letter", "Bank Correspondence"]
ALL_BANK_DOCS      = BANK_DOCS_REQUIRED + BANK_DOCS_OPTIONAL


# ── Role-based upload permissions ─────────────────────────────────────────────
FULL_ACCESS = {"admin", "owner", "office_staff"}     # all types allowed
DOCUMENT_REVIEW_ROLES = FULL_ACCESS
DOCUMENT_DELETE_ROLES = FULL_ACCESS | {"project_manager", "dealer"}

ROLE_ALLOWED_TYPES: dict[str, list[str]] = {
    "project_manager": [
        "Site Photograph", "M1 Foundation Photo", "M2 Structure Erection Photo",
        "M3 Covering Material Photo", "M4 Trellising Photo", "M5 Drip Fitting Photo",
        "M6 Bed Preparation Photo", "M7 Plantation Photo", "DPR Document", "BOQ Sheet", "Other",
    ],
    "dealer": [
        "Aadhaar Card (Front)", "Aadhaar Card (Back)", "PAN Card",
        "7/12 Extract (Land Record)", "8A Certificate", "Land Map",
        "Bank Passbook", "Caste Certificate", "Farmer Photograph",
        "Contractor Quotation", "Other",
    ],
    "bank_officer": [
        "Bank Sanction Letter",     # compulsory
        "Bank Appraisal Report",    # compulsory
        "Bank Legal Search Report", # compulsory
        "KCC Letter",               # optional
        "Bank Correspondence",      # letters / queries
    ],
    "agency_officer": [
        "GOC Letter", "Inspection Report", "Committee Approval Letter", "Subsidy Release Order",
    ],
    "agronomist": ["Site Photograph", "Other"],
    "structure_contractor": [
        "M1 Foundation Photo", "M2 Structure Erection Photo",
        "M3 Covering Material Photo", "M4 Trellising Photo", "Site Photograph",
    ],
    "drip_contractor":        ["M5 Drip Fitting Photo", "Site Photograph"],
    "bed_contractor":         ["M6 Bed Preparation Photo", "Site Photograph"],
    "plantation_contractor":  ["M7 Plantation Photo", "Site Photograph"],
    "farmer":                 [],      # view-only
}

def check_upload_permission(role: str, document_type: str):
    """Raise 403 if the role is not allowed to upload this document type."""
    if role in FULL_ACCESS:
        return   # all types allowed
    allowed = ROLE_ALLOWED_TYPES.get(role)
    if allowed is None:
        raise HTTPException(status_code=403, detail=f"Role '{role}' is not recognised.")
    if len(allowed) == 0:
        raise HTTPException(status_code=403, detail=f"Role '{role}' does not have upload access.")
    if document_type not in allowed:
        raise HTTPException(
            status_code=403,
            detail=(
                f"Role '{role}' cannot upload '{document_type}'. "
                f"Allowed types: {', '.join(allowed)}"
            )
        )


def document_to_dict(doc: models.ProjectDocument) -> dict:
    return {
        "id":            doc.id,
        "project_id":    doc.project_id,
        "document_type": doc.document_type,
        "stage":         doc.stage,
        "file_name":     doc.file_name,
        "file_path":     doc.file_path,
        "file_url":      f"/api/v1/uploads/{doc.id}/file",
        "file_size":     doc.file_size,
        "mime_type":     doc.mime_type,
        "is_verified":   bool(doc.is_verified),
        "verified_by":   doc.verified_by,
        "verified_at":   doc.verified_at.isoformat() if doc.verified_at else None,
        "remarks":       doc.remarks,
        "uploaded_by":   doc.uploaded_by,
        "uploader_name": f"{doc.uploader.first_name} {doc.uploader.last_name or ''}".strip() if doc.uploader else None,
        "created_at":    doc.created_at.isoformat() if doc.created_at else None,
    }


def get_project_or_404(project_id: int, db: Session) -> models.Project:
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


def get_document_or_404(doc_id: int, db: Session) -> models.ProjectDocument:
    doc = (
        db.query(models.ProjectDocument)
        .options(joinedload(models.ProjectDocument.project))
        .filter(models.ProjectDocument.id == doc_id)
        .first()
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


def assert_document_access(doc: models.ProjectDocument, current_user: models.Person, db: Session) -> models.Project:
    project = doc.project or get_project_or_404(doc.project_id, db)
    assert_project_access(project, current_user, db)
    return project


def assert_document_review_access(current_user: models.Person):
    if current_user.role not in DOCUMENT_REVIEW_ROLES:
        raise HTTPException(status_code=403, detail="Not authorized to verify documents.")


def assert_document_delete_access(doc: models.ProjectDocument, current_user: models.Person):
    if current_user.role in DOCUMENT_DELETE_ROLES or doc.uploaded_by == current_user.id:
        return
    raise HTTPException(status_code=403, detail="Not authorized to delete this document.")


# ── GET /uploads/types — DB-driven document type catalogue ────────────────────
@router.get("/types")
def get_document_types(
    category:    Optional[str] = None,
    role_filter: Optional[str] = None,
    stage:       Optional[str] = None,
    required:    Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: models.Person = Depends(get_current_user),
):
    """
    Return document types from the master table, grouped by category.
    - category: filter to a single category (KYC, Land, Bank, Project, Agency, Completion, Other)
    - role_filter: show only types this role may upload (defaults to caller's role)
    - stage + required=true: return the documents REQUIRED to complete `stage`
      (used by the web required-document gate). Returns { document_types: [...] }.
    Falls back to the hardcoded DOCUMENT_TYPES list if the master table is empty.
    """
    # ── Stage-gate query: which documents are required to leave this stage? ──
    if stage and required:
        from constants.stages import STAGE_REQUIRED_DOCS
        names = STAGE_REQUIRED_DOCS.get(stage, [])
        return {"document_types": names, "stage": stage, "required": True}

    effective_role = role_filter or current_user.role

    query = db.query(models.DocumentType).filter(models.DocumentType.is_active == 1)
    if category:
        query = query.filter(models.DocumentType.category == category)
    rows = query.order_by(models.DocumentType.sort_order).all()

    if not rows:
        # Table not yet seeded — fall back to hardcoded list
        return {
            "document_types": DOCUMENT_TYPES,
            "categories": ["KYC", "Land", "Project", "Bank", "Agency", "Completion", "Other"],
            "by_category": {},
            "bank_docs": {"required": BANK_DOCS_REQUIRED, "optional": BANK_DOCS_OPTIONAL, "all": ALL_BANK_DOCS},
        }

    def is_allowed(row):
        if not row.allowed_roles:
            return True
        return effective_role in [r.strip() for r in row.allowed_roles.split(",")]

    visible = [r for r in rows if is_allowed(r)]

    def row_dict(r):
        return {
            "id": r.id, "name": r.name, "category": r.category,
            "description": r.description, "allowed_roles": r.allowed_roles,
            "is_required": bool(r.is_required), "sort_order": r.sort_order,
        }

    by_cat = defaultdict(list)
    for r in visible:
        by_cat[r.category].append(row_dict(r))

    cat_order = ["KYC", "Land", "Project", "Bank", "Agency", "Completion", "Other"]
    ordered_by_cat = {k: by_cat[k] for k in cat_order if k in by_cat}
    for k, v in by_cat.items():
        if k not in ordered_by_cat:
            ordered_by_cat[k] = v

    return {
        "document_types": [r.name for r in visible],
        "categories": list(ordered_by_cat.keys()),
        "by_category": ordered_by_cat,
        "bank_docs": {"required": BANK_DOCS_REQUIRED, "optional": BANK_DOCS_OPTIONAL, "all": ALL_BANK_DOCS},
    }


# ── POST /uploads/project/{project_id} — upload a file ───────────────────────
@router.post("/project/{project_id}")
async def upload_document(
    project_id:    int,
    document_type: str  = Form(...),
    stage:         str  = Form(default=""),
    remarks:       str  = Form(default=""),
    file:          UploadFile = File(...),
    db:            Session = Depends(get_db),
    current_user:  models.Person = Depends(get_current_user),
):
    # ── Role-based permission check (enforced server-side) ─────────────────
    check_upload_permission(current_user.role, document_type)

    # Verify project exists and caller has access
    project = get_project_or_404(project_id, db)
    assert_project_access(project, current_user, db)

    # ── Extension whitelist ────────────────────────────────────────────────
    original_ext = os.path.splitext(file.filename or "")[1].lower()
    if original_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=(
                f"File extension '{original_ext}' is not allowed. "
                f"Permitted: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
            ),
        )

    # ── Read entire file into memory to enforce size limit & sniff MIME ───
    raw = await file.read()

    if len(raw) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    if len(raw) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds the 20 MB size limit ({len(raw) // 1_048_576} MB uploaded).",
        )

    # Sniff actual MIME type from magic bytes — ignore client-supplied Content-Type
    detected_mime = _sniff_mime(raw[:12], original_ext)

    # ── Write to disk ──────────────────────────────────────────────────────
    project_dir = os.path.join(UPLOAD_ROOT, f"project_{project_id}")
    os.makedirs(project_dir, exist_ok=True)

    unique_fn = f"{uuid.uuid4().hex}{original_ext}"
    rel_path  = f"project_{project_id}/{unique_fn}"
    abs_path  = os.path.join(UPLOAD_ROOT, rel_path)

    with open(abs_path, "wb") as buffer:
        buffer.write(raw)

    file_size = len(raw)

    # Create DB record — uploaded_by from auth token, mime_type from sniffed bytes
    doc = models.ProjectDocument(
        project_id=project_id,
        document_type=document_type,
        stage=stage or project.project_stage,
        file_name=file.filename,
        file_path=rel_path,
        file_size=file_size,
        mime_type=detected_mime,
        uploaded_by=current_user.id,
        remarks=remarks or None,
        is_verified=0,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    return {"message": "Document uploaded successfully", "document": document_to_dict(doc)}


# ── GET /uploads/project/{project_id} — list docs for a project ──────────────
@router.get("/project/{project_id}")
def list_project_documents(
    project_id: int,
    stage:      Optional[str] = Query(None),
    verified:   Optional[int] = Query(None),
    db:         Session = Depends(get_db),
    current_user: models.Person = Depends(get_current_user),
):
    project = get_project_or_404(project_id, db)
    assert_project_access(project, current_user, db)

    q = db.query(models.ProjectDocument).filter(
        models.ProjectDocument.project_id == project_id
    )
    if stage:
        q = q.filter(models.ProjectDocument.stage == stage)
    if verified is not None:
        q = q.filter(models.ProjectDocument.is_verified == verified)

    docs = q.order_by(desc(models.ProjectDocument.created_at)).all()
    return {"documents": [document_to_dict(d) for d in docs], "total": len(docs)}


# ── GET /uploads/all — all docs across projects (with optional filters) ───────
@router.get("/all")
def list_all_documents(
    project_id:    Optional[int] = Query(None),
    document_type: Optional[str] = Query(None),
    verified:      Optional[int] = Query(None),
    limit:         int           = Query(50),
    db:            Session = Depends(get_db),
    current_user:  models.Person = Depends(get_current_user),
):
    q = (
        db.query(models.ProjectDocument)
        .options(joinedload(models.ProjectDocument.project))
        .order_by(desc(models.ProjectDocument.created_at))
    )
    if project_id:
        project = get_project_or_404(project_id, db)
        assert_project_access(project, current_user, db)
        q = q.filter(models.ProjectDocument.project_id == project_id)
    if document_type:
        q = q.filter(models.ProjectDocument.document_type == document_type)
    if verified is not None:
        q = q.filter(models.ProjectDocument.is_verified == verified)

    docs = []
    for doc in q.all():
        try:
            assert_document_access(doc, current_user, db)
        except HTTPException:
            continue
        docs.append(doc)

    return {"documents": [document_to_dict(d) for d in docs[:limit]], "total": len(docs)}


# ── PATCH /uploads/{doc_id}/verify — mark verified ───────────────────────────
@router.patch("/{doc_id}/verify")
def verify_document(
    doc_id:      int,
    remarks:     str  = Query(default=""),
    db:          Session = Depends(get_db),
    current_user: models.Person = Depends(get_current_user),
):
    doc = get_document_or_404(doc_id, db)
    assert_document_access(doc, current_user, db)
    assert_document_review_access(current_user)

    doc.is_verified = 1
    doc.verified_by = current_user.id
    doc.verified_at = datetime.utcnow()
    if remarks:
        doc.remarks = remarks
    db.commit()
    return {"message": "Document verified", "document": document_to_dict(doc)}


# ── PATCH /uploads/{doc_id}/unverify — revert verification ───────────────────
@router.patch("/{doc_id}/unverify")
def unverify_document(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: models.Person = Depends(get_current_user),
):
    doc = get_document_or_404(doc_id, db)
    assert_document_access(doc, current_user, db)
    assert_document_review_access(current_user)
    doc.is_verified = 0
    doc.verified_by = None
    doc.verified_at = None
    db.commit()
    return {"message": "Verification revoked"}


# ── DELETE /uploads/{doc_id} — delete a document ──────────────────────────────
@router.delete("/{doc_id}")
def delete_document(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: models.Person = Depends(get_current_user),
):
    doc = get_document_or_404(doc_id, db)
    assert_document_access(doc, current_user, db)
    assert_document_delete_access(doc, current_user)

    # Remove file from disk
    abs_path = os.path.join(UPLOAD_ROOT, doc.file_path)
    if os.path.exists(abs_path):
        os.remove(abs_path)

    db.delete(doc)
    db.commit()
    return {"message": "Document deleted successfully"}


@router.get("/{doc_id}/file")
def download_document(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: models.Person = Depends(get_current_user),
):
    doc = get_document_or_404(doc_id, db)
    assert_document_access(doc, current_user, db)

    abs_path = os.path.join(UPLOAD_ROOT, doc.file_path)
    if not os.path.exists(abs_path):
        raise HTTPException(status_code=404, detail="Stored file not found")

    return FileResponse(
        abs_path,
        media_type=doc.mime_type or "application/octet-stream",
        filename=doc.file_name,
    )
