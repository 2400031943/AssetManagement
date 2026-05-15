import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Secret keys
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'you-will-never-guess'
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or 'jwt-secret-string'
    
    # MSSQL Database Connection
    # Format for pytds: mssql+pytds://username:password@server/database
    DB_SERVER = os.environ.get('DB_SERVER', 'localhost')
    DB_NAME = os.environ.get('DB_NAME', 'AssetManagementDB')
    DB_USER = os.environ.get('DB_USER', 'sa')
    DB_PASSWORD = os.environ.get('DB_PASSWORD', 'YourStrong!Passw0rd')
    
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'DATABASE_URL', 
        f"mssql+pytds://{DB_USER}:{DB_PASSWORD}@{DB_SERVER}/{DB_NAME}"
    )
    
    SQLALCHEMY_TRACK_MODIFICATIONS = False
