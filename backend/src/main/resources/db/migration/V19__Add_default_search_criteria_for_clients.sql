-- Add empty search criteria for every client that doesn't have one yet.
-- Empty criteria = no constraints = all properties match (100% score).
-- Agents can then edit the client to add real criteria.
INSERT INTO property_search_criteria (id, client_id, created_at, updated_at)
SELECT gen_random_uuid(), c.id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM clients c
LEFT JOIN property_search_criteria psc ON c.id = psc.client_id
WHERE psc.client_id IS NULL;
