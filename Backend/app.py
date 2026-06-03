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


# ===========================================================================
# COWMIS REMOTE DB — ADD ASSET RECOMMENDATIONS CONFIGURATION
# ===========================================================================
# TODO: Replace ALL placeholder values below with the actual table/column
#       names from the remote cowmis database once you have access to it.
#
# HOW TO EDIT:
#   1. Open SQL Server Management Studio → connect to 192.168.237.235 (cowmis)
#   2. Find the table(s) that contain asset records
#   3. Replace each  <<<PLACEHOLDER>>>  value with the real name
#   4. Save this file and restart the Flask server — no other changes needed
# ===========================================================================

# ── EMPLOYEE CODE FILTER COLUMN ─────────────────────────────────────────────
# The column in the remote table whose value is matched against the
# logged-in employee's ECNO to fetch THEIR assets as recommendations.
# TODO: Replace with the actual column name that stores the employee/user ECNO
COWMIS_EMPLOYEE_CODE_COLUMN = '<<<REPLACE: column name that holds employee ECNO>>>'
# Example: COWMIS_EMPLOYEE_CODE_COLUMN = 'EMP_CODE'
# Example: COWMIS_EMPLOYEE_CODE_COLUMN = 'ECNO'

# ── RECOMMENDATION TABLE(S) ──────────────────────────────────────────────────
# Each entry below defines one table to query for recommendations.
# You can have one table or multiple — add/remove entries as needed.
# Fields in each entry:
#   source  → Label shown on the recommendation card (e.g. 'ACMS', 'FMS', 'IT Assets')
#   table   → Exact table name in cowmis (e.g. 'dbo.MyTable' or just 'MyTable')
#   columns → dict mapping internal field name → actual column name in that table
#             Leave a column as None if it does not exist in that table
COWMIS_RECOMMENDATION_TABLES = [
    {
        # TODO: Replace 'source' with a short label for this table (shown on UI card)
        'source': 'COWMIS',

        # TODO: Replace with the actual table name in the cowmis DB
        'table': '<<<REPLACE: table name in cowmis>>>',
        # Example: 'table': 'dbo.IT_ASSETS'
        # Example: 'table': 'ASSET_REGISTER'

        # TODO: Replace each column value with the real column name from that table.
        # Set to None if that column does not exist in this table.
        'columns': {
            'asset_number':       '<<<REPLACE: asset/inventory number column>>>',
            'serial_number':      '<<<REPLACE: serial number column>>>',
            'category':           '<<<REPLACE: asset category column>>>',
            'make':               '<<<REPLACE: manufacturer/make column>>>',
            'model':              '<<<REPLACE: model column>>>',
            'configuration':      '<<<REPLACE: configuration/specs column>>>',  # or None
            'network_domain':     '<<<REPLACE: network domain column>>>',        # or None
            'ip_address':         '<<<REPLACE: IP address column>>>',            # or None
            'monitor':            '<<<REPLACE: monitor column>>>',               # or None
            'asset_custodian':    '<<<REPLACE: asset custodian ECNO column>>>',  # or None
            'user_division':      '<<<REPLACE: division column>>>',              # or None
            'group_name':         '<<<REPLACE: group column>>>',                 # or None
            'area':               '<<<REPLACE: area column>>>',                  # or None
            'location':           '<<<REPLACE: location column>>>',              # or None
            'acms_fms':           '<<<REPLACE: ACMS/FMS type column>>>',         # or None
            'warranty_expiry':    '<<<REPLACE: warranty/expiry date column>>>',  # or None
            'remarks':            '<<<REPLACE: remarks column>>>',               # or None
        }
    },

    # ── Add more tables here if needed ──────────────────────────────────────
    # {
    #     'source': 'FMS',
    #     'table': '<<<REPLACE: second table name>>>',
    #     'columns': { ... same structure as above ... }
    # },
]
# ===========================================================================
# END OF COWMIS CONFIGURATION
# ===========================================================================


def _clean_value(value):
    if value is None:
        return None
    value = str(value).strip()
    return value or None


def _imported_asset_to_dict(row, source, index):
    sl_no                = _clean_value(row.get('sl_no'))
    acms_code            = _clean_value(row.get('acms_code'))
    asset_number         = _clean_value(row.get('asset_number'))
    serial_number        = _clean_value(row.get('serial_number'))
    current_user_ecno    = _clean_value(row.get('current_user_ecno'))
    asset_custodian_ecno = _clean_value(row.get('asset_custodian_ecno'))
    category             = _clean_value(row.get('category'))
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


def _is_placeholder(value):
    """Return True if a config value hasn't been filled in yet."""
    return value is None or '<<<' in str(value)


def _fetch_imported_assets_for_employee(employee_code):
    """
    Query the configured remote cowmis table(s) for assets belonging to
    the given employee. Uses COWMIS_RECOMMENDATION_TABLES config above.
    Returns [] if cowmis is unreachable or config is not yet filled in.
    """
    assets = []

    remote_engine = db.engines.get('remote_pis')
    if not remote_engine:
        print("ERROR: remote_pis engine not configured — cannot fetch cowmis assets")
        return assets

    # Abort early if the employee code filter column is still a placeholder
    if _is_placeholder(COWMIS_EMPLOYEE_CODE_COLUMN):
        print("INFO: COWMIS_EMPLOYEE_CODE_COLUMN not configured yet — skipping recommendations")
        return assets

    ecno_col = COWMIS_EMPLOYEE_CODE_COLUMN

    for table_cfg in COWMIS_RECOMMENDATION_TABLES:
        table_name = table_cfg.get('table', '')
        source     = table_cfg.get('source', 'COWMIS')
        cols       = table_cfg.get('columns', {})

        # Skip this table if the table name placeholder hasn't been replaced
        if _is_placeholder(table_name):
            print(f"INFO: Table name for source '{source}' not configured yet — skipping")
            continue

        # Build SELECT column list — only include columns that are configured
        def col_expr(col_val, alias):
            if _is_placeholder(col_val) or col_val is None:
                return f"CAST(NULL AS NVARCHAR(255)) AS {alias}"
            return f"NULLIF(LTRIM(RTRIM(CAST([{col_val}] AS NVARCHAR(255)))), '') AS {alias}"

        select_clause = f"""
            {col_expr(cols.get('asset_number'),    'asset_number')},
            {col_expr(cols.get('serial_number'),   'serial_number')},
            {col_expr(cols.get('category'),        'category')},
            {col_expr(cols.get('make'),            'make')},
            {col_expr(cols.get('model'),           'model')},
            NULLIF(LTRIM(RTRIM(CAST([{cols.get('configuration', '')}] AS NVARCHAR(MAX)))), '') AS configuration
                {f", {col_expr(cols.get('network_domain'), 'network_domain')}" if not _is_placeholder(cols.get('network_domain')) else ", CAST(NULL AS NVARCHAR(255)) AS network_domain"},
            {col_expr(cols.get('ip_address'),      'ip_address')},
            {col_expr(cols.get('monitor'),         'monitor')},
            {col_expr(cols.get('asset_custodian'), 'asset_custodian_ecno')},
            {col_expr(cols.get('user_division'),   'user_division')},
            {col_expr(cols.get('group_name'),      'group_name')},
            {col_expr(cols.get('area'),            'area')},
            {col_expr(cols.get('location'),        'location')},
            {col_expr(cols.get('acms_fms'),        'acms_fms')},
            {col_expr(cols.get('warranty_expiry'), 'warranty_expiry_date')},
            {col_expr(cols.get('remarks'),         'remarks')}
        """

        # Simpler, reliable query builder
        def safe_col(col_val, alias, cast='NVARCHAR(255)'):
            if _is_placeholder(col_val) or not col_val:
                return f"CAST(NULL AS {cast}) AS {alias}"
            return f"NULLIF(LTRIM(RTRIM(CAST([{col_val}] AS {cast}))), '') AS {alias}"

        query = text(f"""
            SELECT
                {safe_col(cols.get('asset_number'),    'asset_number')},
                {safe_col(cols.get('serial_number'),   'serial_number')},
                {safe_col(cols.get('category'),        'category')},
                {safe_col(cols.get('make'),            'make')},
                {safe_col(cols.get('model'),           'model')},
                {safe_col(cols.get('configuration'),   'configuration', 'NVARCHAR(MAX)')},
                {safe_col(cols.get('network_domain'),  'network_domain')},
                {safe_col(cols.get('ip_address'),      'ip_address')},
                {safe_col(cols.get('monitor'),         'monitor')},
                {safe_col(cols.get('asset_custodian'), 'asset_custodian_ecno')},
                {safe_col(cols.get('user_division'),   'user_division')},
                {safe_col(cols.get('group_name'),      'group_name')},
                {safe_col(cols.get('area'),            'area')},
                {safe_col(cols.get('location'),        'location')},
                {safe_col(cols.get('acms_fms'),        'acms_fms')},
                {safe_col(cols.get('warranty_expiry'), 'warranty_expiry_date')},
                {safe_col(cols.get('remarks'),         'remarks')}
            FROM [{table_name}]
            WHERE UPPER(LTRIM(RTRIM(CAST([{ecno_col}] AS NVARCHAR(50))))) = :employee_code
        """)

        try:
            with remote_engine.connect() as conn:
                rows = conn.execute(query, {'employee_code': employee_code}).mappings().all()
            start_index = len(assets)
            assets.extend([
                _imported_asset_to_dict(row, source, start_index + index + 1)
                for index, row in enumerate(rows)
            ])
            print(f"INFO: Fetched {len(rows)} recommendations from cowmis.{table_name}")
        except Exception as e:
            print(f"ERROR: Failed to query cowmis.{table_name}: {e}")
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
    # USER endpoints
    # -----------------------------------------------------------------------

    @app.route('/api/users', methods=['GET'])
    @jwt_required()
    def get_all_users():
        """Return all users."""
        users = User.query.all()
        return jsonify([u.to_dict() for u in users]), 200

    @app.route('/api/users/area/<string:area>', methods=['GET'])
    @jwt_required()
    def get_users_by_area(area):
        """Return users whose area matches."""
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

    @app.route('/api/debug/mine', methods=['GET'])
    @jwt_required()
    def debug_my_assets():
        """
        DEBUG ONLY — remove before going to production.
        Shows exactly what emp_code the JWT resolves to, all ecno values
        in dbo.assets, and whether any match — helps diagnose empty My Assets.
        """
        current_user_id = int(get_jwt_identity())
        current_user    = User.query.get_or_404(current_user_id)
        employee_code   = (current_user.emp_code or '').strip().upper()

        # All distinct asset_custodian_ecno values currently in the table
        all_ecnos = db.session.execute(
            text("SELECT DISTINCT asset_custodian_ecno FROM dbo.assets")
        ).fetchall()
        ecno_list = [r[0] for r in all_ecnos]

        # Total row count
        total = db.session.execute(
            text("SELECT COUNT(*) FROM dbo.assets")
        ).scalar()

        # What the filter would return
        matched = Asset.query.filter(
            func.upper(func.ltrim(func.rtrim(Asset.asset_custodian_ecno))) == employee_code
        ).count()

        return jsonify({
            'jwt_user_id':    current_user_id,
            'emp_code_used':  employee_code,
            'total_assets_in_db': total,
            'distinct_ecnos_in_db': ecno_list,
            'matched_assets': matched,
            'message': f"Filter: UPPER(LTRIM(RTRIM(asset_custodian_ecno))) = '{employee_code}'"
        }), 200

    @app.route('/api/assets/mine', methods=['GET'])
    @jwt_required()
    def get_my_assets():
        """
        Return assets from the LOCAL Asset_Manager DB (dbo.assets) where
        asset_custodian_ecno matches the logged-in employee's ECNO.
        Works for any alphanumeric employee code format.
        """
        current_user_id = int(get_jwt_identity())
        current_user    = User.query.get_or_404(current_user_id)
        employee_code   = (current_user.emp_code or '').strip().upper()

        if not employee_code:
            return jsonify([]), 200

        # SELECT * FROM dbo.assets
        # WHERE UPPER(LTRIM(RTRIM(asset_custodian_ecno))) = '<emp_code>'
        assets = Asset.query.filter(
            func.upper(func.ltrim(func.rtrim(Asset.asset_custodian_ecno))) == employee_code
        ).all()

        return jsonify([a.to_dict() for a in assets]), 200

    @app.route('/api/assets/recommendations', methods=['GET'])
    @jwt_required()
    def get_asset_recommendations():
        """
        Return asset recommendations from the REMOTE cowmis DB (ACMS$ / FMS$ tables)
        for the logged-in employee. Used to pre-fill the Add Asset form.
        Fails gracefully if cowmis is unreachable.
        """
        current_user_id = int(get_jwt_identity())
        current_user    = User.query.get_or_404(current_user_id)
        employee_code   = (current_user.emp_code or '').strip().upper()

        if not employee_code:
            return jsonify([]), 200

        try:
            remote_assets = _fetch_imported_assets_for_employee(employee_code)
        except Exception as e:
            print(f"Failed to fetch recommendations from remote cowmis DB: {e}")
            return jsonify([]), 200

        return jsonify(remote_assets), 200

    @app.route('/api/assets', methods=['POST'])
    @jwt_required()
    def create_asset():
        """Create a new asset in the local Asset_Manager DB."""
        data = request.get_json()

        # Parse optional FMS expiry date
        fms_expiry = None
        if data.get('fmsExpiryDate'):
            try:
                fms_expiry = date.fromisoformat(data['fmsExpiryDate'])
            except ValueError:
                pass

        # Use `or None` so empty strings are stored as NULL (consistent with existing DB rows)
        asset = Asset(
            name                 = data.get('name') or None,
            serial_number        = data.get('serialNumber') or None,
            category             = data.get('CATEGORY') or None,
            make                 = data.get('make') or None,
            model                = data.get('model') or None,
            configuration        = data.get('configuration') or None,
            network_domain       = data.get('networkDomain') or None,
            ip_address           = data.get('ipAddress') or None,
            monitor              = data.get('Monitor') or None,
            asset_custodian_ecno = data.get('AssetCustodianECNO') or None,
            user_division        = data.get('UserDivision') or None,
            group_name           = data.get('GROUP') or None,
            area                 = data.get('AREA') or None,
            location             = data.get('LOCATION') or None,
            acms_fms             = data.get('acmsFms') or None,
            fms_expiry_date      = fms_expiry,
            assigned_to          = data.get('assigned_to') or None,
            status               = data.get('status') or 'Available',
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
                setattr(asset, col, data[field] or None)

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
