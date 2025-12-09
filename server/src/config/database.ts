import Database, { Database as DatabaseType } from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// In production, store in /data for Docker volume persistence
// In development, store in project root
const dbPath = process.env.NODE_ENV === 'production'
  ? '/data/solar-calendar.db'
  : path.join(__dirname, '../../solar-calendar.db');

export const db: DatabaseType = new Database(dbPath);

// Enable WAL mode for better concurrent access
db.pragma('journal_mode = WAL');

export function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cognito_sub TEXT UNIQUE NOT NULL,
      email TEXT NOT NULL,
      birthday TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    
    CREATE INDEX IF NOT EXISTS idx_users_cognito_sub ON users(cognito_sub);
  `);
  console.log('Database initialized successfully');
}

// Initialize on import
initializeDatabase();
