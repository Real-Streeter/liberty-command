CREATE TABLE IF NOT EXISTS team_members (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'blue',
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS columns (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'slate',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  column_id TEXT NOT NULL REFERENCES columns(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  owner TEXT,
  tag TEXT,
  priority TEXT NOT NULL DEFAULT 'Standard',
  estimate TEXT,
  due_date TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS rfps (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  carrier TEXT NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Request Sent',
  due_date TEXT,
  notes TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  team_member_id TEXT NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tasks_column ON tasks(column_id);
CREATE INDEX IF NOT EXISTS idx_sessions_member ON sessions(team_member_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
