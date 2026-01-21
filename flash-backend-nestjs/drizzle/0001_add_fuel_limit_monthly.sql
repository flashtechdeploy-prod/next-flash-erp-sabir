-- Add monthly fuel limit tracking to vehicles
ALTER TABLE "vehicles" ADD COLUMN IF NOT EXISTS "fuel_limit_monthly" real;
