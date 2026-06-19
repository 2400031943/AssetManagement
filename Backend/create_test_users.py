import sys
import os

# Ensure we can import app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from app import app, db
    from models import User
except ImportError as e:
    print(f"Error importing app: {e}")
    print("Please run this script from the same Python environment where your backend is installed.")
    sys.exit(1)

# ── Test users (local password = Test@123) ────────────────────────────────────
TEST_USERS = [
    {"username": "Normal User",      "emp_code": "NR00001", "role": "User",      "area": None,   "division": None},
    {"username": "Approver User",    "emp_code": "NR00002", "role": "User",      "area": None,   "division": None},
    {"username": "Area Focal Point", "emp_code": "NR00003", "role": "AreaAdmin", "area": "ITID", "division": "ITID"},
    {"username": "Admin User",       "emp_code": "NR00004", "role": "Admin",     "area": None,   "division": None},
]

# ── PIS-only admin accounts (NO local password — must use PIS credentials) ───
# These users authenticate via SPES_SLOGINCHECK only.
# Add any EC numbers here that should have Admin role.
PIS_ADMIN_USERS = [
    {"emp_code": "NR01849"},
]

def main():
    print("Connecting to database and setting up users...\n")
    with app.app_context():

        # ── 1. Test users with local password ────────────────────────────────
        print("── Test users (password: Test@123) ──")
        for d in TEST_USERS:
            u = User.query.filter_by(emp_code=d["emp_code"]).first()
            if not u:
                u = User(username=d["username"], emp_code=d["emp_code"])
                db.session.add(u)
                action = "Created"
            else:
                action = "Updated"
            u.role     = d["role"]
            u.area     = d["area"]
            u.division = d["division"]
            u.set_password("Test@123")
            print(f"  {action}: {d['emp_code']}  role={d['role']}")

        # ── 2. PIS-only admin users (no local password set) ───────────────────
        print("\n── PIS-only admin users (authenticate via PIS credentials) ──")
        for d in PIS_ADMIN_USERS:
            ec = d["emp_code"].strip().upper()
            u  = User.query.filter_by(emp_code=ec).first()
            if not u:
                u = User(username=ec, emp_code=ec)
                db.session.add(u)
                action = "Created"
            else:
                action = "Updated"
            u.role          = "Admin"
            u.password_hash = None   # force PIS-only login
            print(f"  {action}: {ec}  role=Admin  [PIS credentials only]")

        try:
            db.session.commit()
            print("\n✓ All users set up successfully.")
            print("\n  Test credentials (password: Test@123):")
            print("    NR00001  Normal User")
            print("    NR00002  Approver User")
            print("    NR00003  Area Focal Point (AreaAdmin)")
            print("    NR00004  Admin User")
            print("\n  PIS-only admin:")
            print("    NR01849  Admin  ← uses own PIS password")
        except Exception as e:
            db.session.rollback()
            print(f"\n✗ Failed to commit: {e}")

if __name__ == "__main__":
    main()
