from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_jwt_extended import (
    JWTManager, create_access_token,
    jwt_required, get_jwt_identity
)
from config import Config
from models import db, User, Asset, AcmsList2027, PendingRequest
from datetime import date, datetime
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

    # ===========================================================================
    # APPROVAL WORKFLOW — PENDING REQUESTS
    # ===========================================================================
    # Flow: Submitted → Approver Approved → Area Focal Point Approved → DD Approved → Approved
    # The requester manually selects Approver, Area Focal Point, and DD from dropdowns.
    # ===========================================================================

    # ── FUNCDESGCODE sets ────────────────────────────────────────────────────
    # Approver / Area Focal Point / Admin share these designation codes
    APPROVAL_FUNC_CODES = (
        400, 500, 300, 310, 510, 30, 20, 50, 55, 60,
        61, 65, 70, 105, 501, 530, 540, 550, 560, 600,
        2060, 2090, 2091
    )
    # DD has its own code
    DD_FUNC_CODE = 40

    def _fetch_personnel_from_remote(func_codes):
        """
        Query TBAD_FUNCDESG_VIEW INNER JOIN VIEWEMPINFO from the remote cowmis DB.
        Only employees whose EMPLOYEECODE exists in TBAD_FUNCDESG_VIEW are returned.

        Columns fetched:
          TBAD_FUNCDESG_VIEW : EMPLOYEECODE, FUNCDESGDES, FUNCDESGCODE
          VIEWEMPINFO        : EMPLOYEENAME, GROUPFULLNAME, DIVNFULLNAME, SECTIONFULLNAME

        Returns [] gracefully if the remote DB is unreachable or the query fails.
        """
        remote_engine = db.engines.get('remote_pis')
        if not remote_engine:
            print('[WARN] remote_pis engine not configured — cannot fetch personnel')
            return []

        # Accept a single int or a tuple/list of ints
        if isinstance(func_codes, int):
            func_codes = (func_codes,)

        # Build safe numbered placeholders  :c0, :c1, …
        placeholders = ', '.join(f':c{i}' for i in range(len(func_codes)))
        params = {f'c{i}': v for i, v in enumerate(func_codes)}

        query = text(f"""
            SELECT DISTINCT
                LTRIM(RTRIM(CAST(f.EMPLOYEECODE    AS NVARCHAR(50))))   AS ecno,
                LTRIM(RTRIM(CAST(v.EMPLOYEENAME    AS NVARCHAR(200))))  AS name,
                LTRIM(RTRIM(CAST(f.FUNCDESGDES     AS NVARCHAR(200))))  AS designation,
                f.FUNCDESGCODE                                           AS code,
                LTRIM(RTRIM(CAST(v.GROUPFULLNAME   AS NVARCHAR(200))))  AS group_name,
                LTRIM(RTRIM(CAST(v.DIVNFULLNAME    AS NVARCHAR(200))))  AS division_name,
                LTRIM(RTRIM(CAST(v.SECTIONFULLNAME AS NVARCHAR(200))))  AS section_name
            FROM TBAD_FUNCDESG_VIEW f
            INNER JOIN VIEWEMPINFO v
                ON LTRIM(RTRIM(CAST(v.EMPLOYEECODE AS NVARCHAR(50))))
                 = LTRIM(RTRIM(CAST(f.EMPLOYEECODE AS NVARCHAR(50))))
            WHERE f.FUNCDESGCODE IN ({placeholders})
              AND LTRIM(RTRIM(CAST(f.EMPLOYEECODE AS NVARCHAR(50)))) <> ''
            ORDER BY v.EMPLOYEENAME, f.EMPLOYEECODE
        """)

        try:
            with remote_engine.connect() as conn:
                rows = conn.execute(query, params).mappings().all()

            result = []
            for row in rows:
                ecno = (row.get('ecno') or '').strip()
                if not ecno:
                    continue
                result.append({
                    'ecno':         ecno,
                    'name':         (row.get('name')          or '').strip() or ecno,
                    'designation':  (row.get('designation')   or '').strip(),
                    'code':         row.get('code'),
                    'groupName':    (row.get('group_name')    or '').strip(),
                    'divisionName': (row.get('division_name') or '').strip(),
                    'sectionName':  (row.get('section_name')  or '').strip(),
                })

            print(f'[INFO] _fetch_personnel_from_remote (TBAD_FUNCDESG_VIEW): codes={func_codes} → {len(result)} records')
            return result

        except Exception as e:
            print(f'[WARN] Could not fetch personnel from remote cowmis: {e}')
            return []



    @app.route('/api/assets/approvers', methods=['GET'])
    @jwt_required()
    def get_approvers():
        """
        Return personnel list for Approver dropdown.
        Source: TBAD_EMPFUNCDESG_VIEW joined VIEWEMPINFO, FUNCDESGCODE IN APPROVAL_FUNC_CODES.
        """
        return jsonify(_fetch_personnel_from_remote(APPROVAL_FUNC_CODES)), 200

    @app.route('/api/assets/registrars', methods=['GET'])
    @jwt_required()
    def get_registrars():
        """
        Return personnel list for Area Focal Point dropdown.
        Source: same as approvers — FUNCDESGCODE IN APPROVAL_FUNC_CODES.
        """
        return jsonify(_fetch_personnel_from_remote(APPROVAL_FUNC_CODES)), 200

    @app.route('/api/assets/dds', methods=['GET'])
    @jwt_required()
    def get_dds():
        """
        Return personnel list for Deputy Director dropdown.
        Source: TBAD_EMPFUNCDESG_VIEW joined VIEWEMPINFO, FUNCDESGCODE = 40.
        """
        return jsonify(_fetch_personnel_from_remote(DD_FUNC_CODE)), 200

    @app.route('/api/assets/admins', methods=['GET'])
    @jwt_required()
    def get_admins():
        """
        Return personnel list for Admin dropdown (same codes as approvers).
        """
        return jsonify(_fetch_personnel_from_remote(APPROVAL_FUNC_CODES)), 200

    @app.route('/api/assets/request-add', methods=['POST'])
    @jwt_required()
    def request_asset_add():
        """
        Submit a new approval request to add a system to the ACMS list.
        Body: all asset fields + approver_ecno + approver_name + dd_ecno + dd_name
        """
        current_user_id = int(get_jwt_identity())
        current_user    = User.query.get_or_404(current_user_id)
        data            = request.get_json() or {}

        pr = PendingRequest(
            requester_ecno       = (current_user.emp_code or '').strip().upper(),
            requester_name       = current_user.username,
            asset_number         = data.get('assetNumber'),
            serial_number        = data.get('serialNumber'),
            category             = data.get('category') or data.get('CATEGORY'),
            make                 = data.get('make'),
            model                = data.get('model'),
            configuration        = data.get('configuration'),
            network_domain       = data.get('networkDomain'),
            ip_address           = data.get('ipAddress'),
            monitor              = data.get('monitor') or data.get('Monitor'),
            asset_custodian_ecno = data.get('assetCustodianEcno') or data.get('AssetCustodianECNO'),
            user_division        = data.get('userDivision') or data.get('UserDivision'),
            group_name           = data.get('group') or data.get('GROUP'),
            area                 = data.get('area') or data.get('AREA'),
            location             = data.get('location') or data.get('LOCATION'),
            acms_fms             = data.get('acmsFms'),
            warranty             = data.get('warranty', 'No'),
            fms_expiry_date      = None,  # set below if provided
            status               = 'Draft',
            current_level        = 1,
            approver_ecno        = None,
            approver_name        = None,
            registrar_ecno       = None,
            registrar_name       = None,
            dd_ecno              = None,
            dd_name              = None,
        )

        # Parse fms_expiry_date if warranty=Yes
        raw_date = data.get('fmsExpiryDate') or data.get('warrantyExpiry')
        if raw_date:
            try:
                pr.fms_expiry_date = datetime.strptime(raw_date[:10], '%Y-%m-%d').date()
            except ValueError:
                pass

        db.session.add(pr)
        db.session.commit()
        return jsonify({'message': 'Saved as draft.', 'id': pr.id}), 201

    @app.route('/api/assets/pending-requests/drafts', methods=['GET'])
    @jwt_required()
    def get_draft_requests():
        """Return all Draft pending requests for the logged-in user."""
        current_user_id = int(get_jwt_identity())
        current_user    = User.query.get_or_404(current_user_id)
        employee_code   = (current_user.emp_code or '').strip().upper()
        rows = PendingRequest.query.filter(
            func.upper(func.ltrim(func.rtrim(PendingRequest.requester_ecno))) == employee_code,
            PendingRequest.status == 'Draft'
        ).order_by(PendingRequest.created_at.desc()).all()
        return jsonify([r.to_dict() for r in rows]), 200

    @app.route('/api/assets/pending-requests/submit', methods=['POST'])
    @jwt_required()
    def submit_pending_requests():
        """
        Submit selected Draft requests for approval.
        Body: {
          draftIds: [1, 2, 3],
          approverEcno, approverName, approverDesignation,
          registrarEcno, registrarName, registrarDesignation,
          ddEcno, ddName, ddDesignation
        }
        """
        current_user_id = int(get_jwt_identity())
        current_user    = User.query.get_or_404(current_user_id)
        employee_code   = (current_user.emp_code or '').strip().upper()
        data            = request.get_json() or {}

        draft_ids = data.get('draftIds', [])
        if not draft_ids:
            return jsonify({'error': 'No draft IDs provided.'}), 400

        approver_ecno  = (data.get('approverEcno') or '').strip()
        registrar_ecno = (data.get('registrarEcno') or '').strip()
        dd_ecno        = (data.get('ddEcno') or '').strip()

        if not approver_ecno or not registrar_ecno or not dd_ecno:
            return jsonify({'error': 'Approver, Area Focal Point and DD must all be selected.'}), 400

        submitted_count = 0
        errors = []
        for draft_id in draft_ids:
            pr = PendingRequest.query.get(draft_id)
            if not pr:
                errors.append(f'Request {draft_id} not found.')
                continue
            if pr.requester_ecno.strip().upper() != employee_code:
                errors.append(f'Request {draft_id} does not belong to you.')
                continue
            if pr.status != 'Draft':
                errors.append(f'Request {draft_id} is not in Draft status.')
                continue
            pr.status            = 'Submitted'
            pr.current_level     = 1
            pr.approver_ecno     = approver_ecno
            pr.approver_name     = data.get('approverName')
            pr.registrar_ecno    = registrar_ecno
            pr.registrar_name    = data.get('registrarName')
            pr.dd_ecno           = dd_ecno
            pr.dd_name           = data.get('ddName')
            pr.updated_at        = datetime.utcnow()
            submitted_count += 1

        db.session.commit()
        return jsonify({
            'message': f'{submitted_count} request(s) submitted for approval.',
            'submitted': submitted_count,
            'errors': errors,
        }), 200

    @app.route('/api/assets/assigned-to-me', methods=['GET'])
    @jwt_required()
    def get_assigned_to_me():
        """
        Return pending requests that are currently awaiting MY action.
        - Level 1 (Submitted):         I am the Approver
        - Level 2 (Approver Approved): I am the Area Focal Point
        - Level 3 (Area Focal Point Approved):I am the DD
        - Level 4 (DD Approved):       I am an Admin (role='Admin')
        """
        from sqlalchemy import or_, and_
        current_user_id = int(get_jwt_identity())
        current_user    = User.query.get_or_404(current_user_id)
        ecno            = (current_user.emp_code or '').strip().upper()
        is_admin        = (current_user.role or '').strip().lower() == 'admin'

        filters = [
            and_(
                func.upper(func.ltrim(func.rtrim(PendingRequest.approver_ecno))) == ecno,
                PendingRequest.status == 'Submitted'
            ),
            and_(
                func.upper(func.ltrim(func.rtrim(PendingRequest.registrar_ecno))) == ecno,
                PendingRequest.status == 'Approver Approved'
            ),
            and_(
                func.upper(func.ltrim(func.rtrim(PendingRequest.dd_ecno))) == ecno,
                PendingRequest.status == 'Registrar Approved'
            ),
        ]
        if is_admin:
            filters.append(PendingRequest.status == 'DD Approved')

        rows = PendingRequest.query.filter(or_(*filters)) \
                                   .order_by(PendingRequest.created_at.asc()).all()
        return jsonify([r.to_dict() for r in rows]), 200

    @app.route('/api/assets/pending-requests/<int:request_id>/approve', methods=['POST'])
    @jwt_required()
    def approve_pending_request(request_id):
        """
        Approve or Reject a pending request.
        Body: { action: 'approve'|'reject', remarks: '...' }
        Automatically advances to the next level.
        On final Admin approval: writes record to dbo.ACMS_list_2027.
        """
        from sqlalchemy import or_, and_
        current_user_id = int(get_jwt_identity())
        current_user    = User.query.get_or_404(current_user_id)
        ecno            = (current_user.emp_code or '').strip().upper()
        is_admin        = (current_user.role or '').strip().lower() == 'admin'
        data            = request.get_json() or {}
        action          = (data.get('action') or '').strip().lower()  # 'approve' | 'reject'
        remarks         = data.get('remarks', '')

        if action not in ('approve', 'reject'):
            return jsonify({'error': 'action must be approve or reject.'}), 400

        pr = PendingRequest.query.get_or_404(request_id)
        now = datetime.utcnow()

        # — Validate that this user is allowed to act at the current level —
        allowed = False
        if pr.status == 'Submitted' and (pr.approver_ecno or '').strip().upper() == ecno:
            allowed = True
            if action == 'approve':
                pr.approver_remarks   = remarks
                pr.approver_action_at = now
                pr.status             = 'Approver Approved'
                pr.current_level      = 2
            else:
                pr.approver_remarks   = remarks
                pr.approver_action_at = now
                pr.status             = 'Rejected'

        elif pr.status == 'Approver Approved' and (pr.registrar_ecno or '').strip().upper() == ecno:
            allowed = True
            if action == 'approve':
                pr.registrar_remarks   = remarks
                pr.registrar_action_at = now
                pr.status              = 'Registrar Approved'
                pr.current_level       = 3
            else:
                pr.registrar_remarks   = remarks
                pr.registrar_action_at = now
                pr.status              = 'Rejected'

        elif pr.status == 'Registrar Approved' and (pr.dd_ecno or '').strip().upper() == ecno:
            allowed = True
            if action == 'approve':
                pr.dd_remarks   = remarks
                pr.dd_action_at = now
                pr.status       = 'DD Approved'
                pr.current_level = 4
            else:
                pr.dd_remarks   = remarks
                pr.dd_action_at = now
                pr.status       = 'Rejected'

        elif pr.status == 'DD Approved' and is_admin:
            allowed = True
            if action == 'approve':
                pr.admin_remarks   = remarks
                pr.admin_action_at = now
                pr.status          = 'Approved'
                pr.current_level   = 5
                # — Write to dbo.ACMS_list_2027 —
                try:
                    acms = AcmsList2027(
                        asset_number         = pr.asset_number,
                        serial_number        = pr.serial_number,
                        category             = pr.category,
                        make                 = pr.make,
                        model                = pr.model,
                        configuration        = pr.configuration,
                        network_domain       = pr.network_domain,
                        ip_address           = pr.ip_address,
                        monitor              = pr.monitor,
                        asset_custodian_ecno = pr.asset_custodian_ecno,
                        user_division        = pr.user_division,
                        group_name           = pr.group_name,
                        area                 = pr.area,
                        location             = pr.location,
                        acms_fms             = pr.acms_fms,
                        warranty             = pr.warranty or 'No',
                        fms_expiry_date      = pr.fms_expiry_date,
                        assigned_to          = None,
                        status               = 'Available',
                    )
                    db.session.add(acms)
                    print(f'[INFO] Written to ACMS_list_2027: serial={pr.serial_number}')
                except Exception as e:
                    print(f'[ERROR] Failed to write to ACMS_list_2027: {e}')
            else:
                pr.admin_remarks   = remarks
                pr.admin_action_at = now
                pr.status          = 'Rejected'

        if not allowed:
            return jsonify({'error': 'You are not authorised to act on this request at its current level.'}), 403

        pr.updated_at = now
        db.session.commit()
        return jsonify({'message': f'Request {action}d successfully.', 'status': pr.status}), 200

    @app.route('/api/assets/pending-requests', methods=['GET'])
    @jwt_required()
    def get_pending_requests():
        """
        Return all pending requests submitted by the logged-in user.
        Excludes Withdrawn records unless ?include_withdrawn=true.
        """
        current_user_id  = int(get_jwt_identity())
        current_user     = User.query.get_or_404(current_user_id)
        employee_code    = (current_user.emp_code or '').strip().upper()
        include_all      = request.args.get('include_withdrawn', 'false').lower() == 'true'

        query = PendingRequest.query.filter(
            func.upper(func.ltrim(func.rtrim(PendingRequest.requester_ecno))) == employee_code
        )
        if not include_all:
            query = query.filter(PendingRequest.status != 'Withdrawn')

        rows = query.order_by(PendingRequest.created_at.desc()).all()
        return jsonify([r.to_dict() for r in rows]), 200

    @app.route('/api/assets/pending-requests/<int:request_id>/withdraw', methods=['POST'])
    @jwt_required()
    def withdraw_pending_request(request_id):
        """
        Withdraw a pending request (only allowed by the original requester,
        and only if status is Submitted or Approver Approved).
        """
        current_user_id = int(get_jwt_identity())
        current_user    = User.query.get_or_404(current_user_id)
        employee_code   = (current_user.emp_code or '').strip().upper()

        pr = PendingRequest.query.get_or_404(request_id)

        if pr.requester_ecno.strip().upper() != employee_code:
            return jsonify({'error': 'You can only withdraw your own requests.'}), 403

        if pr.status not in ('Submitted', 'Approver Approved'):
            return jsonify({'error': f'Cannot withdraw a request with status "{pr.status}".'}), 400

        pr.status     = 'Withdrawn'
        pr.updated_at = datetime.utcnow()
        db.session.commit()
        return jsonify({'message': 'Request withdrawn successfully.'}), 200

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

    @app.route('/api/assets/acms2027/mine', methods=['GET'])
    @jwt_required()
    def get_my_acms2027_assets():
        """
        Return assets from dbo.ACMS_list_2027 where asset_custodian_ecno
        matches the logged-in employee's ECNO.
        Returns [] gracefully if the table doesn't exist on this machine.
        """
        current_user_id = int(get_jwt_identity())
        current_user    = User.query.get_or_404(current_user_id)
        employee_code   = (current_user.emp_code or '').strip().upper()

        if not employee_code:
            return jsonify([]), 200

        try:
            rows = AcmsList2027.query.filter(
                func.upper(func.ltrim(func.rtrim(AcmsList2027.asset_custodian_ecno))) == employee_code
            ).all()
            result = []
            for r in rows:
                result.append({
                    'id':                  r.id,
                    'assetNumber':         r.asset_number,
                    'serialNumber':        r.serial_number,
                    'CATEGORY':            r.category,
                    'make':                r.make,
                    'model':               r.model,
                    'configuration':       r.configuration,
                    'networkDomain':       r.network_domain,
                    'ipAddress':           r.ip_address,
                    'Monitor':             r.monitor,
                    'AssetCustodianECNO':  r.asset_custodian_ecno,
                    'UserDivision':        r.user_division,
                    'GROUP':               r.group_name,
                    'AREA':                r.area,
                    'LOCATION':            r.location,
                    'acmsFms':             r.acms_fms,
                    'warranty':            r.warranty,
                    'fmsExpiryDate':       r.fms_expiry_date.isoformat() if r.fms_expiry_date else None,
                    'status':              r.status,
                })
            return jsonify(result), 200
        except Exception as e:
            print(f"[ACMS2027] Could not query dbo.ACMS_list_2027: {e}")
            return jsonify([]), 200


    @app.route('/api/assets/check-in-lists', methods=['GET'])
    @jwt_required()
    def check_serial_in_lists():
        """
        Check whether a given serial_number exists in
          dbo.ACMS_list_2026  (raw SQL — no model required)
          dbo.ACMS_list_2027  (via AcmsList2027 model)
        Returns:
          { "in_2026": true/false/null, "in_2027": true/false/null }
          null = table unreachable on this machine
        """
        serial_number = (request.args.get('serial_number') or '').strip()
        if not serial_number:
            return jsonify({'in_2026': None, 'in_2027': None}), 400

        # ── Check dbo.ACMS_list_2026 via raw SQL ─────────────────────────
        in_2026 = None
        try:
            count_2026 = db.session.execute(
                text(
                    "SELECT COUNT(*) FROM dbo.ACMS_list_2026 "
                    "WHERE serial_number = :sn"
                ),
                {'sn': serial_number}
            ).scalar()
            in_2026 = (count_2026 or 0) > 0
        except Exception as e:
            print(f"[CHECK-2026] Could not query dbo.ACMS_list_2026: {e}")
            in_2026 = None

        # ── Check dbo.ACMS_list_2027 via model ───────────────────────────
        in_2027 = None
        try:
            count_2027 = AcmsList2027.query.filter(
                AcmsList2027.serial_number == serial_number
            ).count()
            in_2027 = count_2027 > 0
        except Exception as e:
            print(f"[CHECK-2027] Could not query dbo.ACMS_list_2027: {e}")
            in_2027 = None

        return jsonify({'in_2026': in_2026, 'in_2027': in_2027}), 200


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

        # — Filter out assets already saved in dbo.assets (2026 ACMS list) OR ACMS_list_2027 —
        try:
            existing_serials = set()
            # 2026 ACMS list (dbo.assets)
            for row in Asset.query.with_entities(Asset.serial_number).all():
                if row.serial_number:
                    existing_serials.add(row.serial_number.strip())
            # 2027 ACMS list (dbo.ACMS_list_2027)
            for row in AcmsList2027.query.with_entities(AcmsList2027.serial_number).all():
                if row.serial_number:
                    existing_serials.add(row.serial_number.strip())
            remote_assets = [
                a for a in remote_assets
                if (a.get('serialNumber') or '').strip() not in existing_serials
            ]
        except Exception as fe:
            print(f'[WARN] Could not filter by ACMS lists: {fe}')  # table may not exist here

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

            # — Filter out serial numbers already in dbo.assets (2026) OR ACMS_list_2027 —
            try:
                existing_serials = set()
                # 2026 ACMS list (dbo.assets)
                for row in Asset.query.with_entities(Asset.serial_number).all():
                    if row.serial_number:
                        existing_serials.add(row.serial_number.strip())
                # 2027 ACMS list (dbo.ACMS_list_2027)
                for row in AcmsList2027.query.with_entities(AcmsList2027.serial_number).all():
                    if row.serial_number:
                        existing_serials.add(row.serial_number.strip())
                results = [
                    r for r in results
                    if (r.get('serialNumber') or '').strip() not in existing_serials
                ]
            except Exception as fe:
                print(f'[WARN] Could not filter search by ACMS lists: {fe}')

            return jsonify(results), 200

        except Exception as e:
            print(f"ERROR: TBST_ASSETS search failed: {e}")
            return jsonify({'error': str(e)}), 500

    # ===========================================================================
    # WHERE IS MY ASSET — search TBST_ASSETS by serial number (open to all users)
    # ===========================================================================
    @app.route('/api/assets/where-is-my-asset', methods=['GET'])
    @jwt_required()
    def where_is_my_asset():
        """
        Search TBST_ASSETS in the remote cowmis DB by EQSRLNO (serial number).
        Returns ASSETNO, EQSRLNO, EQPTDESCP, ACUSTODIAN.
        GET /api/assets/where-is-my-asset?q=SRL123
        """
        q = request.args.get('q', '').strip()
        if not q:
            return jsonify([]), 200

        remote_engine = db.engines.get('remote_pis')
        if not remote_engine:
            return jsonify({'error': 'Remote database (remote_pis) is not configured on this server.'}), 503

        try:
            query = text(f"""
                SELECT TOP 50
                    NULLIF(LTRIM(RTRIM(CAST([{COWMIS_ASSETNO_COL}]       AS NVARCHAR(255)))), '') AS asset_number,
                    NULLIF(LTRIM(RTRIM(CAST([{COWMIS_SERIAL_COL}]         AS NVARCHAR(255)))), '') AS serial_number,
                    NULLIF(LTRIM(RTRIM(CAST([{COWMIS_DESCRIPTION_COL}]    AS NVARCHAR(MAX)))),  '') AS configuration,
                    NULLIF(LTRIM(RTRIM(CAST([{COWMIS_CUSTODIAN_COL}]      AS NVARCHAR(50)))),  '') AS custodian
                FROM [{COWMIS_ASSETS_TABLE}]
                WHERE [{COWMIS_SERIAL_COL}] LIKE :q
                ORDER BY [{COWMIS_SERIAL_COL}]
            """)
            with remote_engine.connect() as conn:
                rows = conn.execute(query, {'q': f'%{q}%'}).mappings().all()

            results = [
                {
                    'id':           f'WIMA-{i+1}',
                    'assetNumber':  row.get('asset_number')  or '',
                    'serialNumber': row.get('serial_number') or '',
                    'description':  row.get('configuration') or '',
                    'custodian':    row.get('custodian')     or '',
                }
                for i, row in enumerate(rows)
            ]

            print(f"INFO: where-is-my-asset query='{q}' returned {len(results)} rows")
            return jsonify(results), 200

        except Exception as e:
            print(f"ERROR: where-is-my-asset search failed: {e}")
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
