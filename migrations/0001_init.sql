CREATE TABLE IF NOT EXISTS ticks (
  team TEXT NOT NULL,
  key  TEXT NOT NULL,
  at   INTEGER NOT NULL,
  by   TEXT,
  PRIMARY KEY (team, key)
);
CREATE TABLE IF NOT EXISTS pvp (
  task  TEXT NOT NULL,
  place INTEGER NOT NULL,
  team  TEXT NOT NULL,
  at    INTEGER NOT NULL,
  PRIMARY KEY (task, place)
);
