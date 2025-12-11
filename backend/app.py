from flask import Flask, request, jsonify, g
from flask_cors import CORS
import pyodbc
from datetime import datetime

app = Flask(__name__)
CORS(app)

# --- DATABASE CONFIGURATION ---
# 🟢 ACTION REQUIRED: Enter your SQL Server credentials inside the quotes below.
CONN_STR = (
    r'DRIVER={ODBC Driver 17 for SQL Server};'
    r'SERVER=139.99.183.1\SQL2019;'
    r'DATABASE=kailash_yogawalk;'
    r'UID=solomon.s;'  # <-- Put your Username here
    r'PWD=87wbc9F_;'  # <-- Put your Password here
)

def get_db():
    """Opens a new database connection if there is none for the current context."""
    if 'db' not in g:
        try:
            g.db = pyodbc.connect(CONN_STR)
        except Exception as e:
            print(f"❌ Database Connection Error: {e}")
            return None
    return g.db

@app.teardown_appcontext
def close_db(error):
    """Closes the database connection at the end of the request."""
    db = g.pop('db', None)
    if db is not None:
        db.close()

# --- HELPER FUNCTIONS ---

def generate_checkpoints(origin, destination, count):
    """Generates simple linear checkpoints between origin and destination."""
    checkpoints = []
    for i in range(count):
        checkpoints.append({
            "id": i + 1,
            "label": f"Checkpoint {i + 1}",
            "lat": origin["lat"],
            "lng": origin["lng"],
        })
    return checkpoints

# --- ROUTES ---

@app.route("/api/poses", methods=["GET"])
def get_all_poses():
    """Fetches all yoga poses for the Library Page."""
    conn = get_db()
    if not conn:
        return jsonify({"error": "Database not connected"}), 500
    
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, instructions, benefits, animation_url FROM poses")
        
        # Convert list of tuples to list of dictionaries
        columns = [column[0] for column in cursor.description]
        results = [dict(zip(columns, row)) for row in cursor.fetchall()]
        
        return jsonify(results)
    except Exception as e:
        print(f"❌ Error fetching poses: {e}")
        return jsonify({"error": str(e)}), 500

@app.route("/api/journey", methods=["POST"])
def create_journey():
    """Generates a route and assigns random yoga poses from the DB to checkpoints."""
    data = request.get_json()

    origin = data.get("origin")
    destination = data.get("destination")
    checkpoint_count = data.get("checkpoint_count", 5)

    if not origin or not destination:
        return jsonify({"error": "origin and destination required"}), 400

    # 1. Generate geographic points (placeholder logic)
    checkpoints = generate_checkpoints(origin, destination, checkpoint_count)

    # 2. Fetch Random Poses from SQL Server
    conn = get_db()
    
    # Default fallback pose in case DB fails or is empty
    fallback_pose = {
        "name": "Deep Breathing", 
        "duration": "1 min", 
        "benefits": "Relaxes the mind.",
        "instructions": "Inhale deeply, exhale slowly.",
        "gif": "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjEx/placeholder.gif"
    }

    if conn:
        try:
            cursor = conn.cursor()
            # Select random poses
            query = f"SELECT TOP {checkpoint_count} name, benefits, instructions, animation_url FROM poses ORDER BY NEWID()"
            cursor.execute(query)
            
            columns = [column[0] for column in cursor.description]
            random_poses = [dict(zip(columns, row)) for row in cursor.fetchall()]

            # Assign poses to checkpoints
            for i, cp in enumerate(checkpoints):
                if i < len(random_poses):
                    pose = random_poses[i]
                    cp["exercise"] = {
                        "name": pose["name"],
                        "duration": "30 sec", 
                        "benefits": pose["benefits"], 
                        "instructions": pose["instructions"],
                        "gif": pose["animation_url"] or fallback_pose["gif"]
                    }
                else:
                    cp["exercise"] = fallback_pose
        except Exception as e:
            print(f"⚠️ Journey Poses Warning: {e}")
            # If query fails, use fallback for all
            for cp in checkpoints:
                cp["exercise"] = fallback_pose
    else:
        # If no DB connection, use fallback
        for cp in checkpoints:
            cp["exercise"] = fallback_pose

    return jsonify({"route": [], "checkpoints": checkpoints})

@app.route("/api/walk_complete", methods=["POST"])
def walk_complete():
    """Receives walk metrics and saves them to the WalkHistory table."""
    print("📥 Receiving Walk Data...") # Debug log
    
    try:
        data = request.get_json()
        
        # 1. Input Validation
        required = ["distance_km", "duration_seconds", "checkpoints_completed"]
        if not all(field in data for field in required):
            print("❌ Missing fields in payload")
            return jsonify({"error": "Missing required walk metrics."}), 400

        # 2. Data Preparation
        distance = float(data["distance_km"])
        duration_min = int(data["duration_seconds"]) // 60
        poses_done = int(data["checkpoints_completed"])
        
        # Estimations (approximate values)
        steps_est = int(distance * 1250)
        calories_est = int(distance * 60)

        # 3. Database Insert
        conn = get_db()
        if not conn:
            print("❌ No DB Connection available for save")
            return jsonify({"error": "Database connection failed"}), 500

        cursor = conn.cursor()
        
        # Ensure these column names match your CREATE TABLE script
        SQL_INSERT = """
            INSERT INTO WalkHistory 
            (DistanceKm, DurationMinutes, CaloriesBurned, PosesCompleted, StepsEstimated, Notes)
            VALUES (?, ?, ?, ?, ?, ?)
        """
        
        cursor.execute(SQL_INSERT, distance, duration_min, calories_est, poses_done, steps_est, 'Yoga Walk Session')
        conn.commit()

        # 4. Get the new WalkID
        cursor.execute("SELECT @@IDENTITY")
        row = cursor.fetchone()
        walk_id = row[0] if row else 0

        print(f"✅ Walk Saved Successfully! ID: {walk_id}")

        return jsonify({
            "message": "Walk metrics successfully recorded!",
            "walk_id": walk_id,
            "stats": {
                "calories": calories_est,
                "steps": steps_est
            }
        }), 201

    except pyodbc.Error as ex:
        print(f"❌ SQL Error: {ex}")
        return jsonify({"error": "Database error occurred."}), 500
    except Exception as e:
        print(f"❌ General Error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route("/api/walk_history", methods=["GET"])
def get_walk_history():
    """Fetches history of completed walks, newest first."""
    conn = get_db()
    if not conn:
        return jsonify({"error": "Database not connected"}), 500
    
    try:
        cursor = conn.cursor()
        query = """
            SELECT WalkID, WalkDate, DistanceKm, DurationMinutes, 
                   CaloriesBurned, PosesCompleted, StepsEstimated 
            FROM WalkHistory 
            ORDER BY WalkDate DESC
        """
        cursor.execute(query)
        
        columns = [column[0] for column in cursor.description]
        history = []
        for row in cursor.fetchall():
            record = dict(zip(columns, row))
            # Format datetime object to string for JSON serialization
            if record['WalkDate']:
                record['WalkDate'] = record['WalkDate'].isoformat()
            history.append(record)
            
        return jsonify({
            "count": len(history), 
            "history": history
        })
        
    except Exception as e:
        print(f"❌ History Fetch Error: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True)