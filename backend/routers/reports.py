from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from auth_dep import get_current_user
import models, schemas
from typing import List

router = APIRouter(prefix="/reports", tags=["Reports & Analytics"])

@router.post("/daily", response_model=schemas.DailySiteReportResponse)
def submit_daily_report(
    report: schemas.DailySiteReportCreate,
    db: Session = Depends(get_db),
    current_user: models.Person = Depends(get_current_user),
):
    new_report = models.DailySiteReport(**report.model_dump())
    db.add(new_report)
    db.commit()
    db.refresh(new_report)
    return new_report

@router.get("/project/{project_id}", response_model=List[schemas.DailySiteReportResponse])
def get_project_reports(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: models.Person = Depends(get_current_user),
):
    return db.query(models.DailySiteReport).filter(models.DailySiteReport.project_id == project_id).all()
