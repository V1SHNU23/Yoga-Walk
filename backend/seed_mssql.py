import pyodbc
import csv
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# --- CONFIGURE YOUR CONNECTION (SECURE) ---
# Now uses the same .env variables as your app.py
CONN_STR = (
    r'DRIVER={ODBC Driver 17 for SQL Server};'
    f'SERVER={os.getenv("DB_SERVER")};'
    f'DATABASE={os.getenv("DB_DATABASE")};'
    f'UID={os.getenv("DB_USER")};'
    f'PWD={os.getenv("DB_PASSWORD")};'
)

def get_connection():
    try:
        return pyodbc.connect(CONN_STR)
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return None

def reset_tables(conn):
    """Drops and Re-creates all tables for a fresh start."""
    cursor = conn.cursor()
    print("🔄 Resetting database tables...")

    # 1. Drop old tables (Order matters due to Foreign Keys!)
    cursor.execute("DROP TABLE IF EXISTS ReflectionQuestions")
    cursor.execute("DROP TABLE IF EXISTS WalkThemes")
    # We drop Poses last
    cursor.execute("DROP TABLE IF EXISTS poses")

    # 2. Create POSES Table
    cursor.execute('''
        CREATE TABLE poses (
            id INT IDENTITY(1,1) PRIMARY KEY,
            name NVARCHAR(100) NOT NULL,
            instructions NVARCHAR(MAX),
            benefits NVARCHAR(MAX),
            animation_url NVARCHAR(255)
        )
    ''')

    # 3. Create THEMES Table
    cursor.execute('''
        CREATE TABLE WalkThemes (
            ThemeID INT IDENTITY(1,1) PRIMARY KEY,
            Title NVARCHAR(100) NOT NULL,
            Description NVARCHAR(255) NULL
        )
    ''')

    # 4. Create QUESTIONS Table (UPDATED FOR 3 QUESTIONS)
    cursor.execute('''
        CREATE TABLE ReflectionQuestions (
            QuestionID INT IDENTITY(1,1) PRIMARY KEY,
            ThemeID INT NOT NULL,
            QuestionNumber INT,
            OriginalQuestion NVARCHAR(MAX) NOT NULL,
            FollowupQuestion1 NVARCHAR(MAX),
            FollowupQuestion2 NVARCHAR(MAX),
            FOREIGN KEY (ThemeID) REFERENCES WalkThemes(ThemeID)
        )
    ''')

    conn.commit()
    print("✅ All tables (Poses, Themes, Questions [3-Part]) created successfully.")

def seed_poses(conn):
    """Reads poses.csv and inserts into DB."""
    cursor = conn.cursor()
    current_dir = os.path.dirname(os.path.abspath(__file__))
    csv_path = os.path.join(current_dir, 'poses.csv')

    if not os.path.exists(csv_path):
        print(f"⚠️  Skipping Poses: {csv_path} not found.")
        return

    print(f"📂 Reading Poses from: {csv_path}")
    try:
        with open(csv_path, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            rows = []
            for row in reader:
                rows.append((
                    row['Exercise'], 
                    row['How to do the exercise'], 
                    row['Benefits'], 
                    row.get('Animation', '')
                ))
            
            cursor.executemany('''
                INSERT INTO poses (name, instructions, benefits, animation_url)
                VALUES (?, ?, ?, ?)
            ''', rows)
            conn.commit()
            print(f"   ✅ Seeded {len(rows)} poses.")
    except Exception as e:
        print(f"❌ Error seeding poses: {e}")

def seed_reflections(conn):
    """Reads 3Qwalks.csv and inserts Themes + 3-Part Questions."""
    cursor = conn.cursor()
    current_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Reading from your new local file '3Qwalks.csv'
    csv_path = os.path.join(current_dir, '3Qwalks.csv')

    if not os.path.exists(csv_path):
        print(f"⚠️  Skipping Reflections: {csv_path} not found. Please ensure '3Qwalks.csv' is in the backend folder.")
        return

    print(f"📂 Reading Reflections from: {csv_path}")
    try:
        with open(csv_path, 'r', encoding='cp1252') as f:
            reader = csv.DictReader(f)
            
            # Helper to map Theme Names -> IDs to avoid duplicates
            theme_map = {} 
            questions_to_insert = []

            for row in reader:
                raw_theme = row.get('Theme', '').strip()
                if not raw_theme: continue

                # 1. Handle Theme Creation
                if raw_theme not in theme_map:
                    clean_title = raw_theme.title()
                    cursor.execute("INSERT INTO WalkThemes (Title) VALUES (?)", clean_title)
                    cursor.execute("SELECT @@IDENTITY")
                    theme_id = cursor.fetchone()[0]
                    theme_map[raw_theme] = theme_id
                
                theme_id = theme_map[raw_theme]

                # 2. Prepare Question Data
                # Adjust these keys if your CSV headers are slightly different
                q_num = row.get('Question_Number')
                q1 = row.get('Original_Question', '').strip()
                q2 = row.get('Followup_1_Anchor', '').strip()
                q3 = row.get('Followup_2_Action+Accountability', '').strip()

                if q1:
                    questions_to_insert.append((theme_id, q_num, q1, q2, q3))

            print(f"   ✅ Created {len(theme_map)} themes.")

            # 3. Bulk Insert Questions
            cursor.executemany('''
                INSERT INTO ReflectionQuestions (ThemeID, QuestionNumber, OriginalQuestion, FollowupQuestion1, FollowupQuestion2)
                VALUES (?, ?, ?, ?, ?)
            ''', questions_to_insert)
            
            conn.commit()
            print(f"   ✅ Seeded {len(questions_to_insert)} reflection sets.")

    except Exception as e:
        print(f"❌ Error seeding reflections: {e}")

if __name__ == "__main__":
    connection = get_connection()
    if connection:
        reset_tables(connection)      # 1. Drop & Recreate
        seed_poses(connection)        # 2. Add Poses
        seed_reflections(connection)  # 3. Add 3-Part Reflections
        connection.close()
        print("\n🎉 Database setup complete!")