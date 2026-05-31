import sys, os
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))
from database import SessionLocal
import models
from sqlalchemy import func

db = SessionLocal()
print("=== DB Verification ===")
print("States   :", db.query(models.State).count())
for s in db.query(models.State).all():
    print(f"  {s.name} ({s.short_name}): {len(s.districts)} districts")
print("Villages :", db.query(models.Village).count())
print("Farmers  :", db.query(models.Person).filter_by(role="farmer").count())
print("Projects :", db.query(models.Project).count())
print("\nProjects by Stage:")
for stage, cnt in db.query(models.Project.project_stage, func.count()).group_by(models.Project.project_stage).all():
    print(f"  {stage}: {cnt}")
