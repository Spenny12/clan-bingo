-- Every tick and untick, newest last by id. Lets the organiser see who changed what and when.
-- `by` is whoever was picked in "Ticking as..." at the time. Not used for scoring.
CREATE TABLE IF NOT EXISTS tick_log (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  team   TEXT NOT NULL,
  key    TEXT NOT NULL,
  action TEXT NOT NULL,
  by     TEXT,
  at     INTEGER NOT NULL
);
