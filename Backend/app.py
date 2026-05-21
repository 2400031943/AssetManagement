from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_jwt_extended import (
    JWTManager, create_access_token,
    jwt_required, get_jwt_identity
)
from config import Config
from models import db, User, Asset
from datetime import date
from sqlalchemy import text


# ---------------------------------------------------------------------------
# App factory
# ---------------------------------------------------------------------------

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    CORS(app)
    db.init_app(app)
    JWTManager(app)

    # -----------------------------------------------------------------------
    # Health check
    # -----------------------------------------------------------------------

    @app.route('/api/health', methods=['GET'])
    def health_check():
        return jsonify({"status": "healthy", "message": "Asset Management API is running"}), 200

    # -----------------------------------------------------------------------
    # AUTH endpoints
    # -----------------------------------------------------------------------

    @app.route('/api/auth/signup', methods=['POST'])
    def signup():
        """Create a new user account."""
        data = request.get_json()
        emp_code = data.get('emp_code', '').strip().upper()
        username = data.get('username', emp_code)
        password = data.get('password', '')
        role     = data.get('role', 'User')       # 'User' | 'Admin' | 'AreaAdmin'
        area     = data.get('area', None)         # required for AreaAdmin

        if not emp_code or not password:
            return jsonify({"error": "Employee Code and password are required"}), 400

        if User.query.filter_by(emp_code=emp_code).first():
            return jsonify({"error": "Employee Code already registered"}), 409

        user = User(username=username, emp_code=emp_code, role=role, area=area)
        user.set_password(password)
        db.session.add(user)
        db.session.commit()

        return jsonify({"message": "Account created successfully", "user": user.to_dict()}), 201

    @app.route('/api/auth/login', methods=['POST'])
    def login():
        """Authenticate a user via PIS Stored Procedure and return a JWT token."""
        data     = request.get_json()
        emp_code = data.get('emp_code', '').strip().upper()
        password = data.get('password', '')

        pis_verified = False

        # 1. Try to verify via PIS Stored Procedure
        try:
            # The procedure takes both username and password
            # EXEC SPES_SLOGINCHECK 'NR1234', 'secret'
            result = db.session.execute(
                text("EXEC SPES_SLOGINCHECK :u, :p"), 
                {"u": emp_code, "p": password}
            )
            row = result.fetchone()
            
            # If the procedure returns a row, we assume the user is valid in PIS
            if row:
                pis_verified = True
            else:
                return jsonify({"error": "User not found in PIS system"}), 401

        except Exception as e:
            # Fallback if the Stored Procedure fails or doesn't exist yet
            print(f"PIS Stored Procedure failed: {e}")
            
            # Fallback to local database password check
            user = User.query.filter_by(emp_code=emp_code).first()
            if not user or not user.check_password(password):
                return jsonify({"error": "Invalid credentials (local fallback failed)"}), 401
            pis_verified = True

        # 2. If verified (via PIS or fallback), ensure user exists locally
        if pis_verified:
            user = User.query.filter_by(emp_code=emp_code).first()
            if not user:
                # Auto-create the user locally so we can assign assets to them
                user = User(username=emp_code, emp_code=emp_code, role='User')
                db.session.add(user)
                db.session.commit()

            token = create_access_token(identity=str(user.id))
            return jsonify({
                "token": token,
                "user": user.to_dict()
            }), 200

    # -----------------------------------------------------------------------
    # USER endpoints  (Admin only)
    # -----------------------------------------------------------------------

    @app.route('/api/users', methods=['GET'])
    @jwt_required()
    def get_all_users():
        """Return all users. Admin only."""
        users = User.query.all()
        return jsonify([u.to_dict() for u in users]), 200

    @app.route('/api/users/area/<string:area>', methods=['GET'])
    @jwt_required()
    def get_users_by_area(area):
        """Return users whose area matches. AreaAdmin only."""
        users = User.query.filter_by(area=area).all()
        return jsonify([u.to_dict() for u in users]), 200

    @app.route('/api/users/<int:user_id>', methods=['GET'])
    @jwt_required()
    def get_user(user_id):
        user = User.query.get_or_404(user_id)
        return jsonify(user.to_dict()), 200

    # -----------------------------------------------------------------------
    # ASSET endpoints
    # -----------------------------------------------------------------------

    @app.route('/api/assets', methods=['GET'])
    @jwt_required()
    def get_assets():
        """
        Return assets based on query params:
          ?user_id=<id>   → assets assigned to that user
          ?area=<area>    → assets in that area
          (no params)     → all assets (admin)
        """
        user_id = request.args.get('user_id', type=int)
        area    = request.args.get('area')

        query = Asset.query
        if user_id:
            query = query.filter_by(assigned_to=user_id)
        if area:
            query = query.filter_by(area=area)

        assets = query.all()
        return jsonify([a.to_dict() for a in assets]), 200

    @app.route('/api/assets/mine', methods=['GET'])
    @jwt_required()
    def get_my_assets():
        """Return assets assigned to the currently logged-in user."""
        current_user_id = int(get_jwt_identity())
        assets = Asset.query.filter_by(assigned_to=current_user_id).all()
        return jsonify([a.to_dict() for a in assets]), 200

    @app.route('/api/assets', methods=['POST'])
    @jwt_required()
    def create_asset():
        """Create a new asset."""
        data = request.get_json()

        # Parse optional FMS expiry date
        fms_expiry = None
        if data.get('fmsExpiryDate'):
            try:
                fms_expiry = date.fromisoformat(data['fmsExpiryDate'])
            except ValueError:
                pass

        asset = Asset(
            name                 = data.get('name', ''),
            serial_number        = data.get('serialNumber', ''),
            category             = data.get('CATEGORY', ''),
            make                 = data.get('make', ''),
            model                = data.get('model', ''),
            configuration        = data.get('configuration', ''),
            network_domain       = data.get('networkDomain', ''),
            ip_address           = data.get('ipAddress', ''),
            monitor              = data.get('Monitor', ''),
            asset_custodian_ecno = data.get('AssetCustodianECNO', ''),
            user_division        = data.get('UserDivision', ''),
            group_name           = data.get('GROUP', ''),
            area                 = data.get('AREA', ''),
            location             = data.get('LOCATION', ''),
            acms_fms             = data.get('acmsFms', ''),
            fms_expiry_date      = fms_expiry,
            assigned_to          = data.get('assigned_to', None),
            status               = data.get('status', 'Available'),
        )

        db.session.add(asset)
        db.session.commit()
        return jsonify(asset.to_dict()), 201

    @app.route('/api/assets/<int:asset_id>', methods=['GET'])
    @jwt_required()
    def get_asset(asset_id):
        asset = Asset.query.get_or_404(asset_id)
        return jsonify(asset.to_dict()), 200

    @app.route('/api/assets/<int:asset_id>', methods=['PUT'])
    @jwt_required()
    def update_asset(asset_id):
        """Update an existing asset."""
        asset = Asset.query.get_or_404(asset_id)
        data  = request.get_json()

        for field, col in {
            'name':               'name',
            'serialNumber':       'serial_number',
            'CATEGORY':           'category',
            'make':               'make',
            'model':              'model',
            'configuration':      'configuration',
            'networkDomain':      'network_domain',
            'ipAddress':          'ip_address',
            'Monitor':            'monitor',
            'AssetCustodianECNO': 'asset_custodian_ecno',
            'UserDivision':       'user_division',
            'GROUP':              'group_name',
            'AREA':               'area',
            'LOCATION':           'location',
            'acmsFms':            'acms_fms',
            'assigned_to':        'assigned_to',
            'status':             'status',
        }.items():
            if field in data:
                setattr(asset, col, data[field])

        if 'fmsExpiryDate' in data and data['fmsExpiryDate']:
            try:
                asset.fms_expiry_date = date.fromisoformat(data['fmsExpiryDate'])
            except ValueError:
                pass

        db.session.commit()
        return jsonify(asset.to_dict()), 200

    @app.route('/api/assets/<int:asset_id>', methods=['DELETE'])
    @jwt_required()
    def delete_asset(asset_id):
        asset = Asset.query.get_or_404(asset_id)
        db.session.delete(asset)
        db.session.commit()
        return jsonify({"message": "Asset deleted"}), 200

    # -----------------------------------------------------------------------
    # DB init
    # -----------------------------------------------------------------------

    with app.app_context():
        try:
            db.create_all()
            print("Database connected and tables created (if they didn't exist).")
        except Exception as e:
            print(f"Error connecting to the database: {e}")

    return app


if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, port=5000)
