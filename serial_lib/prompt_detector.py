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
        "user": r"(?m).*?>\s*\Z",
        "priv": r"(?m).*?#\s*\Z",
        "config": r"(?m).*?\(config[^\)]*\)#\s*\Z",
        "any": r"(?m).*?[>#]\s*\Z",
        "password": r"(?m)^[Pp]assword:\s*\Z",
        "pagination": r"(?is)\s*--\s*more\s*--\s*\Z|(?im)^\s*more\s*:\s*\Z|(?im)press\s+any\s+key|(?im)press\s+enter|(?im)hit\s+any\s+key|(?im)q\s*=\s*quit|(?im)space\s*bar\s*to\s+continue|(?im)next\s+page|\[\s*more\s*\]"
    }
    
    def __init__(self, patterns: Optional[Dict[str, str]] = None):
        """
        Initialize PromptDetector with custom or default patterns.
        
        Args:
            patterns: Dict with keys 'user', 'priv', 'config', 'any', 'password', 'pagination'
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
        self.PROMPT_PAGINATION = re.compile(p["pagination"], flags)
        
        # Combined pattern for privilege escalation
        self.PROMPT_PRIV_OR_PWD = re.compile(f"({p['priv']})|({p['password']})", flags)
    
    @staticmethod
    def normalize(text: str) -> str:
        """
        Normalize CLI output by stripping ANSI codes, backspaces, and normalizing newlines.
        """
        # Strip ANSI escape sequences
        text = re.sub(r'\x1b\[[0-?]*[ -/]*[@-~]', '', text)
        
        # Handle backspaces (repeatedly apply to handle multiple backspaces)
        while '\x08' in text:
            new_text = re.sub(r'.\x08', '', text, count=1)
            if new_text == text:
                text = text.replace('\x08', '')
                break
            text = new_text

        # Normalize CRLF to LF
        text = text.replace('\r\n', '\n').replace('\r', '\n')
        
        return text

    def detect(self, buffer: str) -> PromptType:
        """
        Analyze the end of the buffer to determine the current prompt state.
        """
        normalized = self.normalize(buffer)
        if self.PROMPT_CONF.search(normalized):
            return PromptType.CONFIG
        if self.PROMPT_PRIV.search(normalized):
            return PromptType.PRIV
        if self.PROMPT_USER.search(normalized):
            return PromptType.USER
        return PromptType.UNKNOWN
