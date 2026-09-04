-- HeatFix Mcr Limited — back office
--
-- One engineer's CRM: his own details in one place, a customer book that
-- fills itself in, and invoices that keep their own history. Money is stored
-- in pence as integers so nothing drifts the way floating point does.
--
-- He is VAT registered, so an invoice has to carry the VAT number, the rate,
-- the VAT shown separately and a tax point. Those are columns, not options.

-- ---------------------------------------------------------------- settings
-- A single row (id = 1) holding everything that auto-fills onto an invoice.
CREATE TABLE IF NOT EXISTS hf_settings (
  id              INTEGER PRIMARY KEY CHECK (id = 1),
  business_name   TEXT    NOT NULL DEFAULT 'HeatFix Mcr Limited',
  trading_name    TEXT,
  address         TEXT,                       -- registered office, one per line
  postcode        TEXT,
  phone           TEXT,
  email           TEXT,
  website         TEXT,
  company_no      TEXT,                       -- Companies House number
  vat_number      TEXT,                       -- required on a VAT invoice
  vat_registered  INTEGER NOT NULL DEFAULT 1, -- 0/1
  vat_rate        INTEGER NOT NULL DEFAULT 2000,  -- basis points: 2000 = 20.00%
  gas_safe_no     TEXT,
  logo_data       TEXT,                       -- data: URI, shown on every invoice
  bank_name       TEXT,
  bank_account    TEXT,
  bank_sort       TEXT,
  payment_terms   TEXT    NOT NULL DEFAULT 'Payment due on receipt.',
  invoice_prefix  TEXT    NOT NULL DEFAULT 'HF-',
  next_number     INTEGER NOT NULL DEFAULT 1001,
  template        TEXT    NOT NULL DEFAULT 'classic',
  accent          TEXT    NOT NULL DEFAULT '#0B2E63',
  updated_at      TEXT
);

-- --------------------------------------------------------------- customers
CREATE TABLE IF NOT EXISTS hf_customers (
  id          TEXT PRIMARY KEY,
  created_at  TEXT NOT NULL,
  name        TEXT NOT NULL,
  email       TEXT,
  phone       TEXT,
  address     TEXT,
  postcode    TEXT,
  notes       TEXT
);
CREATE INDEX IF NOT EXISTS idx_hf_cust_name ON hf_customers(name);
CREATE INDEX IF NOT EXISTS idx_hf_cust_pc   ON hf_customers(postcode);

-- ---------------------------------------------------------------- invoices
-- Totals are written at save time, not recalculated on read, so an invoice
-- already sent to a customer can never change because a rate changed later.
CREATE TABLE IF NOT EXISTS hf_invoices (
  id            TEXT PRIMARY KEY,
  number        TEXT NOT NULL UNIQUE,
  created_at    TEXT NOT NULL,
  issued_at     TEXT,                          -- tax point, set when sent
  due_at        TEXT,
  status        TEXT NOT NULL DEFAULT 'draft', -- draft | sent | paid | void
  customer_id   TEXT REFERENCES hf_customers(id),
  -- the customer as they were on the day, so history does not rewrite itself
  cust_name     TEXT NOT NULL,
  cust_email    TEXT,
  cust_phone    TEXT,
  cust_address  TEXT,
  cust_postcode TEXT,
  work_summary  TEXT,
  notes         TEXT,
  net_pence     INTEGER NOT NULL DEFAULT 0,
  vat_pence     INTEGER NOT NULL DEFAULT 0,
  gross_pence   INTEGER NOT NULL DEFAULT 0,
  paid_pence    INTEGER NOT NULL DEFAULT 0,
  vat_rate      INTEGER NOT NULL DEFAULT 2000,
  vat_number    TEXT,                          -- as it stood when issued
  template      TEXT,
  sent_at       TEXT,
  sent_via      TEXT,                          -- email | whatsapp
  paid_at       TEXT
);
CREATE INDEX IF NOT EXISTS idx_hf_inv_status ON hf_invoices(status);
CREATE INDEX IF NOT EXISTS idx_hf_inv_date   ON hf_invoices(created_at);
CREATE INDEX IF NOT EXISTS idx_hf_inv_cust   ON hf_invoices(customer_id);

CREATE TABLE IF NOT EXISTS hf_invoice_items (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id  TEXT NOT NULL REFERENCES hf_invoices(id) ON DELETE CASCADE,
  position    INTEGER NOT NULL DEFAULT 0,
  description TEXT NOT NULL,
  qty         REAL NOT NULL DEFAULT 1,
  unit_pence  INTEGER NOT NULL DEFAULT 0,
  line_pence  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_hf_item_inv ON hf_invoice_items(invoice_id, position);

-- ------------------------------------------------------------------ seed
INSERT OR IGNORE INTO hf_settings (id, phone, email, website, gas_safe_no)
VALUES (1, '07890 452629', 'heatfixmcr@hotmail.com', 'heatfixmcrlimited.co.uk', '627019');
