PRAGMA foreign_keys = ON;

CREATE TABLE word_daily_puzzles (
  id TEXT PRIMARY KEY,
  puzzle_date TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('redacted', 'cipher')),
  target_player_id TEXT NOT NULL REFERENCES players(id),
  display_answer TEXT NOT NULL,
  scrambled_answer TEXT,
  created_at TEXT NOT NULL,
  UNIQUE (puzzle_date, mode)
);

CREATE TABLE word_attempts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  puzzle_id TEXT NOT NULL REFERENCES word_daily_puzzles(id),
  status TEXT NOT NULL DEFAULT 'playing' CHECK (status IN ('playing', 'won', 'lost')),
  attempts_used INTEGER NOT NULL DEFAULT 0,
  score INTEGER NOT NULL DEFAULT 0,
  guessed_letters TEXT NOT NULL DEFAULT '[]',
  evidence_opened INTEGER NOT NULL DEFAULT 0,
  guesses_json TEXT NOT NULL DEFAULT '[]',
  started_at TEXT NOT NULL,
  completed_at TEXT,
  UNIQUE (user_id, puzzle_id)
);

CREATE INDEX word_daily_puzzles_date_idx ON word_daily_puzzles(puzzle_date, mode);
CREATE INDEX word_attempts_user_idx ON word_attempts(user_id);
CREATE INDEX word_attempts_puzzle_idx ON word_attempts(puzzle_id);
