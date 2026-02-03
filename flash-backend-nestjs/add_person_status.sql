-- Add person_status column to employees table
ALTER TABLE employees ADD COLUMN IF NOT EXISTS person_status TEXT;
