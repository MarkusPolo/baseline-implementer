import re

class Verifier:
    @staticmethod
    def verify_hostname(show_run_output: str, hostname: str) -> bool:
        return re.search(rf"(?m)^\s*hostname\s+{re.escape(hostname)}\s*$", show_run_output) is not None

    @staticmethod
    def check_regex(content: str, pattern: str) -> bool:
        return re.search(pattern, content) is not None
