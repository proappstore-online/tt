import { app } from './app';

export interface Project {
  id: string;
  owner_id: string;
  name: string;
  color: string;
  is_shared: number;   // 0 | 1 — SQLite has no BOOLEAN
  archived: number;    // 0 | 1
  created_at: string;
}

export interface Entry {
  id: string;
  user_id: string;
  project_id: string | null;
  description: string | null;
  tags: string | null;         // JSON string → parse to string[]
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  created_at: string;
  updated_at: string;
}

export interface ActiveTimer {
  user_id: string;
  entry_id: string;
  started_at: string;
}

export async function initDb(): Promise<void> {
  await app.db.migrate([
    {
      id: '001_projects',
      sql: `CREATE TABLE IF NOT EXISTS projects (
        id         TEXT PRIMARY KEY,
        owner_id   TEXT NOT NULL,
        name       TEXT NOT NULL,
        color      TEXT NOT NULL,
        is_shared  INTEGER NOT NULL DEFAULT 0,
        archived   INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      )`,
    },
    {
      id: '002_entries',
      sql: `CREATE TABLE IF NOT EXISTS entries (
        id               TEXT PRIMARY KEY,
        user_id          TEXT NOT NULL,
        project_id       TEXT REFERENCES projects(id),
        description      TEXT,
        tags             TEXT,
        started_at       TEXT NOT NULL,
        ended_at         TEXT,
        duration_seconds INTEGER,
        created_at       TEXT NOT NULL,
        updated_at       TEXT NOT NULL
      )`,
    },
    {
      id: '003_timers',
      sql: `CREATE TABLE IF NOT EXISTS active_timers (
        user_id    TEXT PRIMARY KEY,
        entry_id   TEXT NOT NULL,
        started_at TEXT NOT NULL
      )`,
    },
    {
      id: '004_indexes',
      sql: `CREATE INDEX IF NOT EXISTS idx_entries_user_started ON entries (user_id, started_at);
CREATE INDEX IF NOT EXISTS idx_entries_project ON entries (project_id)`,
    },
  ]);
}
