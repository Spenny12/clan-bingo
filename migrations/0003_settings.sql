-- Event-wide switches set by the organiser. `open` = '1' lets teams tick, '0' locks the board. No row means open.
CREATE TABLE IF NOT EXISTS settings (
  name  TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
