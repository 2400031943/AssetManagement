"""
Migration: Add approver2 columns to pending_requests table
Run once on the server:  python migrate_add_approver2.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app import create_app
from models import db

app = create_app()

with app.app_context():
    try:
        with db.engine.connect() as conn:
            conn.execute(db.text("ALTER TABLE pending_requests ADD approver2_ecno NVARCHAR(50) NULL"))
            conn.execute(db.text("ALTER TABLE pending_requests ADD approver2_name NVARCHAR(100) NULL"))
            conn.execute(db.text("ALTER TABLE pending_requests ADD approver2_remarks NTEXT NULL"))
            conn.execute(db.text("ALTER TABLE pending_requests ADD approver2_action_at DATETIME NULL"))
            conn.commit()
        print("Migration complete: approver2 columns added to pending_requests.")
    except Exception as e:
        if "already exists" in str(e).lower() or "duplicate column" in str(e).lower():
            print("Columns already exist — migration already applied.")
        else:
            print(f"Migration error: {e}")
