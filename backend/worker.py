import os
import time
import re
from celery import Celery
from sqlalchemy.orm import Session
from jinja2 import Environment, StrictUndefined

from .database import SessionLocal
from . import models

# Assuming serial_lib is in PYTHONPATH or sibling directory
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from serial_lib.serial_session import SerialSession
from serial_lib.command_runner import CommandRunner
from serial_lib.verifier import Verifier
from serial_lib.prompt_detector import PromptDetector

# Redis URL - make configurable
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery("worker", broker=REDIS_URL, backend=REDIS_URL)

def get_db_session():
    return SessionLocal()

# Failure Categories
class FailureCategory:
    PORT_BUSY = "port_busy"
    PERMISSION_DENIED = "permission_denied"
    NO_PROMPT = "no_prompt"
    ENABLE_PASSWORD = "enable_password_required"
    COMMAND_TIMEOUT = "command_timeout"
    DEVICE_ERROR = "device_error"
    VERIFICATION_FAILED = "verification_failed"
    FILE_NOT_FOUND = "file_not_found"
    TEMPLATE_ERROR = "template_error"
    UNKNOWN = "unknown"

def categorize_failure(error_msg: str, log: str) -> str:
    """Categorize failure based on error message and logs."""
    error_lower = error_msg.lower()
    log_lower = log.lower()
    
    if "does not exist" in error_lower or "filenotfound" in error_lower:
        return FailureCategory.FILE_NOT_FOUND
    if "permission denied" in error_lower:
        return FailureCategory.PERMISSION_DENIED
    if "enable password" in error_lower:
        return FailureCategory.ENABLE_PASSWORD
    if "timeout" in error_lower:
        return FailureCategory.COMMAND_TIMEOUT
    if "could not determine prompt" in error_lower:
        return FailureCategory.NO_PROMPT
    if "% invalid input" in log_lower or "% ambiguous command" in log_lower:
        return FailureCategory.DEVICE_ERROR
    if "undefined" in error_lower or "is undefined" in error_lower:
        return FailureCategory.TEMPLATE_ERROR
        
    return FailureCategory.UNKNOWN

def suggest_remediation(category: str) -> str:
    """Provide remediation suggestions based on failure category."""
    suggestions = {
        FailureCategory.FILE_NOT_FOUND: "Verify that the serial port path is correct and the device is connected. Check ~/portX symlinks.",
        FailureCategory.PERMISSION_DENIED: "Ensure the application has permission to access the serial device. Add user to 'dialout' group on Linux.",
        FailureCategory.ENABLE_PASSWORD: "Configure enable password handling in the template or ensure the device doesn't require one.",
        FailureCategory.COMMAND_TIMEOUT: "Check serial connection stability. Increase timeout values if device is slow to respond.",
        FailureCategory.NO_PROMPT: "Verify correct baud rate (9600/115200). Check cabling and ensure device is powered on.",
        FailureCategory.DEVICE_ERROR: "Review the configuration commands for syntax errors. Check device documentation.",
        FailureCategory.TEMPLATE_ERROR: "Ensure all template variables are provided in the job submission.",
        FailureCategory.VERIFICATION_FAILED: "Review the verification checks and ensure expected values match actual configuration.",
        FailureCategory.PORT_BUSY: "Another job may be using this port. Wait and retry.",
        FailureCategory.UNKNOWN: "Review the error log for details. Contact support if issue persists."
    }
    return suggestions.get(category, suggestions[FailureCategory.UNKNOWN])

def run_verification_checks(runner: CommandRunner, checks: list, variables: dict) -> list:
    """
    Run verification checks and return results.
    Each check format: {name, command, type, pattern, evidence_lines}
    Returns: [{check_name, status, evidence, message}]
    """
    results = []
    
    for check in checks:
        check_name = check.get("name", "Unnamed Check")
        command = check.get("command", "show run")
        check_type = check.get("type", "regex_match")
        pattern_raw = check.get("pattern", "")
        evidence_lines = check.get("evidence_lines", 3)
        
        # Render pattern with variables (Jinja2)
        try:
            env = Environment(undefined=StrictUndefined)
            pattern = env.from_string(pattern_raw).render(**variables)
        except Exception as e:
            results.append({
                "check_name": check_name,
                "status": "error",
                "evidence": "",
                "message": f"Pattern render error: {str(e)}"
            })
            continue
        
        try:
            # Execute command
            output = runner.run_show(command)
            
            # Run check based on type
            if check_type == "regex_match":
                match = re.search(pattern, output, re.MULTILINE)
                if match:
                    # Extract evidence
                    lines = output.splitlines()
                    match_line_idx = output[:match.start()].count("\n")
                    start_idx = max(0, match_line_idx - evidence_lines)
                    end_idx = min(len(lines), match_line_idx + evidence_lines + 1)
                    evidence = "\n".join(lines[start_idx:end_idx])
                    
                    results.append({
                        "check_name": check_name,
                        "status": "pass",
                        "evidence": evidence,
                        "message": f"Pattern matched: {pattern}"
                    })
                else:
                    results.append({
                        "check_name": check_name,
                        "status": "fail",
                        "evidence": output[-500:],  # Last 500 chars as evidence
                        "message": f"Pattern not found: {pattern}"
                    })
                    
            elif check_type == "regex_not_present":
                match = re.search(pattern, output, re.MULTILINE)
                if not match:
                    results.append({
                        "check_name": check_name,
                        "status": "pass",
                        "evidence": "",
                        "message": f"Pattern correctly absent: {pattern}"
                    })
                else:
                    lines = output.splitlines()
                    match_line_idx = output[:match.start()].count("\n")
                    start_idx = max(0, match_line_idx - evidence_lines)
                    end_idx = min(len(lines), match_line_idx + evidence_lines + 1)
                    evidence = "\n".join(lines[start_idx:end_idx])
                    
                    results.append({
                        "check_name": check_name,
                        "status": "fail",
                        "evidence": evidence,
                        "message": f"Unwanted pattern found: {pattern}"
                    })
                    
            elif check_type == "contains":
                if pattern in output:
                    idx = output.find(pattern)
                    start = max(0, idx - 100)
                    end = min(len(output), idx + 100)
                    evidence = output[start:end]
                    
                    results.append({
                        "check_name": check_name,
                        "status": "pass",
                        "evidence": evidence,
                        "message": f"Text found: {pattern}"
                    })
                else:
                    results.append({
                        "check_name": check_name,
                        "status": "fail",
                        "evidence": output[-500:],
                        "message": f"Text not found: {pattern}"
                    })
                    
        except Exception as e:
            results.append({
                "check_name": check_name,
                "status": "error",
                "evidence": "",
                "message": f"Check execution error: {str(e)}"
            })
    
    return results

@celery_app.task(bind=True)
def execute_job(self, job_id: int):
    """
    Main task to execute a full job.
    """
    db = get_db_session()
    try:
        job = db.query(models.Job).filter(models.Job.id == job_id).first()
        if not job:
            return "Job not found"

        job.status = "running"
        db.commit()

        template_body = job.template.body
        verification_checks = job.template.verification or []
        
        # Load device profile if specified
        profile = None
        if job.template.profile_id:
            profile = db.query(models.DeviceProfile).filter(models.DeviceProfile.id == job.template.profile_id).first()
        
        # Simple sequential execution for MVP
        for target in job.targets:
            process_target(db, target, template_body, verification_checks, profile)
        
        # Check overall status
        failed = any(t.status == "failed" for t in job.targets)
        job.status = "failed" if failed else "completed"
        db.commit()

    finally:
        db.close()

def process_target(db: Session, target: models.JobTarget, template_body: str, verification_checks: list, profile=None):
    target.status = "running"
    db.commit()
    
    log_buffer = []
    
    def log(msg):
        log_buffer.append(f"[{time.strftime('%H:%M:%S')}] {msg}")
        target.log = "\n".join(log_buffer)
        db.commit()

    try:
        # 1. Prepare Environment
        env = Environment(undefined=StrictUndefined)
        
        # 2. Connect to Serial
        port_path = os.path.expanduser(target.port)
        if not os.path.exists(port_path):
             raise FileNotFoundError(f"Port {port_path} does not exist")

        log(f"Connecting to {port_path}...")
        
        # Extract prompt patterns from profile
        prompt_patterns = None
        if profile:
            prompt_patterns = profile.prompt_patterns
            log(f"Using device profile: {profile.name} ({profile.vendor})")
        
        with SerialSession(port_path) as session:
            # Clear noise and wake up
            session.drain(0.5)
            runner = CommandRunner(session, prompt_patterns)
            
            # 3. Execute Steps (New Logic) or Template Body (Old Logic)
            if target.job.template.steps:
                log(f"Executing {len(target.job.template.steps)} steps...")
                target.verification_results = []
                
                for i, step in enumerate(target.job.template.steps):
                    step_type = step.get("type", "command")
                    log(f"Step {i+1}: {step_type}")
                    
                    if step_type == "command":
                        cmd_template = step.get("content", "")
                        rendered_cmd = env.from_string(cmd_template).render(**target.variables)
                        session.send_line(rendered_cmd)
                        # Wait for prompt after command
                        runner.wait_for_prompt()
                        log(f"Sent: {rendered_cmd}")
                        
                    elif step_type == "verify":
                        check = {
                            "name": step.get("name", f"Check {i+1}"),
                            "command": step.get("command", "show run"),
                            "type": step.get("check_type", "regex_match"),
                            "pattern": step.get("pattern", ""),
                            "evidence_lines": step.get("evidence_lines", 3)
                        }
                        results = run_verification_checks(runner, [check], target.variables)
                        target.verification_results.extend(results)
                        
                        if any(r["status"] in ["fail", "error"] for r in results):
                             log(f"Verification FAILED: {check['name']}")
                        else:
                             log(f"Verification PASSED: {check['name']}")

                    elif step_type == "priv_mode":
                         runner.ensure_priv_exec()
                         log("Acquired privileged mode.")
                         
                    elif step_type == "config_mode":
                         runner.enter_config_mode()
                         log("Entered config mode.")
                         
                    elif step_type == "exit_config":
                         runner.exit_config_mode()
                         log("Exited config mode.")
                
                # Final check if any verification failed
                failed_checks = [c for c in target.verification_results if c["status"] in ["fail", "error"]]
                if failed_checks:
                    target.status = "failed"
                    target.failure_category = FailureCategory.VERIFICATION_FAILED
                    target.remediation = "One or more verification checks failed."
                else:
                    target.status = "success"
                    log("All steps completed successfully.")

            else:
                # Fallback to Old Logic
                log("Executing deprecated body-based template...")
                template = env.from_string(template_body)
                rendered_config = template.render(**target.variables)
                log("Template rendered successfully.")
                
                runner.ensure_priv_exec()
                log("Acquired privileged mode.")
                
                runner.enter_config_mode()
                log("Entered config mode.")
                
                # Send config line by line
                for line in rendered_config.splitlines():
                    if line.strip():
                         session.send_line(line)
                         time.sleep(0.1) 
                
                log("Config sent.")
                runner.exit_config_mode()
                
                # Run verification checks
                if verification_checks:
                    log(f"Running {len(verification_checks)} verification check(s)...")
                    check_results = run_verification_checks(runner, verification_checks, target.variables)
                    target.verification_results = check_results
                    
                    failed_checks = [c for c in check_results if c["status"] in ["fail", "error"]]
                    if failed_checks:
                        target.status = "failed"
                        target.failure_category = FailureCategory.VERIFICATION_FAILED
                        target.remediation = "One or more verification checks failed."
                        log(f"Verification FAILED: {len(failed_checks)}/{len(check_results)} checks failed.")
                    else:
                        target.status = "success"
                        log(f"Verification PASSED: All {len(check_results)} checks passed.")
                else:
                    target.status = "success"
                    log("No verification checks defined. Execution completed successfully.")

    except Exception as e:
        target.status = "failed"
        error_msg = str(e)
        log(f"Error: {error_msg}")
        
        # Categorize and suggest remediation
        target.failure_category = categorize_failure(error_msg, target.log)
        target.remediation = suggest_remediation(target.failure_category)
        
    finally:
        db.commit()
