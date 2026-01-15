import json
import os
import pyodbc
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

CONN_STR = (
    r'DRIVER={ODBC Driver 17 for SQL Server};'
    f'SERVER={os.getenv("DB_SERVER")};'
    f'DATABASE={os.getenv("DB_DATABASE")};'
    f'UID={os.getenv("DB_USER")};'
    f'PWD={os.getenv("DB_PASSWORD")};'
)

try:
    print("🔌 Connecting to Database...")
    conn = pyodbc.connect(CONN_STR)
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, name, note, destination_lat, destination_lng,
               destination_label, routes_json, active_route_index, created_at
        FROM saved_routes
        ORDER BY created_at DESC
    """)
    rows = cursor.fetchall()

    print(f"\n--- 🧭 SAVED ROUTES ({len(rows)}) ---")
    if not rows:
        print("⚠️ No saved routes found.")
    else:
        for row in rows:
            try:
                routes = json.loads(row.routes_json) if row.routes_json else []
            except Exception:
                routes = []

            created_at = row.created_at.isoformat() if row.created_at else "-"
            print(f"ID: {row.id}  |  {row.name}")
            if row.note:
                print(f"Note: {row.note}")
            print(f"Destination: {row.destination_label}")
            print(f"Coords: {row.destination_lat:.6f}, {row.destination_lng:.6f}")
            print(f"Routes: {len(routes)}  |  Active Index: {row.active_route_index}")
            print(f"Created: {created_at}")
            print("-" * 48)

    conn.close()
except Exception as e:
    print(f"\n❌ Error: {e}")
