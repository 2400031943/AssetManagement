from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='User') # 'Admin' or 'User'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'role': self.role
        }

class Asset(db.Model):
    __tablename__ = 'assets'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    category = db.Column(db.String(50), nullable=False)
    status = db.Column(db.String(50), nullable=False, default='Available') # e.g., Available, Assigned, Maintenance
    assigned_to = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True) # User ID it's assigned to
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationship
    assignee = db.relationship('User', backref=db.backref('assets', lazy=True))

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'category': self.category,
            'status': self.status,
            'assigned_to': self.assigned_to,
            'assignee_name': self.assignee.username if self.assignee else None
        }
