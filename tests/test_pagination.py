import sys
import os
import time
from unittest.mock import MagicMock

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from serial_lib.command_runner import CommandRunner
from serial_lib.prompt_detector import PromptDetector

def test_pagination_handling():
    print("Testing dynamic pagination handling...")
    
    # Mock SerialSession
    session = MagicMock()
    
    # Sequence of outputs to simulate paginated 'show run'
    # 1. First chunk with --More--
    # 2. Second chunk after space
    # 3. Final chunk with prompt
    outputs = [
        "Building configuration...\n\ninterface GigabitEthernet1\n ip address 192.168.1.1 255.255.255.0\n --More-- ",
        " shutdown\n!\ninterface GigabitEthernet2\n --More--",
        " ip address 10.0.0.1 255.255.255.0\n!\nend\nSwitch# "
    ]
    
    def read_side_effect():
        if not outputs:
            return ""
        return outputs.pop(0)

    session.read_available.side_effect = read_side_effect
    
    detector = PromptDetector()
    runner = CommandRunner(session)
    
    # Execute run_show
    result = runner.run_show("show run", timeout=5.0)
    
    print(f"\nFinal Normalized Output:\n{result}")
    
    # Assertions
    # 1. Final output should NOT contain '--More--'
    assert "--More--" not in result, "Pager prompt found in final output!"
    
    # 2. Final output should contain the content from all chunks
    assert "GigabitEthernet1" in result
    assert "GigabitEthernet2" in result
    assert "Switch#" in result
    
    # 3. session.send(" ") should have been called twice
    space_calls = [call for call in session.send.call_args_list if call.args[0] == " "]
    print(f"Space key sent {len(space_calls)} times.")
    assert len(space_calls) == 2, f"Expected 2 space calls, got {len(space_calls)}"
    
    print("\nTest PASSED!")

if __name__ == "__main__":
    test_pagination_handling()
