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

def run_verification_checks(runner: CommandRunner, checks: list, variables: dict, log_func=None, output_cache=None, include_full_output=True) -> list:
    """
    Run verification checks and return results.
    Each check format: {name, command, type, pattern, evidence_lines}
    Returns: [{check_name, status, evidence, full_output, message}]
    """
    results = []
    
    if output_cache is None:
        output_cache = {}

    def log_msg(msg):
        if log_func:
            log_func(msg)
    
    # Pre-calculate last indices for commands if we are including full output
    last_indices = {}
    if include_full_output:
        for idx, check in enumerate(checks):
            cmd = check.get("command", "show run")
            last_indices[cmd] = idx

    for idx, check in enumerate(checks):
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
            log_msg(f"Error rendering pattern for '{check_name}': {str(e)}")
            results.append({
                "check_name": check_name,
                "status": "error",
                "evidence": "",
                "full_output": "",
                "message": f"Pattern render error: {str(e)}"
            })
            continue
        
        log_msg(f"Running check '{check_name}': cmd='{command}', type='{check_type}', pattern='{pattern}'")
        
        try:
            # Determine if we should include full output for this specific check
            is_last_for_cmd = (last_indices.get(command) == idx)
            should_attach = include_full_output and is_last_for_cmd

            # Execute command (or use cache)
            if command in output_cache:
                output = output_cache[command]
            else:
                output = runner.run_show(command)
                output_cache[command] = output
            
            # Run check based on type
            res = {
                "check_name": check_name,
                "status": "pending",
                "evidence": "",
                "full_output": output if should_attach else "",
                "message": ""
            }

            if check_type == "regex_match":
                # Use re.DOTALL (re.S) to allow . to match newlines for multi-line verification
                flags = re.MULTILINE | re.DOTALL if "\n" in pattern else re.MULTILINE
                match = re.search(pattern, output, flags)
                if match:
                    # Extract evidence
                    lines = output.splitlines()
                    match_line_idx = output[:match.start()].count("\n")
                    start_idx = max(0, match_line_idx - evidence_lines)
                    end_idx = min(len(lines), match_line_idx + evidence_lines + 1)
                    evidence = "\n".join(lines[start_idx:end_idx])
                    
                    res.update({
                        "status": "pass",
                        "evidence": evidence,
                        "message": f"Pattern matched: {pattern}"
                    })
                else:
                    # Fallback: Fuzzy Whitespace Match
                    # This handles cases like "13   MGMT" vs "13 MGMT" (table spacing)
                    # or " description" vs "description" (indentation).
                    try:
                        norm_pattern = " ".join(pattern.split())
                        norm_output = " ".join(output.split())
                        
                        # Use IGNORECASE for the fuzzy match to be extra forgiving and helpful
                        if re.search(norm_pattern, norm_output, re.IGNORECASE):
                            # Try to find the actual match in the original output to provide evidence
                            # We escape the pattern and replace escaped spaces with \s+ 
                            # (not perfect for complex regex, but good for simple literal patterns)
                            try:
                                # Simple approach: split by whitespace and rejoin with \s+
                                # Use re.escape on each word if we suspect the user gave literal text
                                # If it's a regex, we still try the \s+ join
                                tokens = pattern.split()
                                if tokens:
                                    relaxed_search_pattern = r"\s+".join([re.escape(t) for t in tokens])
                                    match_orig = re.search(relaxed_search_pattern, output, re.IGNORECASE | re.DOTALL)
                                    
                                    if match_orig:
                                        lines = output.splitlines()
                                        match_line_idx = output[:match_orig.start()].count("\n")
                                        start_idx = max(0, match_line_idx - evidence_lines)
                                        end_idx = min(len(lines), match_line_idx + evidence_lines + 1)
                                        evidence = "\n".join(lines[start_idx:end_idx])
                                    else:
                                        evidence = "(Relaxed match successful - lines found but context extraction failed)"
                                else:
                                    evidence = "(Relaxed match successful)"
                            except Exception:
                                evidence = "(Relaxed match successful)"

                            res.update({
                                "status": "pass",
                                "evidence": evidence,
                                "message": f"Pattern matched (relaxed conformance): {pattern}"
                            })
                        else:
                            res.update({
                                "status": "fail",
                                "evidence": output[-500:],  # Last 500 chars as evidence
                                "message": f"Pattern not found: {pattern}"
                            })
                    except Exception:
                        # If normalization inadvertently breaks a complex regex, fall back to fail
                        res.update({
                            "status": "fail",
                            "evidence": output[-500:],
                            "message": f"Pattern not found: {pattern}"
                        })
                    
            elif check_type == "regex_not_present":
                flags = re.MULTILINE | re.DOTALL if "\n" in pattern else re.MULTILINE
                match = re.search(pattern, output, flags)
                if not match:
                    res.update({
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
                    
                    res.update({
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
                    
                    res.update({
                        "status": "pass",
                        "evidence": evidence,
                        "message": f"Text found: {pattern}"
                    })
                else:
                    res.update({
                        "status": "fail",
                        "evidence": output[-500:],
                        "message": f"Text not found: {pattern}"
                    })
            
            results.append(res)
            log_msg(f"Check '{check_name}' result: {res['status']}")
                    
        except Exception as e:
            results.append({
                "check_name": check_name,
                "status": "error",
                "evidence": "",
                "full_output": "",
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

        template_body = job.template.body if job.template else None
        verification_checks = (job.template.verification if job.template else []) or []
        macro_steps = job.macro.steps if job.macro else None
        
        # Load device profile if specified
        profile = None
        if job.template and job.template.profile_id:
            profile = db.query(models.DeviceProfile).filter(models.DeviceProfile.id == job.template.profile_id).first()
        
        # Simple sequential execution for MVP
        for target in job.targets:
            process_target(db, target, template_body, verification_checks, profile, macro_steps)
        
        # Check overall status
        failed = any(t.status == "failed" for t in job.targets)
        job.status = "failed" if failed else "completed"
        db.commit()

    finally:
        db.close()

def process_target(db: Session, target: models.JobTarget, template_body: str, verification_checks: list, profile=None, macro_steps=None):
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
        
        # Fetch baud rate from settings
        baud = 9600
        setting = db.query(models.Setting).filter(models.Setting.key == "port_baud_rates").first()
        if setting:
            # target.port might be "~/port1", so we extract the port ID
            match = re.search(r"port(\d+)", target.port)
            if match:
                port_id = match.group(1)
                baud = setting.value.get(port_id, 9600)

        with SerialSession(port_path, baud=baud) as session:
            # Clear noise and wake up
            session.drain(0.5)
            runner = CommandRunner(session, prompt_patterns)
            
            # Disable paging (best-effort; dynamic detection handles it if it fails)
            runner.disable_paging()
            log("Interactive pagination handler active.")
            
            # 3. Execute Steps (New Logic) or Template Body (Old Logic)
            active_steps = macro_steps or (target.job.template.steps if target.job.template else None)
            
            if active_steps:
                # Separate execution steps from verification checks
                execution_steps = [s for s in active_steps if s.get("type") != "verify"]
                verification_steps = [s for s in active_steps if s.get("type") == "verify"]
                
                log(f"Executing {len(execution_steps)} configuration steps...")
                target.verification_results = []
                
                for i, step in enumerate(execution_steps):
                    step_type = step.get("type", "send")
                    log(f"Step {i+1}: {step_type}")
                    
                    if step_type in ["send", "command"]:
                        cmd_template = step.get("cmd", step.get("content", ""))
                        rendered_cmd = env.from_string(cmd_template).render(**target.variables)
                        session.send_line(rendered_cmd)
                        # Wait for prompt after command if specified
                        if step.get("wait_prompt", True):
                            out = runner.wait_for_prompt()
                            log(f"Sent: {rendered_cmd}")
                            # Check for errors in output
                            error_msg = runner.check_for_errors(out)
                            if error_msg:
                                 log(f"WARNING: {error_msg}")
                        else:
                            log(f"Sent (no wait): {rendered_cmd}")
                    
                    elif step_type == "expect":
                        pattern_template = step.get("pattern", "")
                        response_template = step.get("response", "")
                        
                        pattern = env.from_string(pattern_template).render(**target.variables)
                        response = env.from_string(response_template).render(**target.variables)
                        
                        log(f"Waiting for pattern: {pattern}")
                        # Use session.read_until or similar if available, or session.read with timeout
                        # CommandRunner doesn't have a direct 'expect', so we'll use a simple loop
                        found = False
                        start_time = time.time()
                        buffer = ""
                        while time.time() - start_time < 30: # 30s timeout
                            chunk = session.read()
                            if chunk:
                                buffer += chunk
                                if re.search(pattern, buffer):
                                    found = True
                                    break
                            time.sleep(0.1)
                        
                        if found:
                            log(f"Found pattern. Sending response: {response}")
                            session.send_line(response)
                            # Usually expect/send is followed by another prompt or another expect
                        else:
                            raise TimeoutError(f"Timeout waiting for pattern: {pattern}")

                    elif step_type == "priv_mode":
                         cmd = step.get("content") or step.get("command")
                         runner.ensure_priv_exec(custom_command=cmd)
                         log(f"Acquired privileged mode (using: {cmd or 'default'}).")
                         
                    elif step_type == "config_mode":
                         cmd = step.get("content") or step.get("command")
                         runner.enter_config_mode(custom_command=cmd)
                         log(f"Entered config mode (using: {cmd or 'default'}).")
                         
                    elif step_type == "exit_config":
                         cmd = step.get("content") or step.get("command")
                         runner.exit_config_mode(custom_command=cmd)
                         log(f"Exited config mode (using: {cmd or 'default'}).")
                
                # Run all verification steps at the end
                if verification_steps:
                    # DRAIN: Wait for Syslog messages (e.g. "%SYS-5-CONFIG_I") to clear
                    log("Draining buffer (2s) to clear Syslog messages...")
                    session.drain(2.0)

                    log(f"Running {len(verification_steps)} verification steps...")
                    checks = []
                    for i, step in enumerate(verification_steps):
                        checks.append({
                            "name": step.get("name", f"Check {i+1}"),
                            "command": step.get("command", "show run"),
                            "type": step.get("check_type", "regex_match"),
                            "pattern": step.get("pattern", ""),
                            "evidence_lines": step.get("evidence_lines", 3)
                        })
                    results = run_verification_checks(runner, checks, target.variables, log_func=log)
                    target.verification_results = results
                    
                    failed_count = sum(1 for r in results if r["status"] in ["fail", "error"])
                    if failed_count:
                         log(f"Verification FAILED: {failed_count}/{len(results)} checks failed.")
                    else:
                         log("Verification PASSED: All checks passed.")
                
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
                redundant_cmds = ["en", "enable", "conf", "configure", "conf t", "configure terminal"]
                
                for line in rendered_config.splitlines():
                    stripped = line.strip()
                    if not stripped:
                        continue
                        
                    # Filter redundant commands
                    if stripped.lower() in redundant_cmds:
                        log(f"Skipping redundant command: {stripped}")
                        continue

                    session.send_line(stripped)
                    # We don't wait for a prompt here to be fast, but we should check for errors
                    # and give a tiny bit of time for the buffer to fill if there's an error
                    time.sleep(0.2) 
                    
                    # Opportunistic error check
                    out = session.read_available()
                    error_msg = runner.check_for_errors(out)
                    if error_msg:
                        log(f"WARNING: Error after '{stripped}': {error_msg}")
                
                log("Config sent.")
                runner.exit_config_mode()
                
                # Run verification checks
                if verification_checks:
                    # DRAIN: Wait for Syslog messages
                    log("Draining buffer (2s) to clear Syslog messages...")
                    session.drain(2.0)
                    
                    log(f"Running {len(verification_checks)} verification check(s)...")
                    check_results = run_verification_checks(runner, verification_checks, target.variables, log_func=log)
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
