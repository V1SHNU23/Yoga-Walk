import pyodbc
import csv
import os
import zipfile
import xml.etree.ElementTree as ET
from collections import defaultdict

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
            QuestionNumber INT NULL,
            QuestionOrder INT NULL,
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
    """Reads 3Qwalks.xlsx (or Walks.csv) and inserts Themes + Questions."""
    cursor = conn.cursor()
    current_dir = os.path.dirname(os.path.abspath(__file__))
    xlsx_path = os.path.join(current_dir, '3Qwalks.xlsx')
    csv_path = os.path.join(current_dir, 'Walks.csv')

    if not os.path.exists(xlsx_path) and not os.path.exists(csv_path):
        print(f"⚠️  Skipping Reflections: {xlsx_path} and {csv_path} not found.")
        return

    try:
        if os.path.exists(xlsx_path):
            print(f"📂 Reading Reflections from: {xlsx_path}")
            rows = read_three_question_rows(xlsx_path)
            theme_map = seed_themes_from_rows(cursor, rows)
            questions_to_insert = []

            for row in rows:
                theme_name = row.get("Theme", "").strip()
                if not theme_name:
                    continue
                theme_id = theme_map.get(theme_name)
                if not theme_id:
                    continue
                question_number = parse_int(row.get("Question_Number"))
                question_fields = [
                    (1, row.get("Original_Question", "")),
                    (2, row.get("Followup_1_Anchor", "")),
                    (3, row.get("Followup_2_Action+Accountability", "")),
                ]
                for order, question_text in question_fields:
                    if question_text and str(question_text).strip():
                        questions_to_insert.append((
                            theme_id,
                            question_number,
                            order,
                            question_text.strip()
                        ))

            cursor.executemany('''
                INSERT INTO ReflectionQuestions (ThemeID, QuestionNumber, QuestionOrder, QuestionText)
                VALUES (?, ?, ?, ?)
            ''', questions_to_insert)
            conn.commit()
            print(f"   ✅ Seeded {len(questions_to_insert)} reflection questions.")
        else:
            print(f"📂 Reading Reflections from: {csv_path}")
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

                question_number = 1
                for row in reader:
                    for theme_header, question_text in row.items():
                        if question_text and str(question_text).strip(): # Check if not empty
                            theme_id = theme_map.get(theme_header)
                            if theme_id:
                                questions_to_insert.append((
                                    theme_id,
                                    question_number,
                                    1,
                                    question_text.strip()
                                ))
                    question_number += 1

                # 3. Bulk Insert Questions
                cursor.executemany('''
                    INSERT INTO ReflectionQuestions (ThemeID, QuestionNumber, QuestionOrder, QuestionText)
                    VALUES (?, ?, ?, ?)
                ''', questions_to_insert)

                conn.commit()
                print(f"   ✅ Seeded {len(questions_to_insert)} reflection questions.")

    except Exception as e:
        print(f"❌ Error seeding reflections: {e}")

def parse_int(value):
    try:
        return int(str(value).strip())
    except (TypeError, ValueError):
        return None

def read_three_question_rows(xlsx_path):
    rows = []
    with zipfile.ZipFile(xlsx_path) as z:
        shared_strings = load_shared_strings(z)
        sheet_files = [
            name for name in z.namelist()
            if name.startswith("xl/worksheets/sheet") and name.endswith(".xml")
        ]
        for sheet_name in sheet_files:
            rows.extend(read_sheet_rows(z, sheet_name, shared_strings))
    return rows

def load_shared_strings(zip_file):
    if "xl/sharedStrings.xml" not in zip_file.namelist():
        return []
    xml = zip_file.read("xl/sharedStrings.xml")
    root = ET.fromstring(xml)
    ns = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
    strings = []
    for si in root.findall(f".//{ns}si"):
        text_parts = [t.text or "" for t in si.findall(f".//{ns}t")]
        strings.append("".join(text_parts))
    return strings

def read_sheet_rows(zip_file, sheet_name, shared_strings):
    xml = zip_file.read(sheet_name)
    root = ET.fromstring(xml)
    ns = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
    rows = []
    header_map = {}
    for row in root.findall(f".//{ns}row"):
        row_values = {}
        for cell in row.findall(f"{ns}c"):
            cell_ref = cell.attrib.get("r", "")
            col = "".join(ch for ch in cell_ref if ch.isalpha())
            if not col:
                continue
            value = read_cell_value(cell, shared_strings, ns)
            if value is None:
                continue
            row_values[col] = value
        if not row_values:
            continue
        if not header_map:
            header_map = {col: str(value).strip() for col, value in row_values.items()}
            continue
        mapped = {}
        for col, header in header_map.items():
            if header:
                mapped[header] = str(row_values.get(col, "")).strip()
        if any(mapped.values()):
            rows.append(mapped)
    return rows

def read_cell_value(cell, shared_strings, ns):
    cell_type = cell.attrib.get("t")
    if cell_type == "inlineStr":
        text_parts = [t.text or "" for t in cell.findall(f".//{ns}t")]
        return "".join(text_parts)
    value = cell.find(f"{ns}v")
    if value is None:
        return None
    if cell_type == "s":
        try:
            return shared_strings[int(value.text)]
        except (TypeError, ValueError, IndexError):
            return ""
    return value.text

def seed_themes_from_rows(cursor, rows):
    theme_map = {}
    for row in rows:
        theme_name = row.get("Theme", "").strip()
        if not theme_name or theme_name in theme_map:
            continue
        clean_title = theme_name.strip().title()
        cursor.execute("INSERT INTO WalkThemes (Title) VALUES (?)", clean_title)
        cursor.execute("SELECT @@IDENTITY")
        theme_id = cursor.fetchone()[0]
        theme_map[theme_name] = theme_id
    print(f"   ✅ Created {len(theme_map)} themes.")
    return theme_map

if __name__ == "__main__":
    connection = get_connection()
    if connection:
        reset_tables(connection)      # 1. Drop & Recreate
        seed_poses(connection)        # 2. Add Poses
        seed_reflections(connection)  # 3. Add Reflections
        connection.close()
        print("\n🎉 Database setup complete!")
