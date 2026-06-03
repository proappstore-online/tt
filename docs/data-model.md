# TT — Data Model

All persistence lives in `app.db` (per-app SQLite/D1). No custom roles table — roles use `app.roles` (built-in).

---

## Migration strategy

Call `app.db.migrate(migrations)` once at app startup (in `src/lib/db.ts`). Each migration is an object `{ id: string; sql: string }`. The platform runs each only once, in order.

---

## Tables

### `projects`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | TEXT | PRIMARY KEY | `crypto.randomUUID()` |
| `owner_id` | TEXT | NOT NULL | `user.id` (e.g. `"gh:123"`) |
| `name` | TEXT | NOT NULL | Display name |
| `color` | TEXT | NOT NULL | Hex colour, e.g. `"#6366f1"` |
| `is_shared` | INTEGER | NOT NULL DEFAULT 0 | `1` = team project (Pro only) |
| `archived` | INTEGER | NOT NULL DEFAULT 0 | Soft-delete flag |
| `created_at` | TEXT | NOT NULL | ISO-8601 UTC string |

```sql
CREATE TABLE IF NOT EXISTS projects (
  id         TEXT PRIMARY KEY,
  owner_id   TEXT NOT NULL,
  name       TEXT NOT NULL,
  color      TEXT NOT NULL,
  is_shared  INTEGER NOT NULL DEFAULT 0,
  archived   INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
```

---

### `entries`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | TEXT | PRIMARY KEY | `crypto.randomUUID()` |
| `user_id` | TEXT | NOT NULL | `user.id` of the logger |
| `project_id` | TEXT | REFERENCES projects(id) | Nullable — uncategorised |
| `description` | TEXT | | Free-form note |
| `tags` | TEXT | | JSON array serialised as string, e.g. `'["design","client-a"]'` |
| `started_at` | TEXT | NOT NULL | ISO-8601 UTC |
| `ended_at` | TEXT | | NULL when timer is running |
| `duration_seconds` | INTEGER | | Computed on stop/save; redundant but simplifies queries |
| `created_at` | TEXT | NOT NULL | ISO-8601 UTC |
| `updated_at` | TEXT | NOT NULL | ISO-8601 UTC |

```sql
CREATE TABLE IF NOT EXISTS entries (
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
);
CREATE INDEX IF NOT EXISTS idx_entries_user_started ON entries (user_id, started_at);
CREATE INDEX IF NOT EXISTS idx_entries_project      ON entries (project_id);
```

---

### `active_timers`

One row per user — the currently-running timer. Kept separate to make "is a timer running?" a O(1) lookup without scanning `entries`.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `user_id` | TEXT | PRIMARY KEY | `user.id` |
| `entry_id` | TEXT | NOT NULL | FK → entries.id |
| `started_at` | TEXT | NOT NULL | ISO-8601 UTC |

```sql
CREATE TABLE IF NOT EXISTS active_timers (
  user_id    TEXT PRIMARY KEY,
  entry_id   TEXT NOT NULL,
  started_at TEXT NOT NULL
);
```

---

## TypeScript row types

```ts
// src/lib/db.ts
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
```

> **Rule:** Always pass the type parameter to `app.db.query<T>()`. Never leave it as `unknown` — that causes downstream `tsc` errors.

---

## Query patterns

```ts
// Fetch a user's entries in a date range
const { rows } = await app.db.query<Entry>(
  `SELECT * FROM entries
   WHERE user_id = ? AND started_at >= ? AND started_at < ?
   ORDER BY started_at DESC`,
  [userId, rangeStart, rangeEnd]
);

// Insert a new entry, get the id back via last_row_id (snake_case)
const result = await app.db.execute(
  `INSERT INTO entries (id, user_id, project_id, description, tags, started_at, ended_at, duration_seconds, created_at, updated_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  [id, userId, projectId, description, tagsJson, startedAt, null, null, now, now]
);
// result.meta.last_row_id — snake_case. result has NO .rows.

// Upsert active timer (stop previous if any, then insert)
await app.db.batch([
  { sql: 'DELETE FROM active_timers WHERE user_id = ?', params: [userId] },
  { sql: 'INSERT INTO active_timers (user_id, entry_id, started_at) VALUES (?, ?, ?)', params: [userId, entryId, now] },
]);
```

---

## KV usage (per-user client preferences)

`app.kv` is used only for lightweight per-user preferences — never for core data.

| Key | Type | Purpose |
|-----|------|---------|
| `prefs:defaultProject` | `string \| null` | Last-used project id |
| `prefs:weekStart` | `'monday' \| 'sunday'` | Week-start preference |
