from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from ..database import get_db
from .. import models, schemas

router = APIRouter(
    prefix="/settings",
    tags=["settings"]
)

@router.get("/", response_model=List[schemas.Setting])
def get_settings(db: Session = Depends(get_db)):
    return db.query(models.Setting).all()

@router.post("/port_baud_rates")
def update_port_baud_rates(baud_rates: Dict[str, int], db: Session = Depends(get_db)):
    """
    Update the port_baud_rates setting.
    Expected format: {"1": 9600, "2": 115200, ...}
    """
    setting = db.query(models.Setting).filter(models.Setting.key == "port_baud_rates").first()
    if not setting:
        setting = models.Setting(key="port_baud_rates", value=baud_rates)
        db.add(setting)
    else:
        setting.value = baud_rates
    
    db.commit()
    db.refresh(setting)
    return setting

@router.get("/key/{key}", response_model=schemas.Setting)
def get_setting_by_key(key: str, db: Session = Depends(get_db)):
    setting = db.query(models.Setting).filter(models.Setting.key == key).first()
    if not setting:
        raise HTTPException(status_code=404, detail="Setting not found")
    return setting
