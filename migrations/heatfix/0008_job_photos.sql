-- Photos of the work, attached to the job they belong to.
--
-- They live in D1 alongside the invoice rather than in a bucket, for the same
-- reason the logo does: one store to back up, nothing to wire up in the
-- Cloudflare dashboard, and no orphaned file left behind when an invoice is
-- deleted (ON DELETE CASCADE sees to that). The back office shrinks every
-- photo in the browser before it is ever sent, so a row here is a couple of
-- hundred kilobytes, not the four megabytes a modern phone camera produces.
--
-- `data` is base64 WITHOUT the "data:image/jpeg;base64," prefix -- the mime
-- type is its own column, so the prefix would be the same 23 bytes repeated on
-- every row. The photo endpoint decodes this back to real bytes, so the
-- customer's browser caches an ordinary image rather than re-parsing a data
-- URL inside a JSON payload every time the page opens.

CREATE TABLE IF NOT EXISTS hf_invoice_photos (
  id         TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL REFERENCES hf_invoices(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  position   INTEGER NOT NULL DEFAULT 0,
  caption    TEXT,
  mime       TEXT NOT NULL DEFAULT 'image/jpeg',
  bytes      INTEGER NOT NULL DEFAULT 0,
  data       TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_hf_photo_inv ON hf_invoice_photos(invoice_id, position);
