-- HeatFix Mcr Limited — the review ask on every invoice
--
-- The best moment to ask for a Google review is the moment the customer is
-- looking at the bill for work they are happy with. So the invoice carries a
-- QR code they can scan off the paper, and the email and WhatsApp message
-- carry the same link as text.
--
-- The QR is drawn from this URL at render time, so changing the link here
-- changes every future invoice and nothing has to be re-uploaded.

ALTER TABLE hf_settings ADD COLUMN review_url TEXT;

UPDATE hf_settings SET review_url = 'https://g.page/r/CUWoaXZnQhlqEAE/review'
WHERE id = 1 AND (review_url IS NULL OR review_url = '');
