-- Consolidate 6 pipeline stages to 4: OFFER→VIEWING, INACTIVE→CLOSED
UPDATE clients SET pipeline_stage = 'VIEWING' WHERE pipeline_stage = 'OFFER';
UPDATE clients SET pipeline_stage = 'CLOSED'  WHERE pipeline_stage = 'INACTIVE';

-- Owner contact fields on properties (internal, not shown in exposé)
ALTER TABLE properties ADD COLUMN IF NOT EXISTS owner_name  VARCHAR(100);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS owner_phone VARCHAR(20);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS owner_email VARCHAR(255);
