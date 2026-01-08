from typing import List, Optional, Dict, Any
from pydantic import BaseModel
import datetime

# Device Profile Schemas
class DeviceProfileBase(BaseModel):
    name: str
    vendor: str
    description: Optional[str] = None
    prompt_patterns: Dict[str, str]
    commands: Dict[str, str]
    error_markers: List[str] = []
    detection_command: Optional[str] = None

class DeviceProfileCreate(DeviceProfileBase):
    pass

class DeviceProfile(DeviceProfileBase):
    id: int
    created_at: datetime.datetime

    class Config:
        from_attributes = True

# Template Schemas
class TemplateBase(BaseModel):
    name: str
    body: str
    config_schema: Dict[str, Any]
    verification: Optional[List[Dict[str, Any]]] = []
    profile_id: Optional[int] = None

class TemplateCreate(TemplateBase):
    pass

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
