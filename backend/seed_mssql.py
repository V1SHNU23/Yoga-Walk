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
    # We drop ReflectionQuestions first because it depends on WalkThemes
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

    # 4. Create QUESTIONS Table
    cursor.execute('''
        CREATE TABLE ReflectionQuestions (
            QuestionID INT IDENTITY(1,1) PRIMARY KEY,
            ThemeID INT NOT NULL,
            QuestionText NVARCHAR(500) NOT NULL,
            FOREIGN KEY (ThemeID) REFERENCES WalkThemes(ThemeID)
        )
    ''')

    conn.commit()
    print("✅ All tables (Poses, Themes, Questions) created successfully.")

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
    """Reads Walks.csv and inserts Themes + Questions."""
    cursor = conn.cursor()
    current_dir = os.path.dirname(os.path.abspath(__file__))
    csv_path = os.path.join(current_dir, 'Walks.csv')

    if not os.path.exists(csv_path):
        print(f"⚠️  Skipping Reflections: {csv_path} not found.")
        return

    print(f"📂 Reading Reflections from: {csv_path}")
    try:
        with open(csv_path, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            
            # The CSV headers are the Themes (e.g., "WALK OF HAPPINESS")
            themes = reader.fieldnames
            
            # 1. Create Themes and store their IDs
            theme_map = {} # {'WALK OF HAPPINESS': 1, ...}
            
            for theme_name in themes:
                clean_title = theme_name.strip().title() # Convert "WALK OF HAPPINESS" -> "Walk Of Happiness"
                cursor.execute("INSERT INTO WalkThemes (Title) VALUES (?)", clean_title)
                cursor.execute("SELECT @@IDENTITY")
                theme_id = cursor.fetchone()[0]
                theme_map[theme_name] = theme_id
            
            print(f"   ✅ Created {len(theme_map)} themes.")

            # 2. Collect Questions
            # The CSV has questions in columns. We iterate rows, and for each column, grab the question.
            questions_to_insert = []
            
            for row in reader:
                for theme_header, question_text in row.items():
                    if question_text and str(question_text).strip(): # Check if not empty
                        theme_id = theme_map.get(theme_header)
                        if theme_id:
                            questions_to_insert.append((theme_id, question_text.strip()))

            # 3. Bulk Insert Questions
            cursor.executemany('''
                INSERT INTO ReflectionQuestions (ThemeID, QuestionText)
                VALUES (?, ?)
            ''', questions_to_insert)
            
            conn.commit()
            print(f"   ✅ Seeded {len(questions_to_insert)} reflection questions.")

    except Exception as e:
        print(f"❌ Error seeding reflections: {e}")

if __name__ == "__main__":
    connection = get_connection()
    if connection:
        reset_tables(connection)      # 1. Drop & Recreate
        seed_poses(connection)        # 2. Add Poses
        seed_reflections(connection)  # 3. Add Reflections
        connection.close()
        print("\n🎉 Database setup complete!")