PRAGMA foreign_keys = ON;

CREATE TABLE weekly_champions (
  week_start TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  points INTEGER NOT NULL,
  solved INTEGER NOT NULL,
  played INTEGER NOT NULL,
  awarded_at TEXT NOT NULL
);

CREATE INDEX weekly_champions_user_idx ON weekly_champions(user_id);
