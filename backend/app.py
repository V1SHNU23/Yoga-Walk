from flask import Flask, request, jsonify, g
from flask_cors import CORS
import pyodbc
from datetime import datetime

app = Flask(__name__)
CORS(app)

# --- DATABASE CONFIGURATION ---
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
            print(f"❌ Database Connection Error: {e}")
            return None
    return g.db

@app.teardown_appcontext
def close_db(error):
    db = g.pop('db', None)
    if db is not None:
        db.close()

# --- HELPER FUNCTIONS ---
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

# --- ROUTES ---

@app.route("/api/poses", methods=["GET"])
def get_all_poses():
    conn = get_db()
    if not conn: return jsonify({"error": "Database not connected"}), 500
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, instructions, benefits, animation_url FROM poses")
        columns = [column[0] for column in cursor.description]
        results = [dict(zip(columns, row)) for row in cursor.fetchall()]
        return jsonify(results)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/themes", methods=["GET"])
def get_themes():
    conn = get_db()
    if not conn: return jsonify({"error": "Database not connected"}), 500
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT ThemeID, Title FROM WalkThemes")
        themes = [{"id": row.ThemeID, "title": row.Title} for row in cursor.fetchall()]
        return jsonify(themes)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/theme/<int:theme_id>/questions", methods=["GET"])
def get_theme_questions(theme_id):
    conn = get_db()
    try:
        cursor = conn.cursor()
        query = "SELECT TOP 5 QuestionText FROM ReflectionQuestions WHERE ThemeID = ? ORDER BY NEWID()"
        cursor.execute(query, theme_id)
        questions = [row.QuestionText for row in cursor.fetchall()]
        return jsonify(questions)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/journey", methods=["POST"])
def create_journey():
    data = request.get_json()
    origin = data.get("origin")
    destination = data.get("destination")
    checkpoint_count = data.get("checkpoint_count", 5)

    if not origin or not destination:
        return jsonify({"error": "origin and destination required"}), 400

    checkpoints = generate_checkpoints(origin, destination, checkpoint_count)
    conn = get_db()
    
    fallback_pose = {
        "name": "Deep Breathing", "duration": "1 min", "benefits": "Relaxes the mind.",
        "instructions": "Inhale deeply, exhale slowly.",
        "gif": "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjEx/placeholder.gif"
    }

    if conn:
        try:
            cursor = conn.cursor()
            query = f"SELECT TOP {checkpoint_count} name, benefits, instructions, animation_url FROM poses ORDER BY NEWID()"
            cursor.execute(query)
            columns = [column[0] for column in cursor.description]
            random_poses = [dict(zip(columns, row)) for row in cursor.fetchall()]

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
            print(f"⚠️ Journey Warning: {e}")
            for cp in checkpoints: cp["exercise"] = fallback_pose
    else:
        for cp in checkpoints: cp["exercise"] = fallback_pose

    return jsonify({"route": [], "checkpoints": checkpoints})

# --- 🟢 CRITICAL UPDATE: WALK COMPLETE (Saves Reflections) ---
@app.route("/api/walk_complete", methods=["POST"])
def walk_complete():
    print("📥 Receiving Walk Data...") 
    try:
        data = request.get_json()
        
        distance = float(data["distance_km"])
        duration_min = int(data["duration_seconds"]) // 60
        poses_done = int(data["checkpoints_completed"])
        steps_est = int(distance * 1250)
        calories_est = int(distance * 60)
        
        # 1. Extract Reflections from Frontend
        reflections = data.get("reflections_data", [])

        conn = get_db()
        cursor = conn.cursor()
        
        # 2. Insert Main Walk Data
        SQL_INSERT = """
            INSERT INTO WalkHistory 
            (DistanceKm, DurationMinutes, CaloriesBurned, PosesCompleted, StepsEstimated, Notes)
            VALUES (?, ?, ?, ?, ?, ?)
        """
        cursor.execute(SQL_INSERT, distance, duration_min, calories_est, poses_done, steps_est, 'Yoga Walk Session')
        
        cursor.execute("SELECT @@IDENTITY")
        row = cursor.fetchone()
        walk_id = row[0] if row else 0

        # 3. Insert Reflections into WalkReflections Table
        if reflections and walk_id:
            print(f"   📝 Saving {len(reflections)} reflections...")
            reflection_rows = []
            for item in reflections:
                q_text = item.get("question", "Reflection")
                a_text = item.get("answer", "")
                if a_text: 
                    reflection_rows.append((walk_id, q_text, a_text))
            
            if reflection_rows:
                cursor.executemany("""
                    INSERT INTO WalkReflections (WalkID, QuestionText, AnswerText)
                    VALUES (?, ?, ?)
                """, reflection_rows)

        conn.commit()
        print(f"✅ Walk Saved Successfully! ID: {walk_id}")
        return jsonify({"message": "Saved", "walk_id": walk_id}), 201

    except Exception as e:
        print(f"❌ Error: {e}")
        return jsonify({"error": str(e)}), 500

# --- 🟢 CRITICAL UPDATE: NEW ENDPOINT (Fetches Reflections) ---
@app.route("/api/walk/<int:walk_id>/reflections", methods=["GET"])
def get_walk_reflections(walk_id):
    """Fetches the Q&A for a specific walk."""
    conn = get_db()
    if not conn: return jsonify({"error": "Database not connected"}), 500
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT QuestionText, AnswerText FROM WalkReflections WHERE WalkID = ?", walk_id)
        
        data = []
        for row in cursor.fetchall():
            data.append({"question": row.QuestionText, "answer": row.AnswerText})
            
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/walk_history", methods=["GET"])
def get_walk_history():
    conn = get_db()
    if not conn: return jsonify({"error": "Database not connected"}), 500
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
            if record['WalkDate']: record['WalkDate'] = record['WalkDate'].isoformat()
            history.append(record)
        return jsonify({"count": len(history), "history": history})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0', port=5000)  # Allow network access for mobile testing