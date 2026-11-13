PRAGMA foreign_keys = ON;

CREATE TABLE user_badges (
  user_id TEXT NOT NULL REFERENCES users(id),
  badge_id TEXT NOT NULL,
  earned_at TEXT NOT NULL,
  PRIMARY KEY (user_id, badge_id)
);

CREATE TABLE user_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  featured_badge_id TEXT,
  updated_at TEXT NOT NULL
);

CREATE INDEX user_badges_earned_idx ON user_badges(user_id, earned_at DESC);
