-- Add status column to leave_periods table
ALTER TABLE leave_periods 
ADD COLUMN status TEXT DEFAULT 'approved';
