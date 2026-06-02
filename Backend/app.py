from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_jwt_extended import (
    JWTManager, create_access_token,
    jwt_required, get_jwt_identity
)
from config import Config
from models import db, User, Asset
from datetime import date
from sqlalchemy import func, text
from auth import auth_bp


SYSTEM_CURRENT_USER_ECNO_COLUMN = 'System-Current-User ECNO_(Refer Employee Directory)'
IMPORTED_ASSET_TABLES = (
    {
        'source': 'ACMS',
        'table': 'ACMS$',
        'acms_code_expr': "NULLIF(LTRIM(RTRIM(CAST([ACMS Code] AS NVARCHAR(255)))), '')",
        'remarks_expr': "NULLIF(LTRIM(RTRIM(CAST([Remarks] AS NVARCHAR(255)))), '')",
    },
    {
        'source': 'FMS',
        'table': 'FMS$',
        'acms_code_expr': "CAST(NULL AS NVARCHAR(255))",
        'remarks_expr': "CAST(NULL AS NVARCHAR(255))",
    },
)


def _clean_value(value):
    if value is None:
        return None
    value = str(value).strip()
    return value or None


def _imported_asset_to_dict(row, source, index):
    sl_no = _clean_value(row.get('sl_no'))
    acms_code = _clean_value(row.get('acms_code'))
    asset_number = _clean_value(row.get('asset_number'))
    serial_number = _clean_value(row.get('serial_number'))
    current_user_ecno = _clean_value(row.get('current_user_ecno'))
    asset_custodian_ecno = _clean_value(row.get('asset_custodian_ecno'))
    category = _clean_value(row.get('category'))
    warranty_expiry_date = _clean_value(row.get('warranty_expiry_date'))

    return {
        'id': f"{source}-{index}",
        'sourceTable': source,
        'slNo': sl_no,
        'acmsCode': acms_code,
        'assetNumber': asset_number,
        'name': asset_number or serial_number or category or f"{source} Asset {index}",
        'serialNumber': serial_number,
        'CATEGORY': category,
        'make': _clean_value(row.get('make')),
        'model': _clean_value(row.get('model')),
        'configuration': _clean_value(row.get('configuration')),
        'networkDomain': _clean_value(row.get('network_domain')),
        'ipAddress': _clean_value(row.get('ip_address')),
        'Monitor': _clean_value(row.get('monitor')),
        'AssetCustodianECNO': asset_custodian_ecno,
        'SystemCurrentUserECNO': current_user_ecno,
        SYSTEM_CURRENT_USER_ECNO_COLUMN: current_user_ecno,
        'UserDivision': _clean_value(row.get('user_division')),
        'GROUP': _clean_value(row.get('group_name')),
        'AREA': _clean_value(row.get('area')),
        'LOCATION': _clean_value(row.get('location')),
        'acmsFms': _clean_value(row.get('acms_fms')) or source,
        'warrantyExpiryDate': warranty_expiry_date,
        'fmsExpiryDate': warranty_expiry_date,
        'remarks': _clean_value(row.get('remarks')),
        'assigned_to': None,
        'assignedUserName': current_user_ecno,
        'status': 'Assigned',
    }


def _fetch_imported_assets_for_employee(employee_code):
    """
    Query ACMS$ and FMS$ tables from the REMOTE cowmis database.
    Must use the remote_pis engine — NOT the local Asset_Manager session.
    """
    assets = []

    # Use the remote cowmis engine explicitly (same engine used in auth.py)
    remote_engine = db.engines.get('remote_pis')
    if not remote_engine:
        print("ERROR: remote_pis engine not configured — cannot fetch cowmis assets")
        return assets

    for imported_table in IMPORTED_ASSET_TABLES:
        query = text(f"""
            SELECT
                NULLIF(LTRIM(RTRIM(CAST([SL No] AS NVARCHAR(255)))), '') AS sl_no,
                {imported_table['acms_code_expr']} AS acms_code,
                NULLIF(LTRIM(RTRIM(CAST([Asset Number_(Refer PIS Database)] AS NVARCHAR(255)))), '') AS asset_number,
                NULLIF(LTRIM(RTRIM(CAST([System Serial Number] AS NVARCHAR(255)))), '') AS serial_number,
                NULLIF(LTRIM(RTRIM(CAST([Make] AS NVARCHAR(255)))), '') AS make,
                NULLIF(LTRIM(RTRIM(CAST([Model] AS NVARCHAR(255)))), '') AS model,
                NULLIF(LTRIM(RTRIM(CAST([Brief Configuration] AS NVARCHAR(MAX)))), '') AS configuration,
                NULLIF(LTRIM(RTRIM(CAST([Network Domain (Interent/Spacenet/NRSCVRF/DP etc)] AS NVARCHAR(255)))), '') AS network_domain,
                NULLIF(LTRIM(RTRIM(CAST([IP] AS NVARCHAR(255)))), '') AS ip_address,
                NULLIF(LTRIM(RTRIM(CAST([Monitor] AS NVARCHAR(255)))), '') AS monitor,
                NULLIF(LTRIM(RTRIM(CAST([Asset Custodian ECNO_(Refer PIS Database)] AS NVARCHAR(255)))), '') AS asset_custodian_ecno,
                NULLIF(LTRIM(RTRIM(CAST([{SYSTEM_CURRENT_USER_ECNO_COLUMN}] AS NVARCHAR(255)))), '') AS current_user_ecno,
                NULLIF(LTRIM(RTRIM(CAST([User-Division _(Refer Employee Directory)] AS NVARCHAR(255)))), '') AS user_division,
                NULLIF(LTRIM(RTRIM(CAST([Group] AS NVARCHAR(255)))), '') AS group_name,
                NULLIF(LTRIM(RTRIM(CAST([Area] AS NVARCHAR(255)))), '') AS area,
                NULLIF(LTRIM(RTRIM(CAST([Category] AS NVARCHAR(255)))), '') AS category,
                NULLIF(LTRIM(RTRIM(CAST([Location] AS NVARCHAR(255)))), '') AS location,
                NULLIF(LTRIM(RTRIM(CAST([ACMS, FMS, FMS + ACMS] AS NVARCHAR(255)))), '') AS acms_fms,
                NULLIF(LTRIM(RTRIM(CAST([Warranty  _Expiry Date] AS NVARCHAR(255)))), '') AS warranty_expiry_date,
                {imported_table['remarks_expr']} AS remarks
            FROM [dbo].[{imported_table['table']}]
            WHERE UPPER(LTRIM(RTRIM(CAST([{SYSTEM_CURRENT_USER_ECNO_COLUMN}] AS NVARCHAR(50))))) = :employee_code
            ORDER BY [SL No]
        """)
        try:
            with remote_engine.connect() as conn:
                rows = conn.execute(query, {'employee_code': employee_code}).mappings().all()
            start_index = len(assets)
            assets.extend([
                _imported_asset_to_dict(row, imported_table['source'], start_index + index + 1)
                for index, row in enumerate(rows)
            ])
        except Exception as e:
            print(f"Failed to query {imported_table['table']} from cowmis: {e}")
            continue

    return assets


# ---------------------------------------------------------------------------
# App factory
# ---------------------------------------------------------------------------

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    CORS(app)
    db.init_app(app)
    JWTManager(app)

    app.register_blueprint(auth_bp)

    # -----------------------------------------------------------------------
    # Health check
    # -----------------------------------------------------------------------

    @app.route('/api/health', methods=['GET'])
    def health_check():
        return jsonify({"status": "healthy", "message": "Asset Management API is running"}), 200

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
        """Return assets from the LOCAL Asset_Manager DB assigned to the logged-in user."""
        current_user_id = int(get_jwt_identity())
        current_user = User.query.get_or_404(current_user_id)
        employee_code = (current_user.emp_code or '').strip().upper()

        # Match by ECNO (populated from form field) OR by assigned_to user id
        # Using OR so assets saved either way are always visible to the user
        from sqlalchemy import or_
        app_assets = Asset.query.filter(
            or_(
                func.upper(func.ltrim(func.rtrim(Asset.asset_custodian_ecno))) == employee_code,
                Asset.assigned_to == current_user_id,
            )
        ).all()

        # De-duplicate in case both conditions match the same asset
        seen = set()
        unique_assets = []
        for a in app_assets:
            if a.id not in seen:
                seen.add(a.id)
                unique_assets.append(a)

        return jsonify([a.to_dict() for a in unique_assets]), 200

    @app.route('/api/assets/recommendations', methods=['GET'])
    @jwt_required()
    def get_asset_recommendations():
        """
        Return asset recommendations from the REMOTE cowmis database (ACMS$ / FMS$ tables)
        for the logged-in employee. These are used to pre-fill the Add Asset form so the
        user can register remote assets into the local Asset_Manager DB.
        """
        current_user_id = int(get_jwt_identity())
        current_user = User.query.get_or_404(current_user_id)
        employee_code = (current_user.emp_code or '').strip().upper()
        if not employee_code:
            return jsonify([]), 200

        try:
            remote_assets = _fetch_imported_assets_for_employee(employee_code)
        except Exception as e:
            print(f"Failed to fetch recommendations from remote cowmis DB: {e}")
            return jsonify([]), 200  # Graceful degradation — do not break the UI

        return jsonify(remote_assets), 200

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
