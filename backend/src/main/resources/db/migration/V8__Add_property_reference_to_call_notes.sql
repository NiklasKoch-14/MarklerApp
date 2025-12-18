-- Add property_id foreign key to call_notes table to link call notes with specific properties
-- This allows agents to track which property was discussed during a client interaction

ALTER TABLE call_notes
ADD COLUMN property_id UUID;

-- Add foreign key constraint
ALTER TABLE call_notes
ADD CONSTRAINT fk_call_notes_property
FOREIGN KEY (property_id) REFERENCES properties(id)
ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX idx_call_notes_property_id ON call_notes(property_id);

-- Add comment to explain the column
COMMENT ON COLUMN call_notes.property_id IS 'Optional reference to a specific property discussed during this call';
