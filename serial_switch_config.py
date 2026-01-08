#!/usr/bin/env python3
import os
import sys
import re
from serial_lib.serial_session import SerialSession
from serial_lib.command_runner import CommandRunner
from serial_lib.verifier import Verifier
from serial_lib.prompt_detector import PromptDetector

PORT = os.path.expanduser("~/port8")
BAUD = 9600
TIMEOUT_S = 0.2

TARGET_HOSTNAME = "sw-test-07"

def main():
    if not os.path.exists(PORT):
        print(f"ERROR: Port path does not exist: {PORT}", file=sys.stderr)
        return 1

    try:
        with SerialSession(PORT, baud=BAUD, timeout=TIMEOUT_S) as session:
            runner = CommandRunner(session)
            
            # Clear noise
            session.drain(0.4)

            # Ensure privileged execution
            runner.ensure_priv_exec()

            # Enter config mode
            runner.enter_config_mode()
            
            # Disable paging
            runner.disable_paging()

            # Set hostname
            session.send_line(f"hostname {TARGET_HOSTNAME}")
            
            # Wait for prompt change
            session.wait_for(re.compile(rf"\n.*{re.escape(TARGET_HOSTNAME)}.*#\s*$"), timeout=10.0)

            # Exit config mode
            runner.exit_config_mode()

            # Verify with show run
            show_out = runner.run_show("show run", timeout=25.0)
            if not Verifier.verify_hostname(show_out, TARGET_HOSTNAME):
                print("Verification FAILED: hostname not found in running-config.", file=sys.stderr)
                print("--- show run output (tail) ---", file=sys.stderr)
                print(show_out[-4000:], file=sys.stderr)
                return 2

            print(f"Verification OK: hostname {TARGET_HOSTNAME} present in running-config.")

            # Write memory
            # "wr" returns to priv prompt eventually
            runner.run_show("wr", timeout=40.0)
            print("Write command completed.")

            # Optional: re-verify after write
            show_out2 = runner.run_show("show run", timeout=25.0)
            if not Verifier.verify_hostname(show_out2, TARGET_HOSTNAME):
                print("Post-write verification FAILED: hostname not found.", file=sys.stderr)
                return 3

            print("Post-write verification OK.")

        return 0

    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        return 1

if __name__ == "__main__":
    sys.exit(main())
