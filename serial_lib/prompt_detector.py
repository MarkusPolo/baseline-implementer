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
        "user": r"(?:\r|\n|^).*?>\s*$",
        "priv": r"(?:\r|\n|^).*?#\s*$",
        "config": r"(?:\r|\n|^).*?\(config[^\)]*\)#\s*$",
        "any": r"(?:\r|\n|^).*?[>#]\s*$"
    }
    
    def __init__(self, patterns: Optional[Dict[str, str]] = None):
        """
        Initialize PromptDetector with custom or default patterns.
        
        Args:
            patterns: Dict with keys 'user', 'priv', 'config', 'any'
        """
        patterns = patterns or self.DEFAULT_PATTERNS
        
        self.PROMPT_USER = re.compile(patterns.get("user", self.DEFAULT_PATTERNS["user"]))
        self.PROMPT_PRIV = re.compile(patterns.get("priv", self.DEFAULT_PATTERNS["priv"]))
        self.PROMPT_CONF = re.compile(patterns.get("config", self.DEFAULT_PATTERNS["config"]))
        self.PROMPT_ANY = re.compile(patterns.get("any", self.DEFAULT_PATTERNS["any"]))
    
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
