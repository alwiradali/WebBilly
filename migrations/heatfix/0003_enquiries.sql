-- HeatFix Mcr Limited — booking enquiries
--
-- The /book form had no store behind it. With no Web3Forms key it opened a
-- pre-filled WhatsApp draft and then told the visitor "Request sent", which
-- was not true: wa.me only opens a draft, and the visitor still has to press
-- send. On a desktop, where WhatsApp Web wants a QR login, not sending is the
-- normal outcome. So a customer with no heating filled the form in, read that
-- it had been sent, and waited for a call nobody knew to make.
--
-- The enquiry is written here first. WhatsApp and email stay as the ways he
-- gets told, but they are no longer the only place the lead exists.

CREATE TABLE IF NOT EXISTS hf_enquiries (
  id          TEXT PRIMARY KEY,
  created_at  TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'new',   -- new | contacted | booked | closed
  name        TEXT NOT NULL,
  phone       TEXT NOT NULL,
  email       TEXT,
  address     TEXT,
  town        TEXT,
  postcode    TEXT,
  job         TEXT,
  slot        TEXT,                          -- when it suits them
  details     TEXT,
  source      TEXT,                          -- which page it came from
  ua          TEXT
);

-- The dashboard reads newest first, and filters to what has not been dealt
-- with yet.
CREATE INDEX IF NOT EXISTS hf_enq_created ON hf_enquiries (created_at DESC);
CREATE INDEX IF NOT EXISTS hf_enq_status  ON hf_enquiries (status, created_at DESC);
