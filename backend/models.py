import datetime
from sqlalchemy import Column, Integer, String, Text, ForeignKey, JSON, DateTime
from sqlalchemy.orm import relationship
from .database import Base

class Template(Base):
    __tablename__ = "templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    body = Column(Text, nullable=True)
    steps = Column(JSON, nullable=False)
    config_schema = Column(JSON, nullable=False)
    verification = Column(JSON, default=list)
    is_baseline = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    jobs = relationship("Job", back_populates="template")

class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    template_id = Column(Integer, ForeignKey("templates.id"), nullable=False)
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

class Setting(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, index=True) # e.g., "port_baud_rates"
    value = Column(JSON, nullable=False) # Store complex settings as JSON
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

