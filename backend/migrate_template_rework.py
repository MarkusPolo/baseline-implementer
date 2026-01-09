#!/usr/bin/env python3
"""
Database Migration: Add 'steps' and 'is_baseline' to templates table.
"""

import sqlite3
import sys
import os
from pathlib import Path

# Database path - app.db is in the project root
DB_PATH = Path(__file__).parent.parent / "app.db"

def migrate():
    """Add steps and is_baseline columns to templates table."""
    
    if not DB_PATH.exists():
        print(f"ERROR: Database not found at {DB_PATH}")
        return 1
    
    print(f"Migrating database: {DB_PATH}")
    
    # Backup first
    backup_path = DB_PATH.with_suffix('.db.pre-template-rework')
    if not backup_path.exists():
        print(f"Creating backup at {backup_path}...")
        import shutil
        shutil.copy2(DB_PATH, backup_path)
        print("✓ Backup created")
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Check current columns
        cursor.execute("PRAGMA table_info(templates)")
        columns = [row[1] for row in cursor.fetchall()]
        
        # Add steps if missing
        if 'steps' not in columns:
            print("Adding 'steps' column...")
            cursor.execute("ALTER TABLE templates ADD COLUMN steps JSON")
        
        # Add is_baseline if missing
        if 'is_baseline' not in columns:
            print("Adding 'is_baseline' column...")
            cursor.execute("ALTER TABLE templates ADD COLUMN is_baseline INTEGER DEFAULT 0")
        
        conn.commit()
        print("✓ Migration completed successfully")
        return 0
        
    except Exception as e:
        print(f"ERROR during migration: {e}")
        conn.rollback()
        return 1
    finally:
        conn.close()

if __name__ == "__main__":
    sys.exit(migrate())
