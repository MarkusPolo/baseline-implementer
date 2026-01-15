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
    body: Optional[str] = None
    steps: Optional[List[Dict[str, Any]]] = None
    config_schema: Dict[str, Any]
    verification: Optional[List[Dict[str, Any]]] = []
    is_baseline: Optional[int] = 0
    profile_id: Optional[int] = None

class TemplateCreate(TemplateBase):
    pass

class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    body: Optional[str] = None
    steps: Optional[List[Dict[str, Any]]] = None
    config_schema: Optional[Dict[str, Any]] = None
    verification: Optional[List[Dict[str, Any]]] = None
    is_baseline: Optional[int] = None
    profile_id: Optional[int] = None

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
    template_id: Optional[int] = None
    macro_id: Optional[int] = None
    targets: List[JobTargetCreate]

class Job(BaseModel):
    id: int
    template_id: Optional[int] = None
    macro_id: Optional[int] = None
    status: str
    created_at: datetime.datetime
    targets: List[JobTarget] = []

    class Config:
        from_attributes = True

# Macro Schemas
class MacroBase(BaseModel):
    name: str
    description: Optional[str] = None
    steps: List[Dict[str, Any]]
    config_schema: Optional[Dict[str, Any]] = None

class MacroCreate(MacroBase):
    pass

class MacroUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    steps: Optional[List[Dict[str, Any]]] = None
    config_schema: Optional[Dict[str, Any]] = None

class Macro(MacroBase):
    id: int
    created_at: datetime.datetime

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
