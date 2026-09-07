-- HeatFix Mcr Limited — his own job numbers, several bank accounts, and
-- control over what of the customer's details leaves the building.
--
-- NOTE: no real bank details in this file. The repository is public. The
-- table is created empty here and the accounts are put into his database
-- directly.

-- ------------------------------------------------------------ bank accounts
-- He invoices from more than one account, and picks per invoice. The account
-- NAME matters as much as the number: it is what a customer types into their
-- banking app, and a mismatch is what makes a payment bounce or sit in limbo.
CREATE TABLE IF NOT EXISTS hf_bank_accounts (
  id           TEXT PRIMARY KEY,
  label        TEXT NOT NULL,            -- what he calls it in the dropdown
  account_name TEXT,                     -- the name the money must be paid to
  bank_name    TEXT,
  sort_code    TEXT,
  account_no   TEXT,
  is_default   INTEGER NOT NULL DEFAULT 0,
  position     INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_hf_bank_pos ON hf_bank_accounts(position);

-- ------------------------------------------------------------------ invoices
-- His own reference for the job, separate from the invoice number.
ALTER TABLE hf_invoices ADD COLUMN job_no TEXT;

-- The bank details are copied onto the invoice at the moment it is raised.
-- Pointing at the account row instead would rewrite every invoice he has ever
-- sent the day he changes an account, and a customer holding a permanent link
-- would see different details from the ones they paid.
ALTER TABLE hf_invoices ADD COLUMN bank_label        TEXT;
ALTER TABLE hf_invoices ADD COLUMN bank_account_name TEXT;
ALTER TABLE hf_invoices ADD COLUMN bank_name         TEXT;
ALTER TABLE hf_invoices ADD COLUMN bank_sort         TEXT;
ALTER TABLE hf_invoices ADD COLUMN bank_account      TEXT;

-- He passes some invoices to a company he subcontracts for, and the
-- householder's details are not theirs to have. Per invoice, because it
-- depends who is receiving it, not on a setting he would have to remember to
-- flip back. Name defaults on (an invoice needs somebody on it); the phone
-- number defaults off, because it has no business being on a bill.
ALTER TABLE hf_invoices ADD COLUMN show_cust_name    INTEGER NOT NULL DEFAULT 1;
ALTER TABLE hf_invoices ADD COLUMN show_cust_address INTEGER NOT NULL DEFAULT 1;
ALTER TABLE hf_invoices ADD COLUMN show_cust_phone   INTEGER NOT NULL DEFAULT 0;
