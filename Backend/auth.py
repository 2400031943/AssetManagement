from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token
from sqlalchemy import text
from models import db, User

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

EMPLOYEE_PROFILE_VIEW        = 'VIEWEMPINFO'
EMPLOYEE_CODE_COLUMN        = 'EMPLOYEECODE'
EMPLOYEE_NAME_COLUMN        = 'EMPLOYEENAME'


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
    Returns dict with employeeCode and employeeName keys.
    """
    try:
        engine = db.engines['remote_pis']
        emp_code = emp_code.strip().upper()

        query = text(f"""
            SELECT TOP 1
                NULLIF(LTRIM(RTRIM(CAST([{EMPLOYEE_CODE_COLUMN}] AS NVARCHAR(50)))),  '') AS employee_code,
                NULLIF(LTRIM(RTRIM(CAST([{EMPLOYEE_NAME_COLUMN}] AS NVARCHAR(255)))), '') AS employee_name
            FROM [{EMPLOYEE_PROFILE_VIEW}]
            WHERE UPPER(LTRIM(RTRIM(CAST([{EMPLOYEE_CODE_COLUMN}] AS NVARCHAR(50))))) = :ec
        """)

        with engine.connect() as conn:
            row = conn.execute(query, {'ec': emp_code}).mappings().first()

        if not row:
            print(f"INFO: No profile found in {EMPLOYEE_PROFILE_VIEW} for {emp_code}")
            return {}

        return {
            'employeeCode': row.get('employee_code') or emp_code,
            'employeeName': row.get('employee_name') or emp_code,
            'EMPLOYEECODE': row.get('employee_code') or emp_code,
            'EMPLOYEENAME': row.get('employee_name') or emp_code,
        }
    except Exception as e:
        print(f"ERROR: fetch_employee_profile failed: {e}")
        return {}

@auth_bp.route('/login', methods=['POST'])
def login():
    """Authenticate a user via PIS Stored Procedure and return a JWT token."""
    data     = request.get_json()
    emp_code = data.get('emp_code', '').strip().upper()
    password = data.get('password', '')

    pis_verified = False
    remote_pis_available = False

    # 1. Try to verify via PIS Stored Procedure
    try:
        # The procedure takes both username and password
        # EXEC SPES_SLOGINCHECK 'NR1234', 'secret'
        engine = db.engines['remote_pis']
        with engine.connect() as conn:
            remote_pis_available = True
            result = conn.execute(
                text("EXEC SPES_SLOGINCHECK :u, :p"), 
                {"u": emp_code, "p": password}
            )
            row = result.fetchone()
            
        # The procedure returns 1 for success, 0 for failure
        if row and str(row[0]) == '1':
            pis_verified = True
        else:
            return jsonify({"error": "Invalid credentials or user not found in PIS system"}), 401

    except Exception as e:
        # Fallback if cowmis is unreachable
        print(f"PIS Stored Procedure failed: {e}")

        # Fallback to local database password check
        user = User.query.filter_by(emp_code=emp_code).first()
        if not user:
            return jsonify({"error": "User not found. Set a local password first via /api/debug/set-password"}), 401
        if not user.password_hash:
            return jsonify({"error": "No local password set. Call /api/debug/set-password to set one."}), 401
        if not user.check_password(password):
            return jsonify({"error": "Invalid local password"}), 401
        pis_verified = True

    # 2. If verified (via PIS or fallback), ensure user exists locally
    if pis_verified:
        user = User.query.filter_by(emp_code=emp_code).first()
        if not user:
            # Auto-create the user locally so we can assign assets to them
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
            "user": user_payload
        }), 200
