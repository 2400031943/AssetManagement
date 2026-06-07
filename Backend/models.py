from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()


class User(db.Model):
    __tablename__ = 'users'

    id            = db.Column(db.Integer, primary_key=True)
    username      = db.Column(db.String(80),  unique=True, nullable=False)
    emp_code      = db.Column(db.String(20),  unique=True, nullable=False)  # e.g. NR1234
    password_hash = db.Column(db.String(256), nullable=True)
    role          = db.Column(db.String(20),  nullable=False, default='User')  # 'Admin' | 'User' | 'AreaAdmin'
    area          = db.Column(db.String(100), nullable=True)   # only for AreaAdmin
    division      = db.Column(db.String(100), nullable=True)
    created_at    = db.Column(db.DateTime, default=datetime.utcnow)

    assets = db.relationship('Asset', backref='assignee', lazy=True,
                             foreign_keys='Asset.assigned_to')

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id':         self.id,
            'username':   self.username,
            'emp_code':   self.emp_code,
            'role':       self.role,
            'area':       self.area,
            'division':   self.division,
            'assetCount': len(self.assets),
        }


class Asset(db.Model):
    __tablename__ = 'assets'

    id                   = db.Column(db.Integer, primary_key=True)

    # Core identification
    asset_number         = db.Column(db.String(100), nullable=True)   # NULL allowed for legacy rows
    serial_number        = db.Column(db.String(100), nullable=True)

    # Classification
    category             = db.Column(db.String(100), nullable=True)   # CATEGORY (SERVER TYPE 1, PC TYPE 1 …)
    make                 = db.Column(db.String(100), nullable=True)
    model                = db.Column(db.String(100), nullable=True)

    # Network
    configuration        = db.Column(db.Text,        nullable=True)
    network_domain       = db.Column(db.String(100), nullable=True)
    ip_address           = db.Column(db.String(50),  nullable=True)

    # Monitor
    monitor              = db.Column(db.String(100), nullable=True)

    # Organisational
    asset_custodian_ecno = db.Column(db.String(50),  nullable=True)
    user_division        = db.Column(db.String(100), nullable=True)
    group_name           = db.Column(db.String(100), nullable=True)
    area                 = db.Column(db.String(100), nullable=True)
    location             = db.Column(db.String(100), nullable=True)

    # Compliance
    acms_fms             = db.Column(db.String(10),  nullable=True)   # 'ACMS' | 'FMS'
    fms_expiry_date      = db.Column(db.Date,        nullable=True)   # only when acms_fms == 'FMS'

    # Assignment
    assigned_to          = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    status               = db.Column(db.String(50), nullable=True,  default='Available')

    created_at           = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id':                 self.id,
            'assetNumber':        self.asset_number,
            'serialNumber':       self.serial_number,
            'CATEGORY':           self.category,
            'make':               self.make,
            'model':              self.model,
            'configuration':      self.configuration,
            'networkDomain':      self.network_domain,
            'ipAddress':          self.ip_address,
            'Monitor':            self.monitor,
            'AssetCustodianECNO': self.asset_custodian_ecno,
            'UserDivision':       self.user_division,
            'GROUP':              self.group_name,
            'AREA':               self.area,
            'LOCATION':           self.location,
            'acmsFms':            self.acms_fms,
            'fmsExpiryDate':      self.fms_expiry_date.isoformat() if self.fms_expiry_date else None,
            'assigned_to':        self.assigned_to,
            'assignedUserName':   self.assignee.username if self.assignee else None,
            'status':             self.status,
        }
