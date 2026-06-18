from waitress import serve
from app import app  # Imports the Flask 'app' object from your app.py file

if __name__ == '__main__':
    print("======================================================")
    print(" Starting Waitress production server on port 5000...  ")
    print("======================================================")
    
    # serve(app, host, port, threads)
    # threads=6 handles 6 simultaneous HTTP requests
    serve(app, host='0.0.0.0', port=5000, threads=6)
