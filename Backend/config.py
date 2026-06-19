import os
import urllib.parse
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Secret keys
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'you-will-never-guess'
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or 'jwt-secret-string'

    # JWT token lifetime — default flask-jwt-extended is only 15 minutes which
    # causes users to be logged out mid-session. Set to 8 hours (full working day).
    from datetime import timedelta
    JWT_ACCESS_TOKEN_EXPIRES  = timedelta(hours=8)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)

    # Local MSSQL Database Connection (for App Data)
    DB_SERVER   = os.environ.get('DB_SERVER',   'localhost')
    DB_NAME     = os.environ.get('DB_NAME',     'Asset_Manager')
    DB_USER     = os.environ.get('DB_USER',     'sa')
    DB_PASSWORD = os.environ.get('DB_PASSWORD', 'sa')

    # Build pyodbc connection string — tries ODBC Driver 17, falls back to 18
    _local_params = urllib.parse.quote_plus(
        f"DRIVER={{ODBC Driver 17 for SQL Server}};"
        f"SERVER={DB_SERVER};"
        f"DATABASE={DB_NAME};"
        f"UID={DB_USER};"
        f"PWD={DB_PASSWORD};"
        f"TrustServerCertificate=yes;"
    )
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'DATABASE_URL',
        f"mssql+pyodbc:///?odbc_connect={_local_params}"
    )

    # Remote MSSQL Database Connection (for Authentication)
    REMOTE_DB_SERVER   = os.environ.get('REMOTE_DB_SERVER',   '192.168.237.235')
    REMOTE_DB_NAME     = os.environ.get('REMOTE_DB_NAME',     'cowmis')
    REMOTE_DB_USER     = os.environ.get('REMOTE_DB_USER',     'itiduser')
    REMOTE_DB_PASSWORD = os.environ.get('REMOTE_DB_PASSWORD', 'Itid@123')

    _remote_params = urllib.parse.quote_plus(
        f"DRIVER={{ODBC Driver 17 for SQL Server}};"
        f"SERVER={REMOTE_DB_SERVER};"
        f"DATABASE={REMOTE_DB_NAME};"
        f"UID={REMOTE_DB_USER};"
        f"PWD={REMOTE_DB_PASSWORD};"
        f"TrustServerCertificate=yes;"
    )
    SQLALCHEMY_BINDS = {
        'remote_pis': f"mssql+pyodbc:///?odbc_connect={_remote_params}"
    }

    SQLALCHEMY_TRACK_MODIFICATIONS = False
