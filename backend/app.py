from flask import Flask, request, jsonify, g
from flask_cors import CORS
import random
import pyodbc

app = Flask(__name__)
CORS(app)

# --- DATABASE CONFIGURATION ---
# Update this to match your SQL Server details
CONN_STR = (
    r'DRIVER={ODBC Driver 17 for SQL Server};'
    r'SERVER=139.99.183.1\SQL2019;'
    r'DATABASE=kailash_yogawalk;'
    r'UID=solomon.s;'
    r'PWD=87wbc9F_;'
)

def get_db():
    if 'db' not in g:
        try:
            g.db = pyodbc.connect(CONN_STR)
        except Exception as e:
            print(f"Database connection error: {e}")
            return None
    return g.db

@app.teardown_appcontext
def close_db(error):
    db = g.pop('db', None)
    if db is not None:
        db.close()

# --- ROUTES ---

@app.route("/api/poses", methods=["GET"])
def get_all_poses():
    """Fetches all poses for the Library Page"""
    conn = get_db()
    if not conn:
        return jsonify({"error": "Database not connected"}), 500
    
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, instructions, benefits, animation_url FROM poses")
    
    # Convert rows to list of dicts
    columns = [column[0] for column in cursor.description]
    results = []
    for row in cursor.fetchall():
        results.append(dict(zip(columns, row)))
        
    return jsonify(results)

def generate_checkpoints(origin, destination, count):
    checkpoints = []
    for i in range(count):
        checkpoints.append({
            "id": i + 1,
            "label": f"Checkpoint {i + 1}",
            "lat": origin["lat"],
            "lng": origin["lng"],
        })
    return checkpoints

# backend/app.py

# ... (Keep your imports and get_db logic) ...

# Remove or comment out the old hardcoded YOGA_EXERCISES list if it's still there.

@app.route("/api/journey", methods=["POST"])
def create_journey():
    data = request.get_json()

    origin = data.get("origin")
    destination = data.get("destination")
    # Default to 5 checkpoints if not specified
    checkpoint_count = data.get("checkpoint_count", 5)

    if not origin or not destination:
        return jsonify({"error": "origin and destination required"}), 400

    # 1. Generate the geographic points (Keep your existing logic for this)
    checkpoints = generate_checkpoints(origin, destination, checkpoint_count)

    # 2. Fetch Random Poses from SQL Server
    conn = get_db()
    if conn:
        cursor = conn.cursor()
        # MSSQL Query: Get 'checkpoint_count' random rows
        # We fetch name, benefits, instructions, and animation_url
        query = f"SELECT TOP {checkpoint_count} name, benefits, instructions, animation_url FROM poses ORDER BY NEWID()"
        cursor.execute(query)
        
        # Convert to a list of dictionaries
        columns = [column[0] for column in cursor.description]
        random_poses = [dict(zip(columns, row)) for row in cursor.fetchall()]

        # 3. Assign Poses to Checkpoints
        for i, cp in enumerate(checkpoints):
            if i < len(random_poses):
                pose = random_poses[i]
                cp["exercise"] = {
                    "name": pose["name"],
                    "duration": "30 sec", # We can add this to DB later, default for now
                    "benefits": pose["benefits"], 
                    "instructions": pose["instructions"],
                    # Use DB animation or a fallback GIF if empty
                    "gif": pose["animation_url"] or "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjEx/placeholder.gif"
                }
            else:
                # Fallback if we run out of poses in the DB
                cp["exercise"] = {"name": "Deep Breathing", "duration": "1 min", "gif": "", "benefits": "Relaxes the mind."}
    else:
        return jsonify({"error": "Database connection failed"}), 500

    return jsonify({"route": [], "checkpoints": checkpoints})

if __name__ == "__main__":
    app.run(debug=True)