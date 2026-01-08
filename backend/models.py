import datetime
from sqlalchemy import Column, Integer, String, Text, ForeignKey, JSON, DateTime
from sqlalchemy.orm import relationship
from .database import Base

class DeviceProfile(Base):
    __tablename__ = "device_profiles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    vendor = Column(String)  # e.g., "Cisco", "HP", "Aruba"
    description = Column(Text, nullable=True)
    prompt_patterns = Column(JSON, nullable=False)  # {user, priv, config, any}
    commands = Column(JSON, nullable=False)  # {show_version, save_config, etc.}
    error_markers = Column(JSON, default=list)  # ["% Invalid", "Error:", etc.]
    detection_command = Column(String, nullable=True)  # Optional command for auto-detect
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    templates = relationship("Template", back_populates="profile")

class Template(Base):
    __tablename__ = "templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    body = Column(Text, nullable=False)  # Jinja2 template
    schema = Column(JSON, nullable=False) # JSON schema for variables
    verification = Column(JSON, default=list)  # List of verification checks
    profile_id = Column(Integer, ForeignKey("device_profiles.id"), nullable=True)  # Device profile
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    profile = relationship("DeviceProfile", back_populates="templates")
    jobs = relationship("Job", back_populates="template")

class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    template_id = Column(Integer, ForeignKey("templates.id"))
    status = Column(String, default="queued") # queued, running, completed, failed
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    template = relationship("Template", back_populates="jobs")
    targets = relationship("JobTarget", back_populates="job")

class JobTarget(Base):
    __tablename__ = "job_targets"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"))
    port = Column(String) # e.g. "~/port1"
    variables = Column(JSON) # Actual variables used for this target
    status = Column(String, default="queued") # queued, running, success, failed
    log = Column(Text, default="")
    verification_results = Column(JSON, default=list)  # List of check results
    failure_category = Column(String, nullable=True)  # Categorized failure type
    remediation = Column(Text, nullable=True)  # Suggested fix
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    job = relationship("Job", back_populates="targets")
