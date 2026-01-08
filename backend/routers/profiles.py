from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from .. import models, schemas, database

router = APIRouter(
    prefix="/profiles",
    tags=["profiles"],
)

@router.post("/", response_model=schemas.DeviceProfile)
def create_profile(profile: schemas.DeviceProfileCreate, db: Session = Depends(database.get_db)):
    db_profile = models.DeviceProfile(
        name=profile.name,
        vendor=profile.vendor,
        description=profile.description,
        prompt_patterns=profile.prompt_patterns,
        commands=profile.commands,
        error_markers=profile.error_markers,
        detection_command=profile.detection_command
    )
    db.add(db_profile)
    try:
        db.commit()
        db.refresh(db_profile)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    return db_profile

@router.get("/", response_model=List[schemas.DeviceProfile])
def read_profiles(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db)):
    profiles = db.query(models.DeviceProfile).offset(skip).limit(limit).all()
    return profiles

@router.get("/{profile_id}", response_model=schemas.DeviceProfile)
def read_profile(profile_id: int, db: Session = Depends(database.get_db)):
    profile = db.query(models.DeviceProfile).filter(models.DeviceProfile.id == profile_id).first()
    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile
