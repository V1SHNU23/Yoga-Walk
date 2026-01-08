import pyodbc
import os
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

def add_table():
    try:
        conn = pyodbc.connect(CONN_STR)
        cursor = conn.cursor()
        
        print("🔨 Creating WalkReflections table...")
        cursor.execute("""
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='WalkReflections' AND xtype='U')
            BEGIN
                CREATE TABLE WalkReflections (
                    ReflectionID INT IDENTITY(1,1) PRIMARY KEY,
                    WalkID INT NOT NULL,
                    QuestionText NVARCHAR(500),
                    AnswerText NVARCHAR(MAX),
                    FOREIGN KEY (WalkID) REFERENCES WalkHistory(WalkID)
                );
                PRINT '✅ Created WalkReflections table.';
            END
            ELSE
                PRINT '⚠️ WalkReflections already exists.';
        """)
        conn.commit()
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    add_table()