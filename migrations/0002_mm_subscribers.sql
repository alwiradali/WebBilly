-- Molecular Miracles — the mailing list.
--
-- Lives in Lynsey's own Cloudflare account, bound to her Worker as
-- SUBSCRIBERS. See docs/molecular-miracles-list.md for how to create it.
--
-- Deliberately small. This table is a record of who said yes, when, and from
-- where — not a CRM. Anything else she needs about a parent is already in the
-- enquiry that brought them, or in Payhip.

CREATE TABLE IF NOT EXISTS subscribers (
  -- The address is the identity, lower-cased by the Worker before it arrives,
  -- so signing up twice updates one row instead of making a second one.
  email           TEXT PRIMARY KEY,

  -- The path they signed up from (/masterclasses, /areas/glasgow, …), so she
  -- can see which pages actually earn an address.
  source          TEXT,

  -- When they ticked the box. This is the evidence that the consent existed,
  -- which is the thing she would need if anyone ever asked.
  consented_at    TEXT NOT NULL,

  -- Set when they ask to come off. The row stays: deleting it would lose the
  -- record that they asked, and they would be re-added by the next import.
  unsubscribed_at TEXT
);

-- She will always be reading this as "everyone still on the list, newest
-- first", so that is the index.
CREATE INDEX IF NOT EXISTS subscribers_live
  ON subscribers (unsubscribed_at, consented_at DESC);
