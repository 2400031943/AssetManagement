# Asset Management System

A full-stack Asset Management application with a React (Vite) frontend and a Python (Flask/SQLAlchemy) backend.

## Prerequisites
Before you start, make sure you have the following installed on your new PC:
1. **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
2. **Python** (v3.8 or higher) - [Download here](https://www.python.org/downloads/)
3. **Git** - [Download here](https://git-scm.com/downloads)
4. **Microsoft SQL Server** (if you plan to use the real database instead of mock data)

---

## Step 1: Clone the Repository
Open a terminal (or Command Prompt / PowerShell) and run:
```bash
git clone <YOUR_REPOSITORY_URL_HERE>
cd Asset_Management
```

---

## Step 2: Setup the Backend (Flask)

1. Open a terminal and navigate to the `Backend` folder:
   ```bash
   cd Backend
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   ```

3. Activate the virtual environment:
   - **Windows (PowerShell):** `.\venv\Scripts\Activate.ps1`
   - **Windows (CMD):** `.\.venv\Scripts\activate.bat`
   - **Mac/Linux:** `source venv/bin/activate`
   - ## .\.venv\Scripts\activate.bat

4. Install the required Python packages:
   ```bash
   pip install -r requirements.txt
   ```

5. Run the backend server:
   ```bash
   python app.py
   ```
   *The backend should now be running on `http://127.0.0.1:5000`*

---

## Step 3: Setup the Frontend (React/Vite)

1. Open a **new, separate terminal** and navigate to the `Frontend` folder:
   ```bash
   cd Frontend
   ```

2. Install the Node modules:
   ```bash
   npm install
   ```

3. Start the React development server:
   ```bash
   npm run dev
   ```
   *The frontend will typically open at `http://localhost:5173`*

---

## Step 4: Connecting to the Database (Optional)

By default, the application is set to use **Mock Data** so you can develop the UI without needing a database. 

If you want to connect to a real MS SQL Server on the new PC:
1. Create a database in your SQL Server named `AssetManagementDB`.
2. Open `Backend/.env` and update your SQL credentials:
   ```env
   DB_SERVER=localhost
   DB_NAME=AssetManagementDB
   DB_USER=sa
   DB_PASSWORD=YourStrong!Passw0rd
   ```
3. Open `Frontend/src/api.js` and change line 10 to `false`:
   ```javascript
   const USE_MOCK = false;
   ```
4. Restart your backend and frontend. The backend will automatically create the required database tables (`users`, `assets`) for you!
