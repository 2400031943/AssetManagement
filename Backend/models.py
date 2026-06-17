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
    acms_fms             = db.Column(db.String(100), nullable=True)   # 'ACMS' | 'FMS Alone' | 'System proposed for ACMS'
    warranty             = db.Column(db.String(3),   nullable=False, default='No')  # 'Yes' | 'No'
    fms_expiry_date      = db.Column(db.Date,        nullable=True)   # warranty expiry date when warranty='Yes'

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
            'warranty':           self.warranty or 'No',
            'fmsExpiryDate':      self.fms_expiry_date.isoformat() if self.fms_expiry_date else None,
            'assigned_to':        self.assigned_to,
            'assignedUserName':   self.assignee.username if self.assignee else None,
            'status':             self.status,
        }


class AcmsList2027(db.Model):
    """Mirror of Asset — written to dbo.ACMS_list_2027 table on every save/update."""
    __tablename__ = 'ACMS_list_2027'
    __table_args__ = {'schema': 'dbo'}

    id                   = db.Column(db.Integer, primary_key=True)

    asset_number         = db.Column(db.String(100), nullable=True)
    serial_number        = db.Column(db.String(100), nullable=True)

    category             = db.Column(db.String(100), nullable=True)
    make                 = db.Column(db.String(100), nullable=True)
    model                = db.Column(db.String(100), nullable=True)

    configuration        = db.Column(db.Text,        nullable=True)
    network_domain       = db.Column(db.String(100), nullable=True)
    ip_address           = db.Column(db.String(50),  nullable=True)

    monitor              = db.Column(db.String(100), nullable=True)

    asset_custodian_ecno = db.Column(db.String(50),  nullable=True)
    user_division        = db.Column(db.String(100), nullable=True)
    group_name           = db.Column(db.String(100), nullable=True)
    area                 = db.Column(db.String(100), nullable=True)
    location             = db.Column(db.String(100), nullable=True)

    acms_fms             = db.Column(db.String(100), nullable=True)
    warranty             = db.Column(db.String(3),   nullable=True, default='No')
    fms_expiry_date      = db.Column(db.Date,        nullable=True)

    assigned_to          = db.Column(db.Integer,     nullable=True)
    status               = db.Column(db.String(50),  nullable=True, default='Available')

    created_at           = db.Column(db.DateTime, default=datetime.utcnow)


class PendingRequest(db.Model):
    """
    Approval workflow for adding / deleting a system from the ACMS list.

    request_type = 'add'    → add flow:    Submitted → Approver → AFP → DD → Admin → Approved
    request_type = 'delete' → delete flow: Submitted → Approver → AFP → DD → Approved
                                           (on DD approval the AcmsList2027 row is deleted)

    Can be Withdrawn by the requester or Rejected at any level.
    """
    __tablename__ = 'pending_requests'

    id = db.Column(db.Integer, primary_key=True)

    # ── Request type ─────────────────────────────────────────────────────────
    # 'add' (default) | 'delete'
    request_type         = db.Column(db.String(10),  nullable=False, default='add')
    # FK to dbo.ACMS_list_2027.id — only populated for request_type='delete'
    acms_list_2027_id    = db.Column(db.Integer,     nullable=True)

    # ── Requester info ──────────────────────────────────────────────────────
    requester_ecno       = db.Column(db.String(50),  nullable=False)
    requester_name       = db.Column(db.String(100), nullable=True)
    # Requester's reason/remarks — required for delete requests, optional for add
    requester_remarks    = db.Column(db.Text,        nullable=True)

    # ── Asset identification ─────────────────────────────────────────────────
    asset_number         = db.Column(db.String(100), nullable=True)
    serial_number        = db.Column(db.String(100), nullable=True)

    # ── Asset classification ─────────────────────────────────────────────────
    category             = db.Column(db.String(100), nullable=True)
    make                 = db.Column(db.String(100), nullable=True)
    model                = db.Column(db.String(100), nullable=True)

    # ── Network ──────────────────────────────────────────────────────────────
    configuration        = db.Column(db.Text,        nullable=True)
    network_domain       = db.Column(db.String(100), nullable=True)
    ip_address           = db.Column(db.String(50),  nullable=True)

    # ── Monitor ──────────────────────────────────────────────────────────────
    monitor              = db.Column(db.String(100), nullable=True)

    # ── Organisational ───────────────────────────────────────────────────────
    asset_custodian_ecno = db.Column(db.String(50),  nullable=True)
    user_division        = db.Column(db.String(100), nullable=True)
    group_name           = db.Column(db.String(100), nullable=True)
    area                 = db.Column(db.String(100), nullable=True)
    location             = db.Column(db.String(100), nullable=True)

    # ── Compliance ───────────────────────────────────────────────────────────
    acms_fms             = db.Column(db.String(100), nullable=True)
    warranty             = db.Column(db.String(3),   nullable=True, default='No')
    fms_expiry_date      = db.Column(db.Date,        nullable=True)

    # ── Approval workflow ────────────────────────────────────────────────────
    # status: Submitted | Approver Approved | Registrar Approved | DD Approved | Approved | Rejected | Withdrawn
    status               = db.Column(db.String(30),  nullable=False, default='Submitted')
    current_level        = db.Column(db.Integer,     nullable=False, default=1)
    # Level 1 — Approver (selected by requester)
    approver_ecno        = db.Column(db.String(50),  nullable=True)
    approver_name        = db.Column(db.String(100), nullable=True)
    approver_remarks     = db.Column(db.Text,        nullable=True)
    approver_action_at   = db.Column(db.DateTime,    nullable=True)
    # Level 2 — Area Focal Point (auto-assigned by division/area)
    registrar_ecno       = db.Column(db.String(50),  nullable=True)
    registrar_name       = db.Column(db.String(100), nullable=True)
    registrar_remarks    = db.Column(db.Text,        nullable=True)
    registrar_action_at  = db.Column(db.DateTime,    nullable=True)
    # Level 3 — DD (selected by requester)
    dd_ecno              = db.Column(db.String(50),  nullable=True)
    dd_name              = db.Column(db.String(100), nullable=True)
    dd_remarks           = db.Column(db.Text,        nullable=True)
    dd_action_at         = db.Column(db.DateTime,    nullable=True)
    # Level 4 — Admin (system admin, final approval)
    admin_remarks        = db.Column(db.Text,        nullable=True)
    admin_action_at      = db.Column(db.DateTime,    nullable=True)

    # ── Timestamps ───────────────────────────────────────────────────────────
    created_at           = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at           = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id':                self.id,
            'requestType':       self.request_type or 'add',
            'acmsListId':        self.acms_list_2027_id,
            'requesterEcno':     self.requester_ecno,
            'requesterName':     self.requester_name,
            'requesterRemarks':  self.requester_remarks,
            'assetNumber':       self.asset_number,
            'serialNumber':      self.serial_number,
            'category':          self.category,
            'make':              self.make,
            'model':             self.model,
            'configuration':     self.configuration,
            'networkDomain':     self.network_domain,
            'ipAddress':         self.ip_address,
            'monitor':           self.monitor,
            'assetCustodianEcno':self.asset_custodian_ecno,
            'userDivision':      self.user_division,
            'group':             self.group_name,
            'area':              self.area,
            'location':          self.location,
            'acmsFms':           self.acms_fms,
            'warranty':          self.warranty,
            'fmsExpiryDate':     self.fms_expiry_date.isoformat() if self.fms_expiry_date else None,
            'status':            self.status,
            'currentLevel':      self.current_level,
            'approverEcno':      self.approver_ecno,
            'approverName':      self.approver_name,
            'approverRemarks':   self.approver_remarks,
            'approverActionAt':  self.approver_action_at.isoformat() if self.approver_action_at else None,
            'registrarEcno':     self.registrar_ecno,
            'registrarName':     self.registrar_name,
            'registrarRemarks':  self.registrar_remarks,
            'registrarActionAt': self.registrar_action_at.isoformat() if self.registrar_action_at else None,
            'ddEcno':            self.dd_ecno,
            'ddName':            self.dd_name,
            'ddRemarks':         self.dd_remarks,
            'ddActionAt':        self.dd_action_at.isoformat() if self.dd_action_at else None,
            'adminRemarks':      self.admin_remarks,
            'adminActionAt':     self.admin_action_at.isoformat() if self.admin_action_at else None,
            'createdAt':         self.created_at.isoformat() if self.created_at else None,
            'updatedAt':         self.updated_at.isoformat() if self.updated_at else None,
        }
