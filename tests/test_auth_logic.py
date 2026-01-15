import re
import time
from typing import List

# Mock Classes for Testing
class MockSerial:
    def __init__(self, responses: List[str]):
        self.responses = responses
        self.sent = []
        self.idx = 0
    
    def write(self, data: bytes):
        val = data.decode().strip()
        self.sent.append(val)
        print(f"MockSerial: Received '{val}'")
        # Trigger next response after write, but only for non-empty commands 
        # (or specifically handle the initial wake-up)
        if val and self.idx < len(self.responses) - 1:
            self.idx += 1
            self.available = True
    
    def flush(self):
        pass
        
    def __init__(self, responses: List[str]):
        self.responses = responses
        self.sent = []
        self.idx = 0
        self.available = True

    def read(self, size: int) -> bytes:
        if self.available and self.idx < len(self.responses):
            res = self.responses[self.idx]
            self.available = False # Consume it
            return res.encode()
        return b""

class MockSession:
    def __init__(self, serial_mock: MockSerial):
        self.ser = serial_mock
    
    def send_line(self, line: str):
        self.ser.write((line + "\r\n").encode())
        
    def read_available(self) -> str:
        return self.ser.read(4096).decode()
    
    def wait_for(self, pattern: re.Pattern, timeout: float = 10.0) -> str:
        buf = ""
        while True:
            chunk = self.read_available()
            if not chunk: break
            buf += chunk
        return buf

    def drain(self, sec=0.1):
        pass

# Import the actual classes (simulation for this script)
# In real test, we'd import from serial_lib
import sys
import os
sys.path.append(os.getcwd())

from serial_lib.prompt_detector import PromptDetector
from serial_lib.command_runner import CommandRunner

def test_auth_sequence():
    print("\n--- Testing Authentication Sequence (Username -> Password -> Prompt) ---")
    mock_ser = MockSerial([
        "Username:", 
        "Password:", 
        "Switch#"
    ])
    session = MockSession(mock_ser)
    runner = CommandRunner(session)
    
    # We need to monkeypatch session.read_available because CommandRunner calls it
    # But in our mock it's already functional
    
    try:
        runner.authenticate(username="admin", password="password123")
        print("Test Passed: Authenticated successfully")
    except Exception as e:
        print(f"Test Failed: {e}")
    
    assert "admin" in mock_ser.sent
    assert "password123" in mock_ser.sent
    print("Sent sequence correct.")

def test_already_authenticated():
    print("\n--- Testing Already Authenticated Case ---")
    mock_ser = MockSerial([
        "Switch#"
    ])
    session = MockSession(mock_ser)
    runner = CommandRunner(session)
    
    try:
        runner.authenticate(username="admin", password="password123")
        print("Test Passed: Detected prompt immediately")
    except Exception as e:
        print(f"Test Failed: {e}")
    
    assert "admin" not in mock_ser.sent
    print("No credentials sent as expected.")

def test_priv_exec_with_password():
    print("\n--- Testing Privilege Escalation with Password ---")
    mock_ser = MockSerial([
        "Switch>", # prompted() wakes up and sees this
        "Password:", # sent 'en', device asks password
        "Switch#" # sent password, device gives priv prompt
    ])
    session = MockSession(mock_ser)
    runner = CommandRunner(session)
    
    try:
        runner.ensure_priv_exec(password="enablepwd")
        print("Test Passed: Escalated successfully")
    except Exception as e:
        print(f"Test Failed: {e}")
        
    assert "en" in mock_ser.sent
    assert "enablepwd" in mock_ser.sent
    print("En and Password sent correct.")

if __name__ == "__main__":
    test_auth_sequence()
    test_already_authenticated()
    test_priv_exec_with_password()
