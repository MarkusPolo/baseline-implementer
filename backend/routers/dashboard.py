from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from .. import database, models
from .console import active_consoles

router = APIRouter(
    prefix="/dashboard",
    tags=["dashboard"],
)


@router.get("/summary")
def read_dashboard_summary(db: Session = Depends(database.get_db)):
    template_count = db.query(func.count(models.Template.id)).scalar() or 0
    configured_targets = (
        db.query(func.count(models.JobTarget.id))
        .filter(models.JobTarget.status == "success")
        .scalar()
        or 0
    )
    recent_jobs = (
        db.query(models.Job)
        .order_by(models.Job.created_at.desc())
        .limit(5)
        .all()
    )

    return {
        "active_sessions": len(active_consoles),
        "template_count": template_count,
        "configured_targets": configured_targets,
        "recent_jobs": [
            {
                "id": job.id,
                "template_id": job.template_id,
                "status": job.status,
                "created_at": job.created_at.isoformat(),
                "target_count": len(job.targets),
            }
            for job in recent_jobs
        ],
    }
