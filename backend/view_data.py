import pyodbc
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# 🟢 CREDENTIALS (SECURE)
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

    # 1. Check Walk History
    print("\n--- 🚶 RECENT WALKS (Top 5) ---")
    cursor.execute("SELECT TOP 5 WalkID, DistanceKm, DurationMinutes, WalkDate FROM WalkHistory ORDER BY WalkDate DESC")
    rows = cursor.fetchall()
    
    if rows:
        print(f"{'ID':<5} | {'Dist (km)':<10} | {'Mins':<6} | {'Date'}")
        print("-" * 45)
        for row in rows:
            # Row index: 0=ID, 1=Dist, 2=Dur, 3=Date
            print(f"{row[0]:<5} | {row[1]:<10} | {row[2]:<6} | {row[3]}")
    else:
        print("⚠️ No walks found in history.")

    # 2. Check Yoga Poses
    print("\n--- 🧘 YOGA POSES CHECK ---")
    cursor.execute("SELECT COUNT(*) FROM poses")
    count = cursor.fetchone()[0]
    print(f"✅ Total Poses in Library: {count}")

    conn.close()

except Exception as e:
    print(f"\n❌ Error: {e}")