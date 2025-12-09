import pyodbc
import csv
import os

# --- CONFIGURE YOUR CONNECTION ---
CONN_STR = (
    r'DRIVER={ODBC Driver 17 for SQL Server};'
    r'SERVER=139.99.183.1\SQL2019;'
    r'DATABASE=kailash_yogawalk;'
    r'UID=solomon.s;'
    r'PWD=87wbc9F_;'
)

def init_db():
    try:
        conn = pyodbc.connect(CONN_STR)
        cursor = conn.cursor()
        
        # 1. Clean start: Drop the table if it exists (Works on SQL Server 2016+)
        print("🔄 Resetting database table...")
        cursor.execute("DROP TABLE IF EXISTS poses")

        # 2. Create the Poses table
        cursor.execute('''
            CREATE TABLE poses (
                id INT IDENTITY(1,1) PRIMARY KEY,
                name NVARCHAR(100) NOT NULL,
                instructions NVARCHAR(MAX),
                benefits NVARCHAR(MAX),
                animation_url NVARCHAR(255)
            )
        ''')
        
        conn.commit()
        print("✅ Table 'poses' created successfully.")
        return conn
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return None

def seed_data(conn):
    cursor = conn.cursor()
    
    # Locate the CSV file relative to this script
    current_dir = os.path.dirname(os.path.abspath(__file__))
    csv_path = os.path.join(current_dir, 'poses.csv')
    
    print(f"📂 Reading data from: {csv_path}")

    try:
        with open(csv_path, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            
            rows_to_insert = []
            for row in reader:
                rows_to_insert.append((
                    row['Exercise'], 
                    row['How to do the exercise'], 
                    row['Benefits'], 
                    row.get('Animation', '') # Handle missing animation column safely
                ))
            
            # Execute insert
            cursor.executemany('''
                INSERT INTO poses (name, instructions, benefits, animation_url)
                VALUES (?, ?, ?, ?)
            ''', rows_to_insert)

        conn.commit()
        print(f"✅ Successfully seeded {len(rows_to_insert)} poses into SQL Server!")
        
    except FileNotFoundError:
        print(f"❌ ERROR: Could not find file at {csv_path}")
        print("👉 Please ensure 'data.xlsx - Yoga on the go.csv' is in the 'backend' folder.")
    except Exception as e:
        print(f"❌ Data seeding failed: {e}")

if __name__ == '__main__':
    connection = init_db()
    if connection:
        seed_data(connection)
        connection.close()