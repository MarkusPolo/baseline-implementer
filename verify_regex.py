import re
from serial_lib.prompt_detector import PromptDetector, PromptType

def test_regex():
    detector = PromptDetector()
    
    print("--- Testing Individual Patterns ---")
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
        ("Password:", PromptType.UNKNOWN), # detect() doesn't have a PWD type in PromptType enum yet, but we have a pattern
    ]
    
    all_passed = True
    for buffer, expected in test_cases:
        result = detector.detect(buffer)
        if result == expected:
            print(f"PASS: Buffer {repr(buffer)} -> {result}")
        else:
            print(f"FAIL: Buffer {repr(buffer)} -> Expected {expected}, got {result}")
            all_passed = False
            
    print("\n--- Testing Combined PRIV_OR_PWD Pattern ---")
    combined_cases = [
        ("Switch# ", True, False),     # Matches PRIV
        ("Password: ", False, True),   # Matches PWD
        ("\r\nSwitch#", True, False),
        ("Password:", False, True),
        ("any#junk\r\nPassword:", False, True),
    ]
    
    for buffer, is_priv, is_pwd in combined_cases:
        match = detector.PROMPT_PRIV_OR_PWD.search(buffer)
        if match:
            # group 1 is priv, group 2 is password
            got_priv = bool(detector.PROMPT_PRIV.search(buffer))
            got_pwd = bool(detector.PROMPT_PWD.search(buffer))
            
            if got_priv == is_priv and got_pwd == is_pwd:
                print(f"PASS: Buffer {repr(buffer)} -> PRIV={got_priv}, PWD={got_pwd}")
            else:
                print(f"FAIL: Buffer {repr(buffer)} -> Expected PRIV={is_priv}, PWD={is_pwd}. Got PRIV={got_priv}, PWD={got_pwd}")
                all_passed = False
        else:
            print(f"FAIL: Buffer {repr(buffer)} -> No match found!")
            all_passed = False

    if all_passed:
        print("\nAll tests PASSED!")
    else:
        print("\nSome tests FAILED!")

if __name__ == "__main__":
    test_regex()
