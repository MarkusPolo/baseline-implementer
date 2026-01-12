import re
from enum import Enum, auto
from typing import Optional, Dict

class PromptType(Enum):
    USER = auto()       # >
    PRIV = auto()       # #
    CONFIG = auto()     # (config)# or similar
    UNKNOWN = auto()

class PromptDetector:
    """
    Detects prompt types based on configurable patterns.
    Supports device-specific profiles for multi-vendor compatibility.
    """
    
    # Default Cisco IOS patterns (fallback)
    DEFAULT_PATTERNS = {
        "user": r"(?m)^.*?>\s*$",
        "priv": r"(?m)^.*?#\s*$",
        "config": r"(?m)^.*?\(config[^\)]*\)#\s*$",
        "any": r"(?m)^.*?[>#]\s*$",
        "password": r"(?m)^[Pp]assword:\s*$"
    }
    
    def __init__(self, patterns: Optional[Dict[str, str]] = None):
        """
        Initialize PromptDetector with custom or default patterns.
        
        Args:
            patterns: Dict with keys 'user', 'priv', 'config', 'any', 'password'
        """
        p = self.DEFAULT_PATTERNS.copy()
        if patterns:
            p.update(patterns)
        
        flags = re.MULTILINE
        self.PROMPT_USER = re.compile(p["user"], flags)
        self.PROMPT_PRIV = re.compile(p["priv"], flags)
        self.PROMPT_CONF = re.compile(p["config"], flags)
        self.PROMPT_ANY = re.compile(p["any"], flags)
        self.PROMPT_PWD = re.compile(p["password"], flags)
        
        # Combined pattern for privilege escalation
        self.PROMPT_PRIV_OR_PWD = re.compile(f"({p['priv']})|({p['password']})", flags)
    
    def detect(self, buffer: str) -> PromptType:
        """
        Analyze the end of the buffer to determine the current prompt state.
        """
        if self.PROMPT_CONF.search(buffer):
            return PromptType.CONFIG
        if self.PROMPT_PRIV.search(buffer):
            return PromptType.PRIV
        if self.PROMPT_USER.search(buffer):
            return PromptType.USER
        return PromptType.UNKNOWN
