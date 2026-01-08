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
    db_template = models.Template(name=template.name, body=template.body, schema=template.schema)
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
