-- Migration to add timezone support
-- This migration adds timezone column to users table

-- Add timezone column to users table
ALTER TABLE users ADD COLUMN timezone VARCHAR(50) DEFAULT NULL;

-- Create index for timezone lookups
CREATE INDEX idx_users_timezone ON users(timezone);