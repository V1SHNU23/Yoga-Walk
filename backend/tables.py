import pyodbc

# 1. Your Credentials
CONN_STR = (
    r'DRIVER={ODBC Driver 17 for SQL Server};'
    r'SERVER=139.99.183.1\SQL2019;'
    r'DATABASE=kailash_yogawalk;'
    r'UID=solomon.s;'
    r'PWD=87wbc9F_;'
)

# 2. The Smart Update Script
SQL_COMMANDS = """
-- A. Handle Routines Table (Create or Update)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Routines' and xtype='U')
BEGIN
    -- 1. Create table if it doesn't exist (with ALL new columns)
    CREATE TABLE Routines (
        RoutineID INT IDENTITY(1,1) PRIMARY KEY,
        Name NVARCHAR(100) NOT NULL,
        CreatedAt DATETIME DEFAULT GETDATE(),
        Description NVARCHAR(500),
        Duration NVARCHAR(50),
        CoverImage NVARCHAR(MAX)
    );
    PRINT '✅ Created Routines Table (Fresh)';
END
ELSE
BEGIN
    -- 2. If it exists, add missing columns individually
    PRINT 'ℹ️ Routines Table exists. Checking for missing columns...';

    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Routines' AND COLUMN_NAME = 'Description')
    BEGIN
        ALTER TABLE Routines ADD Description NVARCHAR(500);
        PRINT '   + Added Description column';
    END

    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Routines' AND COLUMN_NAME = 'Duration')
    BEGIN
        ALTER TABLE Routines ADD Duration NVARCHAR(50);
        PRINT '   + Added Duration column';
    END

    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Routines' AND COLUMN_NAME = 'CoverImage')
    BEGIN
        ALTER TABLE Routines ADD CoverImage NVARCHAR(MAX);
        PRINT '   + Added CoverImage column';
    END
    
    PRINT '✅ Routines Table Up to Date';
END

-- B. Create RoutinePoses Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='RoutinePoses' and xtype='U')
BEGIN
    CREATE TABLE RoutinePoses (
        RoutinePoseID INT IDENTITY(1,1) PRIMARY KEY,
        RoutineID INT NOT NULL,     
        PoseID INT NULL,            
        PoseName NVARCHAR(100),     
        Duration NVARCHAR(50),      
        OrderIndex INT,             
        FOREIGN KEY (RoutineID) REFERENCES Routines(RoutineID) ON DELETE CASCADE
    );
    PRINT '✅ Created RoutinePoses Table';
END
ELSE
BEGIN
    PRINT 'ℹ️ RoutinePoses Table already exists';
END
"""

# 3. Execute
try:
    print("🔌 Connecting to Database...")
    conn = pyodbc.connect(CONN_STR)
    conn.autocommit = True
    cursor = conn.cursor()
    
    print("🚀 Running Smart Updates...")
    cursor.execute(SQL_COMMANDS)
    
    # Print database messages
    while cursor.nextset(): 
        pass 
        
    print("\n🎉 SUCCESS! Database schema is ready.")
    conn.close()

except Exception as e:
    print(f"\n❌ Error: {e}")