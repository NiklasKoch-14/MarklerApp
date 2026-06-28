-- Fix demo property data so matching actually produces results.
--
-- Einfamilienhaus Bogenhausen: bring price/size/rooms inside Stefan Braun's
-- search criteria (HOUSE, München, 600k-900k, 130-180m², 4-5 Zi.)
UPDATE properties
SET price            = 749000.00,
    living_area_sqm  = 155.00,
    rooms            = 4.5,
    updated_at       = CURRENT_TIMESTAMP
WHERE id = 'cccc0002-cccc-4ccc-cccc-cccccccccccc';

-- Stadtvilen-Doppelhaushälfte Stuttgart: change from RESERVED to AVAILABLE
-- so it appears for Julia Fischer (APARTMENT/HAUS Stuttgart ~650k).
UPDATE properties
SET status     = 'AVAILABLE',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 'cccc0003-cccc-4ccc-cccc-cccccccccccc';
