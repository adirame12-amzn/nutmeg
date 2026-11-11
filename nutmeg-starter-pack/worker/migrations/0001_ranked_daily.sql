PRAGMA foreign_keys = ON;

CREATE TABLE players (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  club TEXT NOT NULL,
  league TEXT NOT NULL,
  nation TEXT NOT NULL,
  position TEXT NOT NULL,
  age INTEGER NOT NULL,
  fc_overall INTEGER,
  portrait_url TEXT,
  portrait_editorial_url TEXT,
  portrait_cutout_editorial_url TEXT,
  eligible_answer INTEGER NOT NULL DEFAULT 1 CHECK (eligible_answer IN (0, 1))
);

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  username_key TEXT NOT NULL UNIQUE,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL
);

CREATE TABLE daily_puzzles (
  id TEXT PRIMARY KEY,
  puzzle_date TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('lineup')),
  target_player_id TEXT NOT NULL REFERENCES players(id),
  created_at TEXT NOT NULL,
  UNIQUE (puzzle_date, mode)
);

CREATE TABLE attempts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  puzzle_id TEXT NOT NULL REFERENCES daily_puzzles(id),
  status TEXT NOT NULL DEFAULT 'playing' CHECK (status IN ('playing', 'won', 'lost')),
  guesses_used INTEGER NOT NULL DEFAULT 0,
  score INTEGER NOT NULL DEFAULT 0,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  UNIQUE (user_id, puzzle_id)
);

CREATE TABLE attempt_guesses (
  id TEXT PRIMARY KEY,
  attempt_id TEXT NOT NULL REFERENCES attempts(id),
  guess_number INTEGER NOT NULL,
  player_id TEXT NOT NULL REFERENCES players(id),
  response_json TEXT NOT NULL,
  is_correct INTEGER NOT NULL CHECK (is_correct IN (0, 1)),
  created_at TEXT NOT NULL,
  UNIQUE (attempt_id, guess_number),
  UNIQUE (attempt_id, player_id)
);

CREATE INDEX daily_puzzles_date_idx ON daily_puzzles(puzzle_date, mode);
CREATE INDEX attempts_user_idx ON attempts(user_id);
CREATE INDEX attempts_puzzle_idx ON attempts(puzzle_id);
CREATE INDEX attempts_completed_idx ON attempts(completed_at);
CREATE INDEX attempt_guesses_attempt_idx ON attempt_guesses(attempt_id, guess_number);

