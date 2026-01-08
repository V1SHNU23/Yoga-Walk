import pyodbc
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# 1. Credentials (Loaded securely)
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

    print("\n" + "="*50)
    print(" 📋 ALL ROUTINES IN DATABASE")
    print("="*50)

    # 1. Select all routines
    cursor.execute("SELECT RoutineID, Name, Description, Duration, CreatedAt FROM Routines ORDER BY CreatedAt DESC")
    routines = cursor.fetchall()
    
    if not routines:
        print("⚠️ No routines found in the 'Routines' table.")
    else:
        for r in routines:
            r_id = r.RoutineID
            print(f"\n🔹 [ID: {r_id}] {r.Name}")
            print(f"    • Description: {r.Description}")
            print(f"    • Total Duration: {r.Duration}")
            print(f"    • Created: {r.CreatedAt}")
            
            # 2. Fetch specific poses for this routine
            print("    🧘 INCLUDED POSES:")
            cursor.execute("""
                SELECT OrderIndex, PoseName, Duration 
                FROM RoutinePoses 
                WHERE RoutineID = ? 
                ORDER BY OrderIndex ASC
            """, r_id)
            
            poses = cursor.fetchall()
            if poses:
                for p in poses:
                    # p[0]=Index, p[1]=Name, p[2]=Duration
                    print(f"       {p[0]+1}. {p[1]} ({p[2]})")
            else:
                print("       (No poses attached to this routine)")
                
            print("-" * 50)

    conn.close()
    print("\n✅ Done.")

except Exception as e:
    print(f"\n❌ Database Error: {e}")