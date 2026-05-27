from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token
from sqlalchemy import text
from models import db, User

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@auth_bp.route('/login', methods=['POST'])
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
        engine = db.engines['remote_pis']
        with engine.connect() as conn:
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
