export const CURRENT_DB_VERSION = 1;

export const SCHEMA_V1 = `
  CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS game_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id TEXT NOT NULL,
    score REAL NOT NULL,
    played_at INTEGER NOT NULL,
    metadata TEXT
  );

  CREATE TABLE IF NOT EXISTS game_stats (
    game_id TEXT PRIMARY KEY,
    high_score REAL DEFAULT 0,
    times_played INTEGER DEFAULT 0,
    last_played_at INTEGER,
    total_time_spent INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS favorites (
    game_id TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS achievements (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    unlocked_at INTEGER,
    progress REAL DEFAULT 0,
    max_progress REAL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS user_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS daily_challenges (
    date_key TEXT PRIMARY KEY,
    game_id TEXT NOT NULL,
    target_score REAL NOT NULL,
    completed INTEGER DEFAULT 0,
    completed_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS game_progress (
    game_id TEXT PRIMARY KEY,
    state TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_scores_game_id ON game_scores(game_id);
  CREATE INDEX IF NOT EXISTS idx_scores_played_at ON game_scores(played_at DESC);
  CREATE INDEX IF NOT EXISTS idx_progress_updated_at ON game_progress(updated_at DESC);
`;
