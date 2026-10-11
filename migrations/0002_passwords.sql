-- Shared team passwords (plain text on purpose: this is a clan bingo, not a bank).
-- Rows are inserted by the organiser, not by the repo. A Cloudflare secret with the same name wins if set.
CREATE TABLE IF NOT EXISTS passwords (
  name  TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
