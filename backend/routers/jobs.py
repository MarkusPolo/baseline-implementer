from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List
import csv
import io

from .. import models, schemas, database

router = APIRouter(
    prefix="/jobs",
    tags=["jobs"],
)

@router.post("/", response_model=schemas.Job)
def create_job(job: schemas.JobCreate, db: Session = Depends(database.get_db)):
    # Create the parent Job
    db_job = models.Job(template_id=job.template_id, status="queued")
    db.add(db_job)
    db.commit()
    db.refresh(db_job)

    # Create JobTargets
    for target in job.targets:
        db_target = models.JobTarget(
            job_id=db_job.id,
            port=target.port,
            variables=target.variables, # JSON storage
            status="queued"
        )
        db.add(db_target)
    
    db.commit()
    db.refresh(db_job)
    
    # Trigger Celery task
    from ..worker import execute_job
    execute_job.delay(db_job.id)

    return db_job

@router.get("/{job_id}", response_model=schemas.Job)
def read_job(job_id: int, db: Session = Depends(database.get_db)):
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

@router.get("/{job_id}/export")
def export_job(job_id: int, db: Session = Depends(database.get_db)):
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Headers
    headers = ["target_id", "port", "status", "log_summary", "created_at"]
    # Dynamic Headers from variables of first target if available
    first_target = job.targets[0] if job.targets else None
    var_keys = []
    if first_target and first_target.variables:
        var_keys = sorted(list(first_target.variables.keys()))
        headers.extend(var_keys)
    
    writer.writerow(headers)
    
    for target in job.targets:
        row = [
            target.id,
            target.port,
            target.status,
            (target.log or "")[:100].replace("\n", " ") + "...", # simple summary
            target.created_at
        ]
        # Variables
        if target.variables:
            for key in var_keys:
                row.append(target.variables.get(key, ""))
        else:
            row.extend([""] * len(var_keys))
        
        writer.writerow(row)
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=job_{job_id}_export.csv"}
    )
