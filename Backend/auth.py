from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token
from sqlalchemy import text
from models import db, User

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

EMPLOYEE_PROFILE_VIEW = 'TBAD_EMPFUNCDESG_VIEW'
EMPLOYEE_NAME_COLUMN = 'EMPLOYEENAME'
EMPLOYEE_DESIGNATION_COLUMN = 'DESGFULLNAME'
EMPLOYEE_CODE_COLUMN_CANDIDATES = (
    'ECNO',
    'EC_NO',
    'EMPCODE',
    'EMP_CODE',
    'EMPCD',
    'EMP_CD',
    'EMPLOYEECODE',
    'EMPLOYEE_CODE',
    'EMPLOYEECD',
    'EMPLOYEE_CD',
    'EMPLOYEENO',
    'EMPLOYEE_NO',
    'EMPLOYEENUMBER',
    'EMPLOYEE_NUMBER',
    'EMPNO',
    'EMP_NO',
    'EMPNUMBER',
    'EMP_NUMBER',
    'EMPID',
    'EMP_ID',
    'USERID',
    'USER_ID',
    'LOGINID',
    'LOGIN_ID',
)


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

    return {
        "employeeName": row.get("employee_name"),
        "designation": row.get("designation"),
    }


def fetch_employee_profile(emp_code):
    """Fetch employee display data from the remote PIS view for the footer."""
    engine = db.engines['remote_pis']
    emp_code = emp_code.strip().upper()
    fallback_schemas = [None]

    try:
        with engine.connect() as conn:
            columns = conn.execute(
                text("""
                    SELECT TABLE_SCHEMA, COLUMN_NAME
                    FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE UPPER(TABLE_NAME) = :view_name
                    ORDER BY TABLE_SCHEMA, ORDINAL_POSITION
                """),
                {"view_name": EMPLOYEE_PROFILE_VIEW}
            ).mappings().all()

        columns_by_schema = {}
        for column in columns:
            columns_by_schema.setdefault(column["TABLE_SCHEMA"], []).append(column["COLUMN_NAME"])
        fallback_schemas = list(columns_by_schema.keys()) or [None]

        for schema_name, schema_columns in columns_by_schema.items():
            emp_code_column = _find_column(schema_columns, EMPLOYEE_CODE_COLUMN_CANDIDATES)
            employee_name_column = _find_column(schema_columns, (EMPLOYEE_NAME_COLUMN,))
            designation_column = _find_column(schema_columns, (EMPLOYEE_DESIGNATION_COLUMN,))

            if not (emp_code_column and employee_name_column and designation_column):
                continue

            with engine.connect() as conn:
                profile = _query_employee_profile(
                    conn,
                    emp_code,
                    schema_name,
                    emp_code_column,
                    employee_name_column,
                    designation_column,
                )
            if profile:
                return profile
    except Exception as e:
        print(f"Employee profile lookup via metadata failed: {e}")

    # Fallback for environments where INFORMATION_SCHEMA is restricted.
    for schema_name in fallback_schemas:
        for emp_code_column in EMPLOYEE_CODE_COLUMN_CANDIDATES:
            try:
                with engine.connect() as conn:
                    profile = _query_employee_profile(
                        conn,
                        emp_code,
                        schema_name,
                        emp_code_column,
                        EMPLOYEE_NAME_COLUMN,
                        EMPLOYEE_DESIGNATION_COLUMN,
                    )
                if profile:
                    return profile
            except Exception:
                continue

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
            result = conn.execute(
                text("EXEC SPES_SLOGINCHECK :u, :p"), 
                {"u": emp_code, "p": password}
            )
            row = result.fetchone()
            remote_pis_available = True
            
        # The procedure returns 1 for success, 0 for failure
        if row and str(row[0]) == '1':
            pis_verified = True
        else:
            return jsonify({"error": "Invalid credentials or user not found in PIS system"}), 401

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
