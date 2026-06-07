"""
One-time migration: rename 'name' -> 'asset_number' in dbo.assets.
Run: .\venv\Scripts\python.exe migrate_rename_name.py
"""
import os
from dotenv import load_dotenv
import pytds
import urllib.parse

load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

server   = os.environ.get('DB_SERVER',   'localhost')
database = os.environ.get('DB_NAME',     'Asset_Manager')
user     = os.environ.get('DB_USER',     'sa')
password = os.environ.get('DB_PASSWORD', 'sa')

print(f"Connecting to {server}/{database} as {user}...")

conn = pytds.connect(server, database, user, password)
cursor = conn.cursor()

# Check current state
cursor.execute(
    "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS "
    "WHERE TABLE_NAME='assets' AND COLUMN_NAME='name'"
)
has_name = cursor.fetchone()[0]

if has_name:
    cursor.execute("EXEC sp_rename 'dbo.assets.name', 'asset_number', 'COLUMN'")
    conn.commit()
    print("SUCCESS: Column renamed  name -> asset_number  in dbo.assets")
else:
    cursor.execute(
        "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS "
        "WHERE TABLE_NAME='assets' AND COLUMN_NAME='asset_number'"
    )
    already = cursor.fetchone()[0]
    if already:
        print("INFO: Column is already named 'asset_number'. No action needed.")
    else:
        print("WARNING: Neither 'name' nor 'asset_number' found in dbo.assets!")

cursor.close()
conn.close()
