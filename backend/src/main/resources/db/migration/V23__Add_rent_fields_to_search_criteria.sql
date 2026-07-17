-- Suchprofile unterschieden bisher nicht zwischen Kauf- und Mietinteressenten
-- (min_budget/max_budget wurden fuer beides generisch verwendet). Kauf/Miete wird
-- ueber das bereits vorhandene clients.client_type (BUYER/RENTER/SELLER) bestimmt;
-- hier kommen nur die fuer Mietsuchende noetigen, spezifischeren Budgetfelder dazu.
ALTER TABLE property_search_criteria ADD COLUMN min_cold_rent DECIMAL(10,2);
ALTER TABLE property_search_criteria ADD COLUMN max_cold_rent DECIMAL(10,2);
ALTER TABLE property_search_criteria ADD COLUMN min_warm_rent DECIMAL(10,2);
ALTER TABLE property_search_criteria ADD COLUMN max_warm_rent DECIMAL(10,2);

CREATE INDEX idx_search_criteria_rent ON property_search_criteria(min_cold_rent, max_cold_rent, min_warm_rent, max_warm_rent);
