from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from sqlalchemy import text
from models import db, User

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

EMPLOYEE_PROFILE_VIEW        = 'VIEWEMPINFO'
EMPLOYEE_CODE_COLUMN        = 'EMPLOYEECODE'
EMPLOYEE_NAME_COLUMN        = 'EMPLOYEENAME'
EMPLOYEE_DESIG_COLUMN       = 'DESGFULLNAME'


def _quote_identifier(identifier):
    return f"[{identifier.replace(']', ']]')}]"


def _find_column(columns, candidates):
    columns_by_upper = {column.upper(): column for column in columns}
    for candidate in candidates:
        match = columns_by_upper.get(candidate.upper())
        if match:
            return match
    return None


def _query_employee_profile(conn, emp_code, schema_name, emp_code_column, employee_name_column, designation_column):
    table_name = _quote_identifier(EMPLOYEE_PROFILE_VIEW)
    if schema_name:
        table_name = f"{_quote_identifier(schema_name)}.{table_name}"

    query = text(f"""
        SELECT TOP 1
            NULLIF(LTRIM(RTRIM(CAST({_quote_identifier(employee_name_column)} AS NVARCHAR(255)))), '') AS employee_name,
            NULLIF(LTRIM(RTRIM(CAST({_quote_identifier(designation_column)} AS NVARCHAR(255)))), '') AS designation
        FROM {table_name}
        WHERE UPPER(LTRIM(RTRIM(CAST({_quote_identifier(emp_code_column)} AS NVARCHAR(50))))) = :emp_code
    """)
    row = conn.execute(query, {"emp_code": emp_code}).mappings().first()
    if not row:
        return {}

    employee_name = row.get("employee_name")
    designation = row.get("designation")
    return {
        "employeeName": employee_name,
        "designation": designation,
        "EMPLOYEENAME": employee_name,
        "DESGFULLNAME": designation,
    }


def fetch_employee_profile(emp_code):
    """
    Fetch EMPLOYEECODE and EMPLOYEENAME from VIEWEMPINFO in the remote cowmis DB.
    Also fetches the FUNCDESGCODE from TBAD_EMPFUNCDESG_VIEW.
    Returns dict with employeeCode, employeeName, and funcdesgcode keys.
    """
    try:
        engine = db.engines['remote_pis']
        emp_code = emp_code.strip().upper()

        query = text(f"""
            SELECT TOP 1
                NULLIF(LTRIM(RTRIM(CAST([{EMPLOYEE_CODE_COLUMN}] AS NVARCHAR(50)))),  '') AS employee_code,
                NULLIF(LTRIM(RTRIM(CAST([{EMPLOYEE_NAME_COLUMN}] AS NVARCHAR(255)))), '') AS employee_name,
                NULLIF(LTRIM(RTRIM(CAST([{EMPLOYEE_DESIG_COLUMN}] AS NVARCHAR(255)))), '') AS designation
            FROM [{EMPLOYEE_PROFILE_VIEW}]
            WHERE UPPER(LTRIM(RTRIM(CAST([{EMPLOYEE_CODE_COLUMN}] AS NVARCHAR(50))))) = :ec
        """)

        employee_code = emp_code
        employee_name = emp_code
        designation = ''
        funcdesgcode = None

        with engine.connect() as conn:
            row = conn.execute(query, {'ec': emp_code}).mappings().first()
            if row:
                employee_code = row.get('employee_code') or emp_code
                employee_name = row.get('employee_name') or emp_code
                designation = row.get('designation') or ''

            # Also fetch the FUNCDESGCODE from TBAD_EMPFUNCDESG_VIEW
            try:
                query_func = text("""
                    SELECT TOP 1 FUNCDESGCODE 
                    FROM TBAD_EMPFUNCDESG_VIEW 
                    WHERE UPPER(LTRIM(RTRIM(CAST(EMPLOYEECODE AS NVARCHAR(50))))) = :ec
                """)
                row_func = conn.execute(query_func, {'ec': emp_code}).mappings().first()
                if row_func:
                    # Could be int, float, or string. Convert to int if possible.
                    raw_val = row_func.get('FUNCDESGCODE')
                    if raw_val is not None:
                        try:
                            funcdesgcode = int(float(raw_val))
                        except (ValueError, TypeError):
                            funcdesgcode = raw_val
            except Exception as ex:
                print(f"INFO: Could not fetch FUNCDESGCODE from TBAD_EMPFUNCDESG_VIEW: {ex}")

        return {
            'employeeCode':        employee_code,
            'employeeName':        employee_name,
            'employeeDesignation': designation,
            'EMPLOYEECODE':        employee_code,
            'EMPLOYEENAME':        employee_name,
            'DESGFULLNAME':        designation,
            'funcdesgcode':        funcdesgcode,
        }
    except Exception as e:
        print(f"ERROR: fetch_employee_profile failed: {e}")
        return {}

@auth_bp.route('/login', methods=['POST'])
def login():
    """Authenticate a user via PIS Stored Procedure and return a JWT token.
    
    Priority order:
      1. If the user exists locally with a password_hash set → authenticate locally
         (covers test users created by create_test_users.py, always works)
      2. Otherwise → verify via PIS Stored Procedure (SPES_SLOGINCHECK)
      3. If PIS is unreachable → reject (no local password set to fall back to)
    """
    data     = request.get_json()
    emp_code = data.get('emp_code', '').strip().upper()
    password = data.get('password', '')

    pis_verified         = False
    remote_pis_available = False

    # ── Step 1: Check for a locally stored password first ────────────────────
    # This handles test accounts (create_test_users.py) and works regardless
    # of whether the remote PIS system is reachable.
    local_user = User.query.filter_by(emp_code=emp_code).first()
    if local_user and local_user.password_hash:
        if not local_user.check_password(password):
            return jsonify({"error": "Invalid credentials"}), 401
        # Local password matched — skip PIS entirely
        pis_verified = True
        print(f"[INFO] Login: local password auth succeeded for {emp_code}")

    # ── Step 2: If no local password, verify via PIS Stored Procedure ────────
    if not pis_verified:
        try:
            engine = db.engines['remote_pis']
            with engine.connect() as conn:
                remote_pis_available = True
                result = conn.execute(
                    text("EXEC SPES_SLOGINCHECK :u, :p"),
                    {"u": emp_code, "p": password}
                )
                row = result.fetchone()

            if row and str(row[0]) == '1':
                pis_verified = True
                print(f"[INFO] Login: PIS auth succeeded for {emp_code}")
            else:
                return jsonify({"error": "Invalid credentials or user not found in PIS system"}), 401

        except Exception as e:
            print(f"[WARN] PIS Stored Procedure unreachable: {e}")
            # Remote DB is offline and no local password exists
            return jsonify({"error": "Authentication service unavailable. Contact administrator."}), 503

    # ── Step 3: Auth succeeded — ensure user record exists locally ───────────
    if pis_verified:
        user = User.query.filter_by(emp_code=emp_code).first()
        if not user:
            user = User(username=emp_code, emp_code=emp_code, role='User')
            db.session.add(user)
            db.session.commit()

        employee_profile = fetch_employee_profile(emp_code) if remote_pis_available else {}

        user_payload = {
            **user.to_dict(),
            **employee_profile,
        }

        token = create_access_token(identity=str(user.id))
        return jsonify({
            "token": token,
            "user":  user_payload
        }), 200



@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user_profile():
    """Get the current logged in user's profile details including dynamic remote DB info."""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(int(user_id))
        if not user:
            return jsonify({"error": "User not found"}), 404

        profile = {}
        # Try to query remote PIS profile info
        try:
            profile = fetch_employee_profile(user.emp_code)
        except Exception as e:
            print(f"ERROR: fetch_employee_profile failed in /me: {e}")

        user_payload = {
            **user.to_dict(),
            **profile,
        }
        return jsonify(user_payload), 200
    except Exception as e:
        print(f"ERROR: /me endpoint failed: {e}")
        return jsonify({"error": str(e)}), 500
