from flask import Flask, request, jsonify
from flask_cors import CORS
import random

app = Flask(__name__)
CORS(app)

YOGA_EXERCISES = [
    {"name": "Mountain pose", "duration": "30 seconds"},
    {"name": "Tree pose", "duration": "30 seconds"},
    {"name": "Warrior two", "duration": "30 seconds"},
    {"name": "Cat cow", "duration": "5 breaths"},
    {"name": "Forward fold", "duration": "30 seconds"},
]


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


@app.route("/api/journey", methods=["POST"])
def create_journey():
    data = request.get_json()

    origin = data.get("origin")
    destination = data.get("destination")
    checkpoint_count = data.get("checkpoint_count", 5)

    if not origin or not destination:
        return jsonify({"error": "origin and destination required"}), 400

    checkpoints = generate_checkpoints(origin, destination, checkpoint_count)

    for c in checkpoints:
        c["exercise"] = random.choice(YOGA_EXERCISES)

    return jsonify({
        "origin": origin,
        "destination": destination,
        "checkpoints": checkpoints,
    })


if __name__ == "__main__":
    app.run(debug=True)
