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
    # Note: Global flags like (?im) are moved to re.compile to avoid 'global flags not at start' errors.
    DEFAULT_PATTERNS = {
        "user": r".*?>\s*\Z",
        "priv": r".*?#\s*\Z",
        "config": r".*?\(config[^\)]*\)#\s*\Z",
        "any": r".*?[>#]\s*\Z",
        "password": r"^[Pp]assword:\s*\Z",
        "pagination": r"\s*--\s*more\s*--|^\s*more\s*:|press\s+any\s+key|press\s+enter|hit\s+any\s+key|q\s*=\s*quit|space\s*bar\s*to\s+continue|next\s+page|\[\s*more\s*\]"
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
        
        # Standard flags: MULTILINE is common for prompts, IGNORECASE for pagination.
        self.PROMPT_USER = re.compile(p["user"], re.MULTILINE)
        self.PROMPT_PRIV = re.compile(p["priv"], re.MULTILINE)
        self.PROMPT_CONF = re.compile(p["config"], re.MULTILINE)
        self.PROMPT_ANY = re.compile(p["any"], re.MULTILINE)
        self.PROMPT_PWD = re.compile(p["password"], re.MULTILINE)
        
        # Pagination needs Case-Insensitivity and Multi-line
        self.PROMPT_PAGINATION = re.compile(p["pagination"], re.IGNORECASE | re.MULTILINE)
        
        # Combined pattern for privilege escalation
        self.PROMPT_PRIV_OR_PWD = re.compile(f"({p['priv']})|({p['password']})", re.MULTILINE)
    
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
