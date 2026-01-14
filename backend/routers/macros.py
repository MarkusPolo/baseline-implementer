from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import SessionLocal
from .. import models, schemas

router = APIRouter(prefix="/macros", tags=["macros"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/", response_model=schemas.Macro)
def create_macro(macro: schemas.MacroCreate, db: Session = Depends(get_db)):
    db_macro = models.Macro(**macro.dict())
    db.add(db_macro)
    db.commit()
    db.refresh(db_macro)
    return db_macro

@router.get("/", response_model=List[schemas.Macro])
def list_macros(db: Session = Depends(get_db)):
    return db.query(models.Macro).all()

@router.get("/{macro_id}", response_model=schemas.Macro)
def get_macro(macro_id: int, db: Session = Depends(get_db)):
    macro = db.query(models.Macro).filter(models.Macro.id == macro_id).first()
    if not macro:
        raise HTTPException(status_code=404, detail="Macro not found")
    return macro

@router.delete("/{macro_id}")
def delete_macro(macro_id: int, db: Session = Depends(get_db)):
    macro = db.query(models.Macro).filter(models.Macro.id == macro_id).first()
    if not macro:
        raise HTTPException(status_code=404, detail="Macro not found")
    db.delete(macro)
    db.commit()
    return {"status": "success"}

@router.put("/{macro_id}", response_model=schemas.Macro)
def update_macro(macro_id: int, macro_update: schemas.MacroUpdate, db: Session = Depends(get_db)):
    db_macro = db.query(models.Macro).filter(models.Macro.id == macro_id).first()
    if not db_macro:
        raise HTTPException(status_code=404, detail="Macro not found")
    
    update_data = macro_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_macro, key, value)
    
    db.commit()
    db.refresh(db_macro)
    return db_macro
