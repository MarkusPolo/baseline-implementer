import re
import time
from .serial_session import SerialSession
from .prompt_detector import PromptDetector, PromptType
from typing import Optional, Dict

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

    def run_show(self, cmd: str, timeout: float = 20.0) -> str:
        self.session.send_line(cmd)
        # capture until we return to privileged prompt
        out = self.session.wait_for(self.detector.PROMPT_PRIV, timeout=timeout)
        return out

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
        self.session.send_line("terminal length 0")
        # In config mode it returns to config prompt, in priv mode to priv prompt.
        # We generally expect this to be run in priv mode or config mode.
        # For safety let's assume usage in config mode or check prompt.
        # But commonly "terminal length 0" is a priv exec command on many platforms,
        # though often works in config mode too or is implicit.
        # Let's match PROMPT_ANY to be safe or just drain.
        self.session.drain(0.5)

