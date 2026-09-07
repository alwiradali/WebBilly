-- HeatFix Mcr Limited — labour and parts as separate sections
--
-- A trades invoice reads as two things: what the engineer did, and what he
-- fitted. Putting them in one undifferentiated list makes a customer add up
-- in their head to work out what the visit itself cost, and it is the first
-- thing a landlord or a letting agent asks.
--
-- 'labour' is the default because a service or a repair with no parts is the
-- commonest job he does, and it is what every existing line already is.

ALTER TABLE hf_invoice_items ADD COLUMN kind TEXT NOT NULL DEFAULT 'labour';
