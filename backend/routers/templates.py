from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from .. import models, schemas, database

router = APIRouter(
    prefix="/templates",
    tags=["templates"],
)

def _steps_from_body(body: str | None) -> list:
    if not body:
        return []
    return [
        {"type": "command", "content": line.strip(), "wait_prompt": True}
        for line in body.splitlines()
        if line.strip() and not line.strip().startswith("!")
    ]

def _standardize_template(template: models.Template, db: Session) -> models.Template:
    if template.steps is None:
        template.steps = _steps_from_body(template.body)
        db.add(template)
        db.commit()
        db.refresh(template)
    return template

@router.post("/", response_model=schemas.Template)
def create_template(template: schemas.TemplateCreate, db: Session = Depends(database.get_db)):
    db_template = models.Template(
        name=template.name, 
        config_schema=template.config_schema,
        steps=template.steps,
        is_baseline=template.is_baseline
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
    return [_standardize_template(template, db) for template in templates]

@router.get("/{template_id}", response_model=schemas.Template)
def read_template(template_id: int, db: Session = Depends(database.get_db)):
    template = db.query(models.Template).filter(models.Template.id == template_id).first()
    if template is None:
        raise HTTPException(status_code=404, detail="Template not found")
    return _standardize_template(template, db)

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

