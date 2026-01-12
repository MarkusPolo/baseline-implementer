import sqlite3
import os

DB_PATH = "backend/app.db"
if not os.path.exists(DB_PATH):
    # Try absolute path or project root
    DB_PATH = "app.db"

def migrate():
    if not os.path.exists(DB_PATH):
        print(f"Database {DB_PATH} not found. Nothing to migrate.")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        # 1. Create macros table
        print("Creating macros table...")
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS macros (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR,
            description TEXT,
            steps JSON NOT NULL,
            config_schema JSON,
            created_at DATETIMEDEFAULT CURRENT_TIMESTAMP
        )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_macros_id ON macros (id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_macros_name ON macros (name)")

        # 2. Add macro_id to jobs table
        print("Checking for macro_id in jobs table...")
        cursor.execute("PRAGMA table_info(jobs)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if "macro_id" not in columns:
            print("Adding macro_id column to jobs table...")
            cursor.execute("ALTER TABLE jobs ADD COLUMN macro_id INTEGER REFERENCES macros(id)")
        else:
            print("macro_id column already exists in jobs table.")

        conn.commit()
        print("Migration completed successfully.")
    except Exception as e:
        print(f"Migration failed: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
