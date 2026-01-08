#!/usr/bin/env python3
"""
Database Migration: Rename 'schema' column to 'config_schema' in templates table.

This script migrates the SQLite database to use the new column name.
Run this on the Raspberry Pi before restarting the backend service.
"""

import sqlite3
import sys
import os
from pathlib import Path

# Database path - app.db is in the project root
DB_PATH = Path(__file__).parent.parent / "app.db"

def migrate():
    """Rename schema column to config_schema in templates table."""
    
    if not DB_PATH.exists():
        print(f"ERROR: Database not found at {DB_PATH}")
        print("Please run this script from the backend directory.")
        return 1
    
    print(f"Migrating database: {DB_PATH}")
    
    # Backup first
    backup_path = DB_PATH.with_suffix('.db.pre-migration')
    if not backup_path.exists():
        print(f"Creating backup at {backup_path}...")
        import shutil
        shutil.copy2(DB_PATH, backup_path)
        print("✓ Backup created")
    else:
        print(f"Backup already exists at {backup_path}")
    
    # Connect and migrate
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Check if column already renamed
        cursor.execute("PRAGMA table_info(templates)")
        columns = [row[1] for row in cursor.fetchall()]
        
        if 'config_schema' in columns:
            print("✓ Migration already applied - 'config_schema' column exists")
            return 0
        
        if 'schema' not in columns:
            print("ERROR: Expected 'schema' column not found in templates table")
            print(f"Available columns: {columns}")
            return 1
        
        print("Renaming 'schema' column to 'config_schema'...")
        
        # SQLite doesn't support direct column rename in older versions
        # We need to recreate the table
        
        # Create new table with correct schema
        cursor.execute("""
            CREATE TABLE templates_new (
                id INTEGER PRIMARY KEY,
                name VARCHAR UNIQUE NOT NULL,
                body TEXT NOT NULL,
                config_schema JSON NOT NULL,
                verification JSON,
                profile_id INTEGER,
                created_at DATETIME,
                FOREIGN KEY(profile_id) REFERENCES device_profiles(id)
            )
        """)
        
        # Copy data from old table to new table
        cursor.execute("""
            INSERT INTO templates_new (id, name, body, config_schema, verification, profile_id, created_at)
            SELECT id, name, body, schema, verification, profile_id, created_at
            FROM templates
        """)
        
        # Drop old table
        cursor.execute("DROP TABLE templates")
        
        # Rename new table to original name
        cursor.execute("ALTER TABLE templates_new RENAME TO templates")
        
        # Recreate index
        cursor.execute("CREATE UNIQUE INDEX ix_templates_name ON templates (name)")
        cursor.execute("CREATE INDEX ix_templates_id ON templates (id)")
        
        conn.commit()
        print("✓ Migration completed successfully")
        
        # Verify
        cursor.execute("PRAGMA table_info(templates)")
        new_columns = [row[1] for row in cursor.fetchall()]
        print(f"New schema: {new_columns}")
        
        # Count templates
        cursor.execute("SELECT COUNT(*) FROM templates")
        count = cursor.fetchone()[0]
        print(f"✓ {count} template(s) migrated")
        
        return 0
        
    except Exception as e:
        print(f"ERROR during migration: {e}")
        conn.rollback()
        print("\nRestoring from backup...")
        print(f"Run: cp {backup_path} {DB_PATH}")
        return 1
        
    finally:
        conn.close()

if __name__ == "__main__":
    sys.exit(migrate())
