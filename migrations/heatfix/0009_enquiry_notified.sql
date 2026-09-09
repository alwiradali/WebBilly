-- Did the "you have a new enquiry" email actually go out?
--
-- It did not, and nothing anywhere said so. The notification was sent through
-- Web3Forms behind `if (!key) return`, so an unset HF_WEB3FORMS_KEY meant the
-- function did nothing at all and returned as though it had worked. The one
-- fetch it did make was wrapped in a bare `catch {}` that discarded the error,
-- and its response was never checked -- Web3Forms answers 200 with
-- {"success": false} for a rejected key, which would have been ignored too.
--
-- Three separate ways to fail in silence, on the one message that tells him a
-- customer is waiting. These columns make the outcome part of the record, so
-- the back office can say "saved, but the email did not send" instead of
-- leaving him to notice the gap himself.

-- 'sent', 'failed', or NULL when no attempt was made.
ALTER TABLE hf_enquiries ADD COLUMN notified TEXT;

-- 'resend' or 'web3forms' — which one carried it.
ALTER TABLE hf_enquiries ADD COLUMN notify_via TEXT;

-- Why, when it failed.
ALTER TABLE hf_enquiries ADD COLUMN notify_error TEXT;
