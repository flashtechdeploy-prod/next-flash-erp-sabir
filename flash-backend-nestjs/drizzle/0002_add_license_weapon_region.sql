-- Add license_number and weapon_region columns to restricted_inventory_items table
ALTER TABLE restricted_inventory_items ADD COLUMN IF NOT EXISTS license_number TEXT;
ALTER TABLE restricted_inventory_items ADD COLUMN IF NOT EXISTS weapon_region TEXT;
