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

users_data = [
    {"username": "Normal User", "emp_code": "NR00001", "role": "User", "area": None, "division": None},
    {"username": "Approver User", "emp_code": "NR00002", "role": "User", "area": None, "division": None},
    {"username": "Area Focal Point", "emp_code": "NR00003", "role": "AreaAdmin", "area": "ITID", "division": "ITID"},
    {"username": "Admin User", "emp_code": "NR00004", "role": "Admin", "area": None, "division": None}
]

def main():
    print("Connecting to database and setting up test users...")
    with app.app_context():
        for d in users_data:
            u = User.query.filter_by(emp_code=d["emp_code"]).first()
            if not u:
                u = User(username=d["username"], emp_code=d["emp_code"])
                db.session.add(u)
                action = "Created"
            else:
                action = "Updated"
            
            u.role = d["role"]
            u.area = d["area"]
            u.division = d["division"]
            u.set_password("Test@123")
            print(f"{action} user: {d['emp_code']} (Role: {d['role']})")
            
        try:
            db.session.commit()
            print("\nSuccessfully setup all 4 test users with password 'Test@123'.")
        except Exception as e:
            print(f"\nFailed to commit changes: {e}")

if __name__ == "__main__":
    main()
