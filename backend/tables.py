import pyodbc

# 🟢 PASTE YOUR CREDENTIALS HERE
CONN_STR = (
    r'DRIVER={ODBC Driver 17 for SQL Server};'
    r'SERVER=139.99.183.1\SQL2019;'
    r'DATABASE=kailash_yogawalk;'
    r'UID=solomon.s;'
    r'PWD=87wbc9F_;'
)

try:
    print("🔌 Connecting to Database...")
    conn = pyodbc.connect(CONN_STR)
    cursor = conn.cursor()

    print("✅ Connection Successful! Fetching Tables...")
    
    # Query to get all table names
    cursor.execute("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'")
    
    tables = cursor.fetchall()
    
    if tables:
        print("\n--- 📂 TABLES FOUND ---")
        for table in tables:
            print(f" • {table[0]}")
    else:
        print("\n⚠️ No tables found. Did you run the setup.sql script?")

    conn.close()

except Exception as e:
    print(f"\n❌ Connection Failed: {e}")