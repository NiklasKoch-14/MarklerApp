-- Standort-Feature (Issue #19): real address geocoding + map-based radius search,
-- replacing pure city/postal-code text matching. Properties get geocoded coordinates
-- (resolved server-side from their address fields); client search criteria get a
-- pin (lat/lng) + radius set interactively on a map, plus a flag to control whether
-- matching hard-filters to that radius or only uses it for scoring.
--
-- All new columns are nullable (except restrict_to_search_radius, which defaults to
-- true) so existing rows keep working through the text-based matching fallback until
-- they're next saved/geocoded — see PropertyMatchingService for the fallback logic.

ALTER TABLE properties ADD COLUMN latitude DECIMAL(10,7);
ALTER TABLE properties ADD COLUMN longitude DECIMAL(10,7);

ALTER TABLE property_search_criteria ADD COLUMN latitude DECIMAL(10,7);
ALTER TABLE property_search_criteria ADD COLUMN longitude DECIMAL(10,7);
ALTER TABLE property_search_criteria ADD COLUMN search_radius_km INTEGER;
ALTER TABLE property_search_criteria ADD COLUMN restrict_to_search_radius BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX idx_properties_geo ON properties(latitude, longitude);
CREATE INDEX idx_search_criteria_geo ON property_search_criteria(latitude, longitude);
