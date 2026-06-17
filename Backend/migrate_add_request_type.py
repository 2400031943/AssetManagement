"""
migrate_add_request_type.py
----------------------------
Adds new columns to dbo.pending_requests (safe to run multiple times):
  - request_type       VARCHAR(10) NOT NULL DEFAULT 'add'
  - acms_list_2027_id  INT NULL
  - requester_remarks  NVARCHAR(MAX) NULL

Run once from Backend directory with venv active:
    python migrate_add_request_type.py
"""

import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from app import create_app
from models import db
from sqlalchemy import text

app = create_app()

MIGRATIONS = [
    ("request_type",      "ALTER TABLE dbo.pending_requests ADD request_type VARCHAR(10) NOT NULL DEFAULT 'add'"),
    ("acms_list_2027_id", "ALTER TABLE dbo.pending_requests ADD acms_list_2027_id INT NULL"),
    ("requester_remarks", "ALTER TABLE dbo.pending_requests ADD requester_remarks NVARCHAR(MAX) NULL"),
]

with app.app_context():
    with db.engine.connect() as conn:
        for col_name, alter_sql in MIGRATIONS:
            result = conn.execute(text(f"""
                SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_NAME = 'pending_requests' AND COLUMN_NAME = '{col_name}'
            """))
            if result.scalar() == 0:
                conn.execute(text(alter_sql))
                conn.commit()
                print(f"[OK]   Column '{col_name}' added.")
            else:
                print(f"[SKIP] Column '{col_name}' already exists.")

    print("[DONE] Migration complete.")
