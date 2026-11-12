PRAGMA foreign_keys = ON;

CREATE TABLE paper_trail_paths (
  player_id TEXT PRIMARY KEY REFERENCES players(id),
  clubs_json TEXT NOT NULL,
  source_snapshot TEXT NOT NULL,
  source_url TEXT NOT NULL
);

CREATE TABLE paper_trail_daily_puzzles (
  id TEXT PRIMARY KEY,
  puzzle_date TEXT NOT NULL UNIQUE,
  target_player_id TEXT NOT NULL REFERENCES paper_trail_paths(player_id),
  clubs_json TEXT NOT NULL,
  source_snapshot TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE paper_trail_attempts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  puzzle_id TEXT NOT NULL REFERENCES paper_trail_daily_puzzles(id),
  status TEXT NOT NULL DEFAULT 'playing' CHECK (status IN ('playing', 'won', 'lost')),
  guesses_used INTEGER NOT NULL DEFAULT 0,
  score INTEGER NOT NULL DEFAULT 0,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  UNIQUE (user_id, puzzle_id)
);

CREATE TABLE paper_trail_guesses (
  id TEXT PRIMARY KEY,
  attempt_id TEXT NOT NULL REFERENCES paper_trail_attempts(id),
  guess_number INTEGER NOT NULL,
  player_id TEXT NOT NULL REFERENCES players(id),
  response_json TEXT NOT NULL,
  is_correct INTEGER NOT NULL CHECK (is_correct IN (0, 1)),
  created_at TEXT NOT NULL,
  UNIQUE (attempt_id, guess_number),
  UNIQUE (attempt_id, player_id)
);

CREATE INDEX paper_trail_puzzles_date_idx ON paper_trail_daily_puzzles(puzzle_date);
CREATE INDEX paper_trail_attempts_user_idx ON paper_trail_attempts(user_id);
CREATE INDEX paper_trail_attempts_puzzle_idx ON paper_trail_attempts(puzzle_id);
CREATE INDEX paper_trail_guesses_attempt_idx ON paper_trail_guesses(attempt_id, guess_number);
