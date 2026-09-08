-- HeatFix Mcr Limited — a limit on guessing at the back office door.
--
-- The login had a 600ms pause after a wrong password, which only slows a
-- caller who waits for each answer before sending the next. Anyone guessing
-- in earnest fires hundreds at once and the pause costs them nothing. Behind
-- that door is his whole customer book: names, addresses, phone numbers and
-- every invoice he has raised.
--
-- Attempts are counted per IP address rather than globally, which matters:
-- a global counter would let anybody lock Mohammad out of his own business by
-- guessing wrong on purpose.
--
-- The same table also holds the password-reset requests. That endpoint sends
-- an email each time it is called, so without a limit it is a way to bury his
-- inbox.

CREATE TABLE IF NOT EXISTS hf_login_attempts (
  id           TEXT PRIMARY KEY,   -- scope + ":" + ip
  scope        TEXT NOT NULL,      -- 'login' or 'forgot'
  ip           TEXT NOT NULL,
  fails        INTEGER NOT NULL DEFAULT 0,
  first_at     TEXT NOT NULL,      -- start of the current counting window
  locked_until TEXT                -- set once the limit is passed
);

CREATE INDEX IF NOT EXISTS hf_attempts_first ON hf_login_attempts (first_at);
