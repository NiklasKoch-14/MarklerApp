-- The application default for address_country was the English "Germany" (shown
-- verbatim to agents in a German-language app). Aligning existing rows with the
-- new German default "Deutschland" so old and new records behave consistently
-- (Client.getFormattedAddress()/ClientDto.getFormattedAddress() suppress the
-- country suffix only when it matches the default value).
UPDATE clients SET address_country = 'Deutschland' WHERE address_country = 'Germany';
UPDATE properties SET address_country = 'Deutschland' WHERE address_country = 'Germany';
