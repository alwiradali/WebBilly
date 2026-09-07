-- HeatFix Mcr Limited — his own password, and a way back in without ringing
-- anybody.
--
-- Until now the only password was HF_ADMIN_PASSWORD, a Cloudflare secret. A
-- Worker cannot rewrite its own secrets, so he could not change it himself and
-- forgetting it meant asking his web developer. Both go in the database
-- instead: a PBKDF2 hash he can change, and a single-use reset token.
--
-- The password is never stored, only a hash of it with its own random salt.
-- The reset token is hashed too, for the same reason: read access to this
-- table must not be enough to take the account.

ALTER TABLE hf_settings ADD COLUMN password_hash    TEXT;
ALTER TABLE hf_settings ADD COLUMN password_salt    TEXT;
ALTER TABLE hf_settings ADD COLUMN password_set_at  TEXT;

-- Single use, short lived, and hashed at rest.
ALTER TABLE hf_settings ADD COLUMN reset_hash    TEXT;
ALTER TABLE hf_settings ADD COLUMN reset_expires TEXT;
