const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class DBManager {
    constructor() {
        // Database will be stored in the user's app data directory
        const dbPath = path.join(process.env.HOME || process.env.USERPROFILE, '.pomodoro-timer.db');
        this.db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('Error opening database:', err);
            } else {
                console.log('Connected to database');
                this.initDatabase();
            }
        });
    }

    initDatabase() {
        // Create sessions table if it doesn't exist
        const createSessionsTable = `
            CREATE TABLE IF NOT EXISTS sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                start_time DATETIME NOT NULL,
                duration INTEGER NOT NULL,  -- in seconds
                session_type TEXT NOT NULL CHECK(session_type IN ('focus', 'break')),
                completed BOOLEAN NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `;

        this.db.run(createSessionsTable, (err) => {
            if (err) {
                console.error('Error creating sessions table:', err);
            } else {
                console.log('Sessions table ready');
            }
        });
    }

    // Add a new session
    addSession(sessionData) {
        return new Promise((resolve, reject) => {
            const { startTime, duration, sessionType, completed } = sessionData;
            
            const query = `
                INSERT INTO sessions (start_time, duration, session_type, completed)
                VALUES (?, ?, ?, ?)
            `;
            
            this.db.run(query, [startTime, duration, sessionType, completed ? 1 : 0], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
        });
    }

    // Get sessions grouped by hour for today
    async getSessionsByHour(sessionType = 'focus') {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT 
                    strftime('%H', datetime(start_time, '+8 hours')) as hour,
                    COUNT(*) as total_sessions,
                    SUM(duration) as total_time,
                    SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed_sessions
                FROM sessions
                WHERE date(datetime(start_time, '+8 hours')) = date('now', 'localtime')
                AND session_type = ?
                GROUP BY strftime('%H', datetime(start_time, '+8 hours'))
                ORDER BY hour
            `;
            
            this.db.all(query, [sessionType], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // Get sessions grouped by day for the last 7 days
    async getSessionsByDay(sessionType = 'focus') {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT 
                    date(datetime(start_time, '+8 hours')) as day,
                    COUNT(*) as total_sessions,
                    SUM(duration) as total_time,
                    SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed_sessions
                FROM sessions
                WHERE date(datetime(start_time, '+8 hours')) >= date('now', '-6 days', 'localtime')
                AND session_type = ?
                GROUP BY date(datetime(start_time, '+8 hours'))
                ORDER BY day
            `;
            
            this.db.all(query, [sessionType], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // Get sessions grouped by day for the current month
    async getSessionsByMonth(sessionType = 'focus') {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT 
                    strftime('%d', datetime(start_time, '+8 hours')) as day,
                    COUNT(*) as total_sessions,
                    SUM(duration) as total_time,
                    SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed_sessions
                FROM sessions
                WHERE strftime('%Y-%m', datetime(start_time, '+8 hours')) = strftime('%Y-%m', 'now', 'localtime')
                AND session_type = ?
                GROUP BY strftime('%d', datetime(start_time, '+8 hours'))
                ORDER BY day
            `;
            
            this.db.all(query, [sessionType], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // Get sessions grouped by month for the current year
    async getSessionsByYear(sessionType = 'focus') {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT 
                    strftime('%m', datetime(start_time, '+8 hours')) as month,
                    COUNT(*) as total_sessions,
                    SUM(duration) as total_time,
                    SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed_sessions
                FROM sessions
                WHERE strftime('%Y', datetime(start_time, '+8 hours')) = strftime('%Y', 'now', 'localtime')
                AND session_type = ?
                GROUP BY strftime('%m', datetime(start_time, '+8 hours'))
                ORDER BY month
            `;
            
            this.db.all(query, [sessionType], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // Close the database connection
    close() {
        this.db.close((err) => {
            if (err) {
                console.error('Error closing database:', err);
            } else {
                console.log('Database connection closed');
            }
        });
    }
}

module.exports = DBManager; 