-- Create database if it doesn't exist
SELECT 'CREATE DATABASE realestate_crm'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'realestate_crm')\gexec

-- Grant privileges to user
GRANT ALL PRIVILEGES ON DATABASE realestate_crm TO crmuser;