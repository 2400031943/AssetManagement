"""
Migration: Add 'warranty' column to dbo.assets.
Run: .\\venv\\Scripts\\python.exe migrate_add_warranty.py
"""
import os
from dotenv import load_dotenv
import pytds

load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env'))

server   = os.environ.get('DB_SERVER',   'localhost')
database = os.environ.get('DB_NAME',     'Asset_Manager')
user     = os.environ.get('DB_USER',     'sa')
password = os.environ.get('DB_PASSWORD', 'sa')

print(f"Connecting to {server}/{database} as {user}...")
conn = pytds.connect(server, database, user, password)
cursor = conn.cursor()

# Check if warranty column already exists
cursor.execute(
    "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS "
    "WHERE TABLE_NAME='assets' AND COLUMN_NAME='warranty'"
)
exists = cursor.fetchone()[0]

if not exists:
    cursor.execute(
        "ALTER TABLE dbo.assets ADD warranty NVARCHAR(3) NOT NULL DEFAULT 'No'"
    )
    conn.commit()
    print("SUCCESS: 'warranty' column added to dbo.assets  (NVARCHAR(3), default='No')")
else:
    print("INFO: 'warranty' column already exists — no action needed.")

# Also widen acms_fms column to fit longer values like 'System proposed for ACMS'
cursor.execute(
    "SELECT CHARACTER_MAXIMUM_LENGTH FROM INFORMATION_SCHEMA.COLUMNS "
    "WHERE TABLE_NAME='assets' AND COLUMN_NAME='acms_fms'"
)
row = cursor.fetchone()
if row and row[0] and row[0] < 50:
    cursor.execute("ALTER TABLE dbo.assets ALTER COLUMN acms_fms NVARCHAR(100)")
    conn.commit()
    print("SUCCESS: 'acms_fms' column widened to NVARCHAR(100)")
else:
    print("INFO: 'acms_fms' column already wide enough — no action needed.")

cursor.close()
conn.close()
print("Done.")
