import re
import time
from .serial_session import SerialSession
from .prompt_detector import PromptDetector, PromptType
from typing import Optional, Dict, Callable

class CommandRunner:
    def __init__(self, session: SerialSession, prompt_patterns: Optional[Dict[str, str]] = None):
        """
        Initialize CommandRunner with optional device-specific prompt patterns.
        
        Args:
            session: SerialSession instance
            prompt_patterns: Optional dict of prompt patterns for device profile
        """
        self.session = session
        self.detector = PromptDetector(prompt_patterns)

    def get_prompted(self) -> str:
        # Wake up console and capture prompt
        out = ""
        for _ in range(5):
            self.session.send_line("")
            time.sleep(0.3) # Give device time to process
            new_out = self.session.read_available()
            out += new_out
            if self.detector.PROMPT_ANY.search(out):
                return out
        
        # If still no prompt, wait more aggressively
        out += self.session.wait_for(self.detector.PROMPT_ANY, timeout=8.0)
        return out

    def ensure_priv_exec(self, custom_command: Optional[str] = None):
        buf = self.get_prompted()

        prompt_type = self.detector.detect(buf)
        if prompt_type == PromptType.PRIV:
            return
        elif prompt_type == PromptType.CONFIG:
            self.session.send_line("end")
            self.session.wait_for(self.detector.PROMPT_PRIV, timeout=5.0)
            return

        if prompt_type == PromptType.USER:
            cmd = custom_command or "en"
            self.session.send_line(cmd)
            # Wait for either the priv prompt OR a password prompt
            out = self.session.wait_for(self.detector.PROMPT_PRIV_OR_PWD, timeout=10.0)
            
            if self.detector.PROMPT_PWD.search(out):
                raise RuntimeError("Enable password prompt detected; add password handling.")
            
            if not self.detector.PROMPT_PRIV.search(out):
                 raise RuntimeError(f"Unexpected response after '{cmd}':\n{out[-400:]}")
            return

        # Unknown prompt style
        raise RuntimeError(f"Could not determine prompt state. Buffer tail:\n{buf[-400:]}")

    def run_show(self, cmd: str, timeout: float = 60.0, on_data: Optional[Callable[[str], None]] = None) -> str:
        """
        Execute a show command and handle pagination prompts automatically.
        Prioritizes pager detection over final prompt detection.
        """
        self.session.send_line(cmd)
        
        full_output = ""
        end_time = time.monotonic() + timeout
        
        while time.monotonic() < end_time:
            chunk = self.session.read_available()
            if not chunk:
                time.sleep(0.1)
                continue
            
            if on_data:
                on_data(chunk)

            full_output += chunk
            normalized = self.detector.normalize(full_output)
            
            # 1. Check for pagination prompt
            # Use small tail but search with the pagination regex
            tail_len = 256
            tail = normalized[-tail_len:]
            
            if self.detector.PROMPT_PAGINATION.search(tail):
                # Send space to continue
                self.session.send(" ")
                
                # Try to clean up the pager prompt from the buffer
                # This makes the final output cleaner
                matches = list(self.detector.PROMPT_PAGINATION.finditer(full_output))
                if matches:
                    last_match = matches[-1]
                    # Only remove if it's within the last chunk-ish to avoid data loss
                    if last_match.start() > len(full_output) - 128:
                        full_output = full_output[:last_match.start()]
                
                time.sleep(0.2) # Wait for device to react
                continue 
            
            # 2. Check for final prompt only if no pager was detected
            if self.detector.PROMPT_PRIV.search(normalized[-256:]):
                return self.detector.normalize(full_output)
                
        raise TimeoutError(f"Timed out waiting for final prompt after '{cmd}'.\nLast output seen:\n{full_output[-500:]}")

    def enter_config_mode(self, custom_command: Optional[str] = None):
        self.ensure_priv_exec()
        cmd = custom_command or "conf t"
        self.session.send_line(cmd)
        self.session.wait_for(self.detector.PROMPT_CONF, timeout=10.0)

    def exit_config_mode(self, custom_command: Optional[str] = None):
        cmd = custom_command or "end"
        self.session.send_line(cmd)
        self.session.wait_for(self.detector.PROMPT_PRIV, timeout=10.0)
    
    def disable_paging(self):
        """
        Best-effort attempt to disable pagination.
        Note: We no longer depend on this being successful as run_show 
        now handles multi-vendor pagination dynamically.
        """
        try:
            self.session.send_line("terminal length 0")
            self.wait_for_prompt(timeout=3.0)
        except Exception:
             # If terminal length 0 is not supported, we just drain and continue.
             # Dynamic pagination will handle the rest during command execution.
             self.session.drain(0.5)

    # Common CLI errors
    ERROR_PATTERNS = [
        re.compile(r"% Invalid input detected", re.I),
        re.compile(r"% Incomplete command", re.I),
        re.compile(r"% Ambiguous command", re.I),
        re.compile(r"Error:", re.I)
    ]

    def wait_for_prompt(self, timeout: float = 15.0, on_data: Optional[Callable[[str], None]] = None) -> str:
        """Wait for any valid prompt to appear and return the normalized buffer."""
        full_output = ""
        end_time = time.monotonic() + timeout
        
        while time.monotonic() < end_time:
            chunk = self.session.read_available()
            if not chunk:
                time.sleep(0.1)
                continue
            
            if on_data:
                on_data(chunk)

            full_output += chunk
            normalized = self.detector.normalize(full_output)
            tail = normalized[-256:]
            
            # 1. Prioritize Pager
            if self.detector.PROMPT_PAGINATION.search(tail):
                self.session.send(" ")
                
                # Cleanup pager prompt
                matches = list(self.detector.PROMPT_PAGINATION.finditer(full_output))
                if matches:
                    last_match = matches[-1]
                    if last_match.start() > len(full_output) - 128:
                        full_output = full_output[:last_match.start()]
                
                time.sleep(0.2)
                continue
                
            # 2. Then check for final prompt
            if self.detector.PROMPT_ANY.search(tail):
                return normalized
                
        raise TimeoutError(f"Timed out waiting for prompt. Last output seen:\n{full_output[-500:]}")

    def check_for_errors(self, buffer: str) -> Optional[str]:
        """Look for common error patterns in the output buffer."""
        for pattern in self.ERROR_PATTERNS:
            match = pattern.search(buffer)
            if match:
                # Return the line containing the error
                lines = buffer[match.start():].splitlines()
                return lines[0] if lines else "Unknown error"
        return None

