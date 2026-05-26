import os
import urllib.parse
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Secret keys
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'you-will-never-guess'
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or 'jwt-secret-string'
    
    # Local MSSQL Database Connection (for App Data)
    DB_SERVER = os.environ.get('DB_SERVER', 'localhost')
    DB_NAME = os.environ.get('DB_NAME', 'Asset_Manager')
    DB_USER = os.environ.get('DB_USER', 'sa')
    DB_PASSWORD = os.environ.get('DB_PASSWORD', 'sa')
    
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'DATABASE_URL', 
        f"mssql+pytds://{DB_USER}:{urllib.parse.quote_plus(DB_PASSWORD)}@{DB_SERVER}/{DB_NAME}"
    )
    
    # Remote MSSQL Database Connection (for Authentication)
    REMOTE_DB_SERVER = os.environ.get('REMOTE_DB_SERVER', '192.168.237.235')
    REMOTE_DB_NAME = os.environ.get('REMOTE_DB_NAME', 'cowmis')
    REMOTE_DB_USER = os.environ.get('REMOTE_DB_USER', 'itiduser')
    REMOTE_DB_PASSWORD = os.environ.get('REMOTE_DB_PASSWORD', 'Itid@123')

    SQLALCHEMY_BINDS = {
        'remote_pis': f"mssql+pytds://{REMOTE_DB_USER}:{urllib.parse.quote_plus(REMOTE_DB_PASSWORD)}@{REMOTE_DB_SERVER}/{REMOTE_DB_NAME}"
    }

    SQLALCHEMY_TRACK_MODIFICATIONS = False

