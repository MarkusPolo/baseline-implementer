"""
Seed default device profiles into the database.
Run this script after starting the backend to populate default profiles.
"""
import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.database import SessionLocal
from backend.models import DeviceProfile

def seed_profiles():
    db = SessionLocal()
    
    # Check if profiles already exist
    existing = db.query(DeviceProfile).count()
    if existing > 0:
        print(f"Profiles already exist ({existing} found). Skipping seed.")
        db.close()
        return
    
    profiles = [
        DeviceProfile(
            name="Cisco IOS",
            vendor="Cisco",
            description="Classic Cisco IOS (switches and routers)",
            prompt_patterns={
                "user": r"\n.*?>\s*$",
                "priv": r"\n.*?#\s*$",
                "config": r"\n.*?\(config[^\)]*\)#\s*$",
                "any": r"\n.*?[>#]\s*$"
            },
            commands={
                "show_version": "show version",
                "show_run": "show run",
                "save_config": "write memory",
                "enter_config": "configure terminal",
                "exit_config": "end",
                "enable": "enable"
            },
            error_markers=[
                "% Invalid",
                "% Ambiguous",
                "% Incomplete",
                "Error:"
            ],
            detection_command="show version"
        ),
        DeviceProfile(
            name="Cisco IOS-XE",
            vendor="Cisco",
            description="Modern Cisco IOS-XE (Catalyst 9K, etc.)",
            prompt_patterns={
                "user": r"\n.*?>\s*$",
                "priv": r"\n.*?#\s*$",
                "config": r"\n.*?\(config[^\)]*\)#\s*$",
                "any": r"\n.*?[>#]\s*$"
            },
            commands={
                "show_version": "show version",
                "show_run": "show running-config",
                "save_config": "write memory",
                "enter_config": "configure terminal",
                "exit_config": "end",
                "enable": "enable"
            },
            error_markers=[
                "% Invalid",
                "% Ambiguous",
                "% Incomplete"
            ],
            detection_command="show version"
        ),
        DeviceProfile(
            name="Generic",
            vendor="Generic",
            description="Fallback profile for unknown devices",
            prompt_patterns={
                "user": r"\n.*?>\s*$",
                "priv": r"\n.*?#\s*$",
                "config": r"\n.*?\(config[^\)]*\)#\s*$",
                "any": r"\n.*?[>#]\s*$"
            },
            commands={
                "show_version": "show version",
                "show_run": "show run",
                "save_config": "write",
                "enter_config": "conf t",
                "exit_config": "end",
                "enable": "en"
            },
            error_markers=[
                "% Invalid",
                "Error",
                "Fail"
            ],
            detection_command=None
        )
    ]
    
    for profile in profiles:
        db.add(profile)
    
    db.commit()
    print(f"Seeded {len(profiles)} device profiles:")
    for p in profiles:
        print(f"  - {p.name} ({p.vendor})")
    
    db.close()

if __name__ == "__main__":
    seed_profiles()
