from typing import List, Optional, Dict, Any
from pydantic import BaseModel, ConfigDict
import datetime

# Template Schemas
class TemplateBase(BaseModel):
    name: str
    steps: List[Dict[str, Any]]
    config_schema: Dict[str, Any]
    verification: Optional[List[Dict[str, Any]]] = []
    is_baseline: Optional[int] = 0

class TemplateCreate(TemplateBase):
    pass

class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    steps: Optional[List[Dict[str, Any]]] = None
    config_schema: Optional[Dict[str, Any]] = None
    verification: Optional[List[Dict[str, Any]]] = None
    is_baseline: Optional[int] = None

class Template(TemplateBase):
    id: int
    created_at: datetime.datetime

    class Config:
        from_attributes = True

# Job Schemas
class JobTargetBase(BaseModel):
    port: str
    variables: Dict[str, Any]

class JobTargetCreate(JobTargetBase):
    pass

class JobTarget(JobTargetBase):
    id: int
    job_id: int
    status: str
    log: Optional[str] = ""
    verification_results: Optional[List[Dict[str, Any]]] = []
    failure_category: Optional[str] = None
    remediation: Optional[str] = None
    created_at: datetime.datetime
    updated_at: datetime.datetime

    class Config:
        from_attributes = True

class JobCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    template_id: int
    targets: List[JobTargetCreate]

class Job(BaseModel):
    id: int
    template_id: int
    status: str
    created_at: datetime.datetime
    targets: List[JobTarget] = []

    class Config:
        from_attributes = True

# Setting Schemas
class SettingBase(BaseModel):
    key: str
    value: Any

class SettingCreate(SettingBase):
    pass

class Setting(SettingBase):
    id: int
    updated_at: datetime.datetime

    class Config:
        from_attributes = True
