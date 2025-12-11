import Database, { Database as DatabaseType } from 'better-sqlite3'
import { mkdirSync } from 'fs'
import { dirname } from 'path'

// Database file path
const DB_PATH = process.env.DATABASE_PATH || './data/settings.db'

// Ensure the data directory exists
mkdirSync(dirname(DB_PATH), { recursive: true })

// Create persistent database
const db: DatabaseType = new Database(DB_PATH)

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS server_settings (
    guild_id TEXT PRIMARY KEY,
    channel_id TEXT,
    timezone TEXT DEFAULT 'America/New_York',
    cron_schedule TEXT DEFAULT '0 8 * * *',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS birthdays (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    month INTEGER NOT NULL,
    day INTEGER NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(guild_id, user_id)
  );

  CREATE INDEX IF NOT EXISTS idx_birthdays_guild ON birthdays(guild_id);
  CREATE INDEX IF NOT EXISTS idx_birthdays_date ON birthdays(month, day);
`)

// Types
export interface ServerSettings {
  guild_id: string
  channel_id: string | null
  timezone: string
  cron_schedule: string
  created_at: string
  updated_at: string
}

export interface Birthday {
  id: number
  guild_id: string
  user_id: string
  user_name: string
  month: number
  day: number
  created_at: string
}

// Server Settings Functions

/**
 * Get settings for a guild, creating defaults if they don't exist
 */
export function getServerSettings(guildId: string): ServerSettings {
  const stmt = db.prepare('SELECT * FROM server_settings WHERE guild_id = ?')
  let settings = stmt.get(guildId) as ServerSettings | undefined
  
  if (!settings) {
    const insert = db.prepare(`
      INSERT INTO server_settings (guild_id) VALUES (?)
    `)
    insert.run(guildId)
    settings = stmt.get(guildId) as ServerSettings
  }
  
  return settings
}

/**
 * Set the daily message channel for a guild
 */
export function setDailyChannel(guildId: string, channelId: string): void {
  const stmt = db.prepare(`
    INSERT INTO server_settings (guild_id, channel_id, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(guild_id) DO UPDATE SET 
      channel_id = excluded.channel_id,
      updated_at = CURRENT_TIMESTAMP
  `)
  stmt.run(guildId, channelId)
}

/**
 * Remove the daily message channel for a guild
 */
export function removeDailyChannel(guildId: string): void {
  const stmt = db.prepare(`
    UPDATE server_settings 
    SET channel_id = NULL, updated_at = CURRENT_TIMESTAMP 
    WHERE guild_id = ?
  `)
  stmt.run(guildId)
}

/**
 * Set timezone for a guild
 */
export function setTimezone(guildId: string, timezone: string): void {
  const stmt = db.prepare(`
    INSERT INTO server_settings (guild_id, timezone, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(guild_id) DO UPDATE SET 
      timezone = excluded.timezone,
      updated_at = CURRENT_TIMESTAMP
  `)
  stmt.run(guildId, timezone)
}

/**
 * Get all guilds with configured channels (for daily message sending)
 */
export function getAllConfiguredGuilds(): ServerSettings[] {
  const stmt = db.prepare('SELECT * FROM server_settings WHERE channel_id IS NOT NULL')
  return stmt.all() as ServerSettings[]
}

// Birthday Functions

/**
 * Add or update a birthday for a user in a guild
 */
export function setBirthday(guildId: string, userId: string, userName: string, month: number, day: number): void {
  const stmt = db.prepare(`
    INSERT INTO birthdays (guild_id, user_id, user_name, month, day)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(guild_id, user_id) DO UPDATE SET
      user_name = excluded.user_name,
      month = excluded.month,
      day = excluded.day
  `)
  stmt.run(guildId, userId, userName, month, day)
}

/**
 * Remove a birthday for a user in a guild
 */
export function removeBirthday(guildId: string, userId: string): boolean {
  const stmt = db.prepare('DELETE FROM birthdays WHERE guild_id = ? AND user_id = ?')
  const result = stmt.run(guildId, userId)
  return result.changes > 0
}

/**
 * Get all birthdays for a guild
 */
export function getGuildBirthdays(guildId: string): Birthday[] {
  const stmt = db.prepare('SELECT * FROM birthdays WHERE guild_id = ? ORDER BY month, day')
  return stmt.all(guildId) as Birthday[]
}

/**
 * Get birthdays for a specific date in a guild
 */
export function getBirthdaysOnDate(guildId: string, month: number, day: number): Birthday[] {
  const stmt = db.prepare('SELECT * FROM birthdays WHERE guild_id = ? AND month = ? AND day = ?')
  return stmt.all(guildId, month, day) as Birthday[]
}

/**
 * Get birthdays for a specific day number (for monthly birthdays)
 */
export function getBirthdaysOnDay(guildId: string, day: number): Birthday[] {
  const stmt = db.prepare('SELECT * FROM birthdays WHERE guild_id = ? AND day = ?')
  return stmt.all(guildId, day) as Birthday[]
}

/**
 * Get a user's birthday in a guild
 */
export function getUserBirthday(guildId: string, userId: string): Birthday | undefined {
  const stmt = db.prepare('SELECT * FROM birthdays WHERE guild_id = ? AND user_id = ?')
  return stmt.get(guildId, userId) as Birthday | undefined
}

export default db
