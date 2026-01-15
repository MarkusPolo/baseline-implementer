from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from .. import models, schemas, database

router = APIRouter(
    prefix="/templates",
    tags=["templates"],
)

@router.post("/", response_model=schemas.Template)
def create_template(template: schemas.TemplateCreate, db: Session = Depends(database.get_db)):
    db_template = models.Template(
        name=template.name, 
        body=template.body, 
        config_schema=template.config_schema,
        steps=template.steps,
        is_baseline=template.is_baseline,
        profile_id=template.profile_id
    )
    db.add(db_template)
    try:
        db.commit()
        db.refresh(db_template)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    return db_template

@router.get("/", response_model=List[schemas.Template])
def read_templates(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db)):
    templates = db.query(models.Template).offset(skip).limit(limit).all()
    return templates

@router.get("/{template_id}", response_model=schemas.Template)
def read_template(template_id: int, db: Session = Depends(database.get_db)):
    template = db.query(models.Template).filter(models.Template.id == template_id).first()
    if template is None:
        raise HTTPException(status_code=404, detail="Template not found")
    return template

@router.put("/{template_id}", response_model=schemas.Template)
def update_template(template_id: int, template_update: schemas.TemplateUpdate, db: Session = Depends(database.get_db)):
    db_template = db.query(models.Template).filter(models.Template.id == template_id).first()
    if not db_template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    update_data = template_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_template, key, value)
    
    try:
        db.commit()
        db.refresh(db_template)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    return db_template

@router.delete("/{template_id}", status_code=204)
def delete_template(template_id: int, db: Session = Depends(database.get_db)):
    db_template = db.query(models.Template).filter(models.Template.id == template_id).first()
    if not db_template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    try:
        db.delete(db_template)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    return None

