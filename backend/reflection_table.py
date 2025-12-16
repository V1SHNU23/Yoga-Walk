import pyodbc

CONN_STR = (
    r'DRIVER={ODBC Driver 17 for SQL Server};'
    r'SERVER=139.99.183.1\SQL2019;'
    r'DATABASE=kailash_yogawalk;'
    r'UID=solomon.s;'
    r'PWD=87wbc9F_;'
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