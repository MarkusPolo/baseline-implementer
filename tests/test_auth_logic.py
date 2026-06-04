import re
import time
from typing import List

# Mock Classes for Testing
class MockSerial:
    def __init__(self, responses: List[str]):
        self.responses = responses
        self.sent = []
        self.idx = 0
        self.available = True

    def write(self, data: bytes):
        val = data.decode().strip()
        self.sent.append(val)
        print(f"MockSerial: Received '{val}'")
        if val and self.idx < len(self.responses) - 1:
            self.idx += 1
            self.available = True

    def flush(self):
        pass

    def read(self, size: int) -> bytes:
        if self.available and self.idx < len(self.responses):
            res = self.responses[self.idx]
            self.available = False # Consume it
            return res.encode()
        return b""

class RawWriteSerial:
    def __init__(self):
        self.writes = []

    def write(self, data: bytes):
        self.writes.append(data)

    def flush(self):
        pass

class MockSession:
    def __init__(self, serial_mock: MockSerial):
        self.ser = serial_mock
    
    def send_line(self, line: str):
        self.ser.write((line + "\r").encode())
        
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
from serial_lib.serial_session import SerialSession

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

def test_auth_uses_initial_password_prompt_without_blank_wakeup():
    print("\n--- Testing Initial Password Prompt Does Not Receive Blank Wake-Up ---")
    mock_ser = MockSerial([
        "Password:",
        "5520-24X-FabricEngine#"
    ])
    mock_ser.available = False
    session = MockSession(mock_ser)
    runner = CommandRunner(session)

    runner.authenticate(username="admin", password="password123", initial_buffer="Password:")

    assert mock_ser.sent == ["password123"]
    print("Initial password prompt consumed without blank line.")

def test_extreme_access_denied_then_login_sequence():
    print("\n--- Testing Extreme Access-Denied Transcript Then Login ---")
    transcript = (
        "Password: \n"
        "Login: 1 2026-06-04T05:21:49.066Z 5520-24X-FabricEngine CP1 - "
        "0x00030586 - 00000000 GlobalRouter SW ERROR Access denied : length 0 not allowed\n"
        "1 2026-06-04T05:21:49.066Z 5520-24X-FabricEngine CP1 - 0x001985a0 - "
        "00000000 GlobalRouter ACLI WARNING Blocked unauthorized ACLI access for user  from console port\n\n"
        "Login:"
    )
    mock_ser = MockSerial([
        "",
        "Password:",
        "5520-24X-FabricEngine#"
    ])
    mock_ser.available = False
    session = MockSession(mock_ser)
    runner = CommandRunner(session)

    runner.authenticate(username="admin", password="password123", initial_buffer=transcript)

    assert mock_ser.sent == ["admin", "password123"]
    print("Recovered from Extreme access-denied banner and authenticated.")

def test_serial_session_send_line_uses_single_carriage_return():
    print("\n--- Testing Serial Line Ending Is Single CR ---")
    fake_ser = RawWriteSerial()
    session = SerialSession("unused")
    session.ser = fake_ser
    session.write_delay = 0

    session.send_line("rwa")

    assert fake_ser.writes == [b"rwa\r"]
    print("SerialSession sends one Enter, not CRLF.")

if __name__ == "__main__":
    test_auth_sequence()
    test_already_authenticated()
    test_priv_exec_with_password()
    test_auth_uses_initial_password_prompt_without_blank_wakeup()
    test_extreme_access_denied_then_login_sequence()
    test_serial_session_send_line_uses_single_carriage_return()
