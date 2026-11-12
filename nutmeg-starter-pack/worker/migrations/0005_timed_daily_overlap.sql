PRAGMA foreign_keys = ON;

ALTER TABLE paper_trail_attempts ADD COLUMN deadline_at TEXT;
ALTER TABLE word_attempts ADD COLUMN deadline_at TEXT;

CREATE TABLE overlap_daily_puzzles (
  id TEXT PRIMARY KEY,
  puzzle_date TEXT NOT NULL UNIQUE,
  club_a_json TEXT NOT NULL,
  club_b_json TEXT NOT NULL,
  country TEXT NOT NULL,
  target_player_id TEXT NOT NULL REFERENCES players(id),
  source_snapshot TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE overlap_attempts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  puzzle_id TEXT NOT NULL REFERENCES overlap_daily_puzzles(id),
  status TEXT NOT NULL DEFAULT 'playing' CHECK (status IN ('playing', 'won', 'lost')),
  selected_player_id TEXT REFERENCES players(id),
  matches INTEGER NOT NULL DEFAULT 0,
  score INTEGER NOT NULL DEFAULT 0,
  started_at TEXT NOT NULL,
  deadline_at TEXT NOT NULL,
  completed_at TEXT,
  UNIQUE (user_id, puzzle_id)
);

CREATE INDEX overlap_puzzles_date_idx ON overlap_daily_puzzles(puzzle_date);
CREATE INDEX overlap_attempts_user_idx ON overlap_attempts(user_id);
CREATE INDEX overlap_attempts_puzzle_idx ON overlap_attempts(puzzle_id);
