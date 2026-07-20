-- CLOSED historically absorbed both successful and unsuccessful outcomes (see V18,
-- which already merged the old INACTIVE stage into CLOSED). Split it into two distinct
-- terminal stages so pipeline reporting can tell a win from a lost/inactive lead.
--
-- Existing CLOSED rows default to LOST: the only app code path that has ever set
-- CLOSED is "Kunde als inaktiv markieren" (giving up on a lead), never a completed
-- deal, so LOST is the safe default for pre-existing data.
UPDATE clients SET pipeline_stage = 'LOST' WHERE pipeline_stage = 'CLOSED';
