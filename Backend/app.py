from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_jwt_extended import (
    JWTManager, create_access_token,
    jwt_required, get_jwt_identity
)
from config import Config
from models import db, User, Asset, AcmsList2027
from datetime import date
from sqlalchemy import func, text
from auth import auth_bp


# ===========================================================================
# COWMIS REMOTE DB — ADD ASSET RECOMMENDATIONS (TBST_ASSETS)
# ===========================================================================
# Recommendations are fetched from TBST_ASSETS in cowmis where:
#   ACUSTODIAN = emp_code  OR  USERID = emp_code
# Columns shown on card: ASSETNO, EQSRLNO, EQPTDESCP
# Clicking a card pre-fills:
#   EQSRLNO    → System Serial Number field
#   EQPTDESCP  → Brief Configuration field
# ===========================================================================

COWMIS_ASSETS_TABLE      = 'TBST_ASSETS'
COWMIS_ASSETNO_COL       = 'ASSETNO'
COWMIS_SERIAL_COL        = 'EQSRLNO'
COWMIS_DESCRIPTION_COL   = 'EQPTDESCP'
COWMIS_CUSTODIAN_COL     = 'ACUSTODIAN'   # primary employee code column
COWMIS_USERID_COL        = 'USERID'       # secondary employee code column


def _fetch_imported_assets_for_employee(employee_code):
    """
    Query TBST_ASSETS from the REMOTE cowmis DB.
    Returns rows where ACUSTODIAN = emp_code OR USERID = emp_code.
    Returns ASSETNO, EQSRLNO and EQPTDESCP for the recommendation cards.
    """
    assets = []

    remote_engine = db.engines.get('remote_pis')
    if not remote_engine:
        print("ERROR: remote_pis engine not configured — cannot fetch cowmis recommendations")
        return assets

    query = text(f"""
        SELECT
            NULLIF(LTRIM(RTRIM(CAST([{COWMIS_ASSETNO_COL}]       AS NVARCHAR(255)))), '') AS asset_number,
            NULLIF(LTRIM(RTRIM(CAST([{COWMIS_SERIAL_COL}]         AS NVARCHAR(255)))), '') AS serial_number,
            NULLIF(LTRIM(RTRIM(CAST([{COWMIS_DESCRIPTION_COL}]    AS NVARCHAR(MAX)))),  '') AS configuration,
            NULLIF(LTRIM(RTRIM(CAST([{COWMIS_CUSTODIAN_COL}]      AS NVARCHAR(50)))),  '') AS asset_custodian_ecno
        FROM [{COWMIS_ASSETS_TABLE}]
        WHERE
            UPPER(LTRIM(RTRIM(CAST([{COWMIS_CUSTODIAN_COL}] AS NVARCHAR(50))))) = :ec
            OR
            UPPER(LTRIM(RTRIM(CAST([{COWMIS_USERID_COL}]    AS NVARCHAR(50))))) = :ec
    """)

    try:
        with remote_engine.connect() as conn:
            rows = conn.execute(query, {'ec': employee_code}).mappings().all()

        for i, row in enumerate(rows):
            assets.append({
                'id':                   f"TBST-{i+1}",
                'sourceTable':          'TBST_ASSETS',
                'assetNumber':          row.get('asset_number') or '',
                'serialNumber':         row.get('serial_number') or '',
                'configuration':        row.get('configuration') or '',
                'asset_custodian_ecno': row.get('asset_custodian_ecno') or '',
                'name':                 row.get('asset_number') or row.get('serial_number') or f"Asset {i+1}",
                'AssetCustodianECNO':   row.get('asset_custodian_ecno') or '',
            })
        print(f"INFO: Fetched {len(assets)} recommendations from cowmis.{COWMIS_ASSETS_TABLE}")
    except Exception as e:
        print(f"ERROR: Failed to query cowmis.{COWMIS_ASSETS_TABLE}: {e}")

    return assets


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

    @app.route('/api/debug/set-password', methods=['POST'])
    def set_local_password():
        """
        DEBUG — sets a local password so you can login when cowmis is unreachable.
        Call from PowerShell:
          Invoke-RestMethod -Uri "http://localhost:5000/api/debug/set-password" `
            -Method POST -ContentType "application/json" `
            -Body '{"emp_code":"NR02491","password":"yourpassword"}'
        After running this, login normally on the frontend with that password.
        """
        data     = request.get_json()
        emp_code = (data.get('emp_code') or '').strip().upper()
        password = data.get('password') or ''

        if not emp_code or not password:
            return jsonify({'error': 'emp_code and password are required'}), 400

        user = User.query.filter_by(emp_code=emp_code).first()
        if not user:
            # Auto-create the user if not yet in local DB
            user = User(username=emp_code, emp_code=emp_code, role='User')
            db.session.add(user)

        user.set_password(password)
        db.session.commit()

        return jsonify({
            'status':   'done',
            'emp_code': emp_code,
            'message':  f"Local password set. You can now login with emp_code={emp_code} using this password when cowmis is unreachable.",
        }), 200

    @app.route('/api/debug/insert-test-asset', methods=['POST'])
    def insert_test_asset():
        """
        DEBUG — inserts a test asset into dbo.assets for a given emp_code.
        Call from PowerShell:
          Invoke-RestMethod -Uri "http://localhost:5000/api/debug/insert-test-asset" `
            -Method POST -ContentType "application/json" `
            -Body '{"emp_code":"NR02491"}'
        """
        data     = request.get_json()
        emp_code = (data.get('emp_code') or '').strip().upper()
        if not emp_code:
            return jsonify({'error': 'emp_code is required'}), 400

        asset = Asset(
            name                 = f'Test Asset for {emp_code}',
            serial_number        = f'TEST-SN-{emp_code}',
            category             = 'PC TYPE 1',
            make                 = 'Dell',
            model                = 'Test Model',
            configuration        = '8GB RAM, 256GB SSD',
            network_domain       = 'ASDMLAN',
            ip_address           = '192.168.1.100',
            monitor              = 'Dell 24"',
            asset_custodian_ecno = emp_code,
            user_division        = 'TEST DIVISION',
            group_name           = 'TEST GROUP',
            area                 = 'Balanagar',
            location             = 'Test Location',
            acms_fms             = 'ACMS',
            status               = 'Assigned',
        )
        db.session.add(asset)
        db.session.commit()

        return jsonify({
            'status':   'done',
            'message':  f'Test asset inserted into dbo.assets with asset_custodian_ecno = {emp_code}',
            'asset':    asset.to_dict(),
        }), 201

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

    @app.route('/api/debug/coins', methods=['GET'])
    def debug_coins():
        """
        DEBUG — no auth. Check what TBST_ASSETS returns from cowmis.
        Call from browser:
        http://localhost:5000/api/debug/coins?emp_code=NR02491
        Shows raw EQSRLNO and EQPTDESCP values.
        """
        emp_code = request.args.get('emp_code', '').strip().upper()
        if not emp_code:
            return jsonify({'error': 'Pass ?emp_code=YOUR_CODE'}), 400

        remote_engine = db.engines.get('remote_pis')
        if not remote_engine:
            return jsonify({'error': 'remote_pis engine not configured'}), 500

        try:
            with remote_engine.connect() as conn:
                # Check total rows in TBST_ASSETS first
                total = conn.execute(text("SELECT COUNT(*) FROM [TBST_ASSETS]")).scalar()

                # Fetch matching rows
                rows = conn.execute(text("""
                    SELECT TOP 10
                        [EQSRLNO],
                        [EQPTDESCP],
                        [ACUSTODIAN],
                        [USERID]
                    FROM [TBST_ASSETS]
                    WHERE
                        UPPER(LTRIM(RTRIM(CAST([ACUSTODIAN] AS NVARCHAR(50))))) = :ec
                        OR
                        UPPER(LTRIM(RTRIM(CAST([USERID]     AS NVARCHAR(50))))) = :ec
                """), {'ec': emp_code}).mappings().all()

            return jsonify({
                'emp_code':         emp_code,
                'total_in_table':   total,
                'matched_rows':     len(rows),
                'rows': [
                    {
                        'EQSRLNO':    r['EQSRLNO'],
                        'EQPTDESCP':  r['EQPTDESCP'],
                        'ACUSTODIAN': r['ACUSTODIAN'],
                        'USERID':     r['USERID'],
                    }
                    for r in rows
                ]
            }), 200
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    @app.route('/api/debug/tables', methods=['GET'])
    def debug_tables():
        """
        DEBUG — no auth needed. Call from browser:
        http://localhost:5000/api/debug/tables
        Lists all tables in the local Asset_Manager DB with row counts and columns.
        Helps find where the actual asset data lives.
        """
        try:
            # Get all tables and their row counts
            tables_result = db.session.execute(text("""
                SELECT
                    t.TABLE_SCHEMA,
                    t.TABLE_NAME,
                    p.rows AS row_count
                FROM INFORMATION_SCHEMA.TABLES t
                LEFT JOIN sys.tables st ON st.name = t.TABLE_NAME
                LEFT JOIN sys.partitions p ON p.object_id = st.object_id AND p.index_id IN (0,1)
                WHERE t.TABLE_TYPE = 'BASE TABLE'
                ORDER BY p.rows DESC, t.TABLE_NAME
            """)).mappings().all()

            tables_info = []
            for t in tables_result:
                table_full = f"{t['TABLE_SCHEMA']}.{t['TABLE_NAME']}"

                # Get column names for this table
                cols_result = db.session.execute(text("""
                    SELECT COLUMN_NAME, DATA_TYPE
                    FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_SCHEMA = :schema AND TABLE_NAME = :name
                    ORDER BY ORDINAL_POSITION
                """), {'schema': t['TABLE_SCHEMA'], 'name': t['TABLE_NAME']}).mappings().all()

                columns = [f"{c['COLUMN_NAME']} ({c['DATA_TYPE']})" for c in cols_result]

                tables_info.append({
                    'table':      table_full,
                    'row_count':  t['row_count'],
                    'columns':    columns,
                })

            return jsonify({
                'database':    'Asset_Manager (local)',
                'table_count': len(tables_info),
                'tables':      tables_info,
            }), 200

        except Exception as e:
            return jsonify({'error': str(e)}), 500

    @app.route('/api/debug/mine', methods=['GET'])
    def debug_my_assets():
        """
        DEBUG — no auth needed. Call from browser:
        http://localhost:5000/api/debug/mine?emp_code=YOUR_CODE
        Checks dbo.ACMS and dbo.FMS (the real local asset tables).
        """
        employee_code = request.args.get('emp_code', '').strip().upper()

        if not employee_code:
            return jsonify({'error': 'Pass ?emp_code=YOUR_CODE in the URL'}), 400

        ecno_col = '[Asset Custodian ECNO_(Refer PIS Database)]'

        acms_count = db.session.execute(
            text(f"SELECT COUNT(*) FROM dbo.ACMS WHERE UPPER(LTRIM(RTRIM({ecno_col}))) = :ec"),
            {'ec': employee_code}
        ).scalar()

        fms_count = db.session.execute(
            text(f"SELECT COUNT(*) FROM dbo.FMS WHERE UPPER(LTRIM(RTRIM({ecno_col}))) = :ec"),
            {'ec': employee_code}
        ).scalar()

        # Sample 3 rows from ACMS
        sample_rows = db.session.execute(
            text(f"""
                SELECT TOP 3
                    [Asset Number_(Refer PIS Database)] AS asset_number,
                    [System Serial Number] AS serial_number,
                    [Category] AS category,
                    [Make] AS make,
                    {ecno_col} AS asset_custodian_ecno
                FROM dbo.ACMS
                WHERE UPPER(LTRIM(RTRIM({ecno_col}))) = :ec
            """),
            {'ec': employee_code}
        ).mappings().all()

        return jsonify({
            'emp_code_searched':   employee_code,
            'acms_matched_rows':   acms_count,
            'fms_matched_rows':    fms_count,
            'total_matched':       (acms_count or 0) + (fms_count or 0),
            'sample_acms':         [dict(r) for r in sample_rows],
            'filter_column':       'Asset Custodian ECNO_(Refer PIS Database)',
        }), 200

    @app.route('/api/assets/mine', methods=['GET'])
    @jwt_required()
    def get_my_assets():
        """
        Return assets from dbo.assets (local Asset_Manager DB)
        where asset_custodian_ecno matches the logged-in employee's ECNO.
        """
        current_user_id = int(get_jwt_identity())
        current_user    = User.query.get_or_404(current_user_id)
        employee_code   = (current_user.emp_code or '').strip().upper()

        if not employee_code:
            return jsonify([]), 200

        assets = Asset.query.filter(
            func.upper(func.ltrim(func.rtrim(Asset.asset_custodian_ecno))) == employee_code
        ).all()

        return jsonify([a.to_dict() for a in assets]), 200

    @app.route('/api/admin/import-assets', methods=['POST'])
    def import_assets_from_acms_fms():
        """
        One-time import: copies all rows from dbo.ACMS and dbo.FMS
        into dbo.assets so the assets table gets populated.
        Call once from browser or Postman:
            POST http://localhost:5000/api/admin/import-assets
        Safe to call multiple times — skips rows already imported
        (matches on serial_number + asset_custodian_ecno).
        """
        imported = 0
        skipped  = 0
        errors   = 0

        def row_to_asset(row, source):
            serial = _clean_value(row.get('serial_number'))
            ecno   = _clean_value(row.get('asset_custodian_ecno'))
            name   = (
                _clean_value(row.get('asset_number')) or
                serial or
                _clean_value(row.get('category')) or
                f"{source} Asset"
            )

            # Skip if already exists (same serial + ecno)
            if serial and ecno:
                exists = Asset.query.filter_by(
                    serial_number        = serial,
                    asset_custodian_ecno = ecno
                ).first()
                if exists:
                    return None  # already imported

            expiry = None
            raw_expiry = _clean_value(row.get('warranty_expiry_date'))
            if raw_expiry:
                try:
                    expiry = date.fromisoformat(raw_expiry[:10])
                except Exception:
                    pass

            return Asset(
                name                 = name,
                serial_number        = serial,
                category             = _clean_value(row.get('category')),
                make                 = _clean_value(row.get('make')),
                model                = _clean_value(row.get('model')),
                configuration        = _clean_value(row.get('configuration')),
                network_domain       = _clean_value(row.get('network_domain')),
                ip_address           = _clean_value(row.get('ip_address')),
                monitor              = _clean_value(row.get('monitor')),
                asset_custodian_ecno = ecno,
                user_division        = _clean_value(row.get('user_division')),
                group_name           = _clean_value(row.get('group_name')),
                area                 = _clean_value(row.get('area')),
                location             = _clean_value(row.get('location')),
                acms_fms             = _clean_value(row.get('acms_fms')) or source,
                fms_expiry_date      = expiry,
                status               = 'Assigned',
            )

        ecno_col = '[Asset Custodian ECNO_(Refer PIS Database)]'

        for table_name, source_label in [('ACMS', 'ACMS'), ('FMS', 'FMS')]:
            try:
                rows = db.session.execute(text(f"""
                    SELECT
                        NULLIF(LTRIM(RTRIM(CAST([Asset Number_(Refer PIS Database)] AS NVARCHAR(255)))), '') AS asset_number,
                        NULLIF(LTRIM(RTRIM(CAST([System Serial Number]              AS NVARCHAR(255)))), '') AS serial_number,
                        NULLIF(LTRIM(RTRIM(CAST([Category]                          AS NVARCHAR(255)))), '') AS category,
                        NULLIF(LTRIM(RTRIM(CAST([Make]                              AS NVARCHAR(255)))), '') AS make,
                        NULLIF(LTRIM(RTRIM(CAST([Model]                             AS NVARCHAR(255)))), '') AS model,
                        NULLIF(LTRIM(RTRIM(CAST([Brief Configuration]               AS NVARCHAR(MAX)))), '') AS configuration,
                        NULLIF(LTRIM(RTRIM(CAST([Network Domain (Interent/Spacenet/NRSCVRF/DP etc)] AS NVARCHAR(255)))), '') AS network_domain,
                        NULLIF(LTRIM(RTRIM(CAST([IP]                                AS NVARCHAR(255)))), '') AS ip_address,
                        NULLIF(LTRIM(RTRIM(CAST([Monitor]                           AS NVARCHAR(255)))), '') AS monitor,
                        NULLIF(LTRIM(RTRIM(CAST({ecno_col}                          AS NVARCHAR(255)))), '') AS asset_custodian_ecno,
                        NULLIF(LTRIM(RTRIM(CAST([User-Division _(Refer Employee Directory)]          AS NVARCHAR(255)))), '') AS user_division,
                        NULLIF(LTRIM(RTRIM(CAST([Group]                             AS NVARCHAR(255)))), '') AS group_name,
                        NULLIF(LTRIM(RTRIM(CAST([Area]                              AS NVARCHAR(255)))), '') AS area,
                        NULLIF(LTRIM(RTRIM(CAST([Location]                          AS NVARCHAR(255)))), '') AS location,
                        NULLIF(LTRIM(RTRIM(CAST([ACMS, FMS, FMS + ACMS]            AS NVARCHAR(255)))), '') AS acms_fms,
                        NULLIF(LTRIM(RTRIM(CAST([Warranty  _Expiry Date]            AS NVARCHAR(255)))), '') AS warranty_expiry_date
                    FROM dbo.[{table_name}]
                    ORDER BY [SL No]
                """)).mappings().all()

                for row in rows:
                    try:
                        asset = row_to_asset(dict(row), source_label)
                        if asset is None:
                            skipped += 1
                        else:
                            db.session.add(asset)
                            imported += 1
                    except Exception as e:
                        print(f"Row error in {table_name}: {e}")
                        errors += 1

                db.session.commit()
                print(f"Imported from dbo.{table_name}: {imported} rows")

            except Exception as e:
                db.session.rollback()
                print(f"Failed to import dbo.{table_name}: {e}")
                return jsonify({'error': f'Failed on {table_name}: {str(e)}'}), 500

        total_in_assets = Asset.query.count()
        return jsonify({
            'status':               'done',
            'imported':             imported,
            'skipped_duplicates':   skipped,
            'errors':               errors,
            'total_in_dbo_assets':  total_in_assets,
        }), 200

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

        # — Filter out assets already saved in ACMS_list_2027 —
        try:
            existing_serials = {
                row.serial_number
                for row in AcmsList2027.query.with_entities(AcmsList2027.serial_number).all()
                if row.serial_number
            }
            remote_assets = [a for a in remote_assets if a.get('serialNumber') not in existing_serials]
        except Exception as fe:
            print(f'[WARN] Could not filter by ACMS_list_2027: {fe}')  # table may not exist here

        return jsonify(remote_assets), 200

    @app.route('/api/assets/recommendations/search', methods=['GET'])
    @jwt_required()
    def search_recommendations():
        """
        Search TBST_ASSETS in cowmis by EQSRLNO.
        GET /api/assets/recommendations/search?q=SRL123
        Returns cards with ASSETNO, EQSRLNO, EQPTDESCP.
        """
        q = request.args.get('q', '').strip()
        if not q:
            return jsonify([]), 200

        remote_engine = db.engines.get('remote_pis')
        if not remote_engine:
            return jsonify({'error': 'remote_pis not configured'}), 500

        try:
            query = text(f"""
                SELECT TOP 20
                    NULLIF(LTRIM(RTRIM(CAST([{COWMIS_ASSETNO_COL}]     AS NVARCHAR(255)))), '') AS asset_number,
                    NULLIF(LTRIM(RTRIM(CAST([{COWMIS_SERIAL_COL}]       AS NVARCHAR(255)))), '') AS serial_number,
                    NULLIF(LTRIM(RTRIM(CAST([{COWMIS_DESCRIPTION_COL}]  AS NVARCHAR(MAX)))),  '') AS configuration,
                    NULLIF(LTRIM(RTRIM(CAST([{COWMIS_CUSTODIAN_COL}]    AS NVARCHAR(50)))),  '') AS asset_custodian_ecno
                FROM [{COWMIS_ASSETS_TABLE}]
                WHERE [{COWMIS_SERIAL_COL}] LIKE :q
                ORDER BY [{COWMIS_SERIAL_COL}]
            """)
            with remote_engine.connect() as conn:
                rows = conn.execute(query, {'q': f'%{q}%'}).mappings().all()

            results = [
                {
                    'id':                   f"SEARCH-{i+1}",
                    'sourceTable':          'TBST_ASSETS',
                    'assetNumber':          row.get('asset_number')  or '',
                    'serialNumber':         row.get('serial_number') or '',
                    'configuration':        row.get('configuration') or '',
                    'AssetCustodianECNO':   row.get('asset_custodian_ecno') or '',
                    'name':                 row.get('asset_number') or row.get('serial_number') or f'Result {i+1}',
                }
                for i, row in enumerate(rows)
            ]

            # — Filter out serial numbers already in ACMS_list_2027 —
            try:
                existing_serials = {
                    row.serial_number
                    for row in AcmsList2027.query.with_entities(AcmsList2027.serial_number).all()
                    if row.serial_number
                }
                results = [r for r in results if r.get('serialNumber') not in existing_serials]
            except Exception as fe:
                print(f'[WARN] Could not filter search by ACMS_list_2027: {fe}')

            return jsonify(results), 200

        except Exception as e:
            print(f"ERROR: TBST_ASSETS search failed: {e}")
            return jsonify({'error': str(e)}), 500

    @app.route('/api/assets', methods=['POST'])
    @jwt_required()
    def create_asset():
        """Create a new asset in the local Asset_Manager DB."""
        data = request.get_json()


        # Parse warranty expiry date (sent as fmsExpiryDate from frontend)
        fms_expiry = None
        expiry_raw = data.get('fmsExpiryDate') or data.get('warrantyExpiry')
        if expiry_raw:
            try:
                fms_expiry = date.fromisoformat(expiry_raw)
            except ValueError:
                pass

        # Use `or None` so empty strings are stored as NULL (consistent with existing DB rows)
        asset = Asset(
            asset_number         = data.get('assetNumber') or None,
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
            warranty             = data.get('warranty') or 'No',
            fms_expiry_date      = fms_expiry,
            assigned_to          = data.get('assigned_to') or None,
            status               = data.get('status') or 'Available',
        )

        db.session.add(asset)
        db.session.commit()

        # — Mirror to ACMS_list_2027 —
        try:
            entry = AcmsList2027(
                asset_number         = asset.asset_number,
                serial_number        = asset.serial_number,
                category             = asset.category,
                make                 = asset.make,
                model                = asset.model,
                configuration        = asset.configuration,
                network_domain       = asset.network_domain,
                ip_address           = asset.ip_address,
                monitor              = asset.monitor,
                asset_custodian_ecno = asset.asset_custodian_ecno,
                user_division        = asset.user_division,
                group_name           = asset.group_name,
                area                 = asset.area,
                location             = asset.location,
                acms_fms             = asset.acms_fms,
                warranty             = asset.warranty,
                fms_expiry_date      = asset.fms_expiry_date,
                assigned_to          = asset.assigned_to,
                status               = asset.status,
            )
            db.session.add(entry)
            db.session.commit()
        except Exception as mirror_err:
            db.session.rollback()
            # Non-fatal: ACMS_list_2027 may not exist on this machine
            print(f'[WARN] Could not mirror to ACMS_list_2027: {mirror_err}')

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
            'assetNumber':        'asset_number',
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
            'warranty':           'warranty',
            'assigned_to':        'assigned_to',
            'status':             'status',
        }.items():
            if field in data:
                setattr(asset, col, data[field] or None)

        expiry_raw = data.get('fmsExpiryDate') or data.get('warrantyExpiry')
        if expiry_raw:
            try:
                asset.fms_expiry_date = date.fromisoformat(expiry_raw)
            except ValueError:
                pass
        elif 'fmsExpiryDate' in data and not data['fmsExpiryDate']:
            asset.fms_expiry_date = None


        db.session.commit()

        # — Mirror / upsert to ACMS_list_2027 —
        try:
            # Try to find an existing row by asset_number + serial_number
            mirror = AcmsList2027.query.filter_by(
                asset_number  = asset.asset_number,
                serial_number = asset.serial_number,
            ).first()
            if not mirror:
                mirror = AcmsList2027()
                db.session.add(mirror)
            mirror.asset_number         = asset.asset_number
            mirror.serial_number        = asset.serial_number
            mirror.category             = asset.category
            mirror.make                 = asset.make
            mirror.model                = asset.model
            mirror.configuration        = asset.configuration
            mirror.network_domain       = asset.network_domain
            mirror.ip_address           = asset.ip_address
            mirror.monitor              = asset.monitor
            mirror.asset_custodian_ecno = asset.asset_custodian_ecno
            mirror.user_division        = asset.user_division
            mirror.group_name           = asset.group_name
            mirror.area                 = asset.area
            mirror.location             = asset.location
            mirror.acms_fms             = asset.acms_fms
            mirror.warranty             = asset.warranty
            mirror.fms_expiry_date      = asset.fms_expiry_date
            mirror.assigned_to          = asset.assigned_to
            mirror.status               = asset.status
            db.session.commit()
        except Exception as mirror_err:
            db.session.rollback()
            print(f'[WARN] Could not mirror update to ACMS_list_2027: {mirror_err}')

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
