import re
from serial_lib.prompt_detector import PromptDetector, PromptType

def test_regex():
    detector = PromptDetector()
    
    test_cases = [
        ("\r\nSwitch> ", PromptType.USER),
        ("Switch>", PromptType.USER),
        ("\nSwitch#", PromptType.PRIV),
        ("Switch# ", PromptType.PRIV),
        ("\r\nSwitch(config)# ", PromptType.CONFIG),
        ("Switch(config)#", PromptType.CONFIG),
        ("garbage data\r\nSwitch#", PromptType.PRIV),
        ("initial boot noise Switch>", PromptType.USER),
        ("Switch(config-if)# ", PromptType.CONFIG),
    ]
    
    all_passed = True
    for buffer, expected in test_cases:
        result = detector.detect(buffer)
        if result == expected:
            print(f"PASS: Buffer {repr(buffer)} -> {result}")
        else:
            print(f"FAIL: Buffer {repr(buffer)} -> Expected {expected}, got {result}")
            all_passed = False
            
    if all_passed:
        print("\nAll regex tests PASSED!")
    else:
        print("\nSome regex tests FAILED!")

if __name__ == "__main__":
    test_regex()
