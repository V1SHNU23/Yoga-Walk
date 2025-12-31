-- 1. Create the Database (Check if it exists first to be safe)
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'YogaWalkDB')
BEGIN
    CREATE DATABASE YogaWalkDB;
END
GO

USE YogaWalkDB;
GO

-- 2. Create the Users Table (Future-proofing for login)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Users' and xtype='U')
BEGIN
    CREATE TABLE Users (
        UserID INT IDENTITY(1,1) PRIMARY KEY,
        Username NVARCHAR(50) NOT NULL,
        Email NVARCHAR(100),
        CreatedAt DATETIME DEFAULT GETDATE()
    );
END
GO

-- 3. Create the Walk History Table
-- This stores exactly what your "End Walk" screen calculates
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='WalkHistory' and xtype='U')
BEGIN
    CREATE TABLE WalkHistory (
        WalkID INT IDENTITY(1,1) PRIMARY KEY,
        UserID INT NULL, -- Can be NULL until you add login
        WalkDate DATETIME DEFAULT GETDATE(),
        
        -- The Metrics you are collecting:
        DistanceKm FLOAT,
        DurationMinutes INT,
        CaloriesBurned INT,
        PosesCompleted INT,
        StepsEstimated INT,
        
        -- Extra data for the future:
        Notes NVARCHAR(500) -- For "How did you feel?"
    );
END
GO

-- 4. Add some dummy data so the database isn't empty when you start
INSERT INTO WalkHistory (DistanceKm, DurationMinutes, CaloriesBurned, PosesCompleted, StepsEstimated, Notes)
VALUES 
(2.5, 30, 160, 3, 3300, 'Test walk 1'),
(5.0, 60, 320, 5, 6600, 'Longer morning walk');
GO

-- 5. Create Routines Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Routines' and xtype='U')
BEGIN
    CREATE TABLE Routines (
        RoutineID INT IDENTITY(1,1) PRIMARY KEY,
        Name NVARCHAR(100) NOT NULL,
        CreatedAt DATETIME DEFAULT GETDATE()
    );
END
GO