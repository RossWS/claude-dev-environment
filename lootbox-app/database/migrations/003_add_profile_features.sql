-- Migration: Add profile showcase and privacy settings
-- Date: 2025-08-31
-- Description: Adds user showcase table and privacy columns to users table

-- Add new columns to users table for privacy settings
ALTER TABLE users ADD COLUMN profile_public BOOLEAN DEFAULT 0;
ALTER TABLE users ADD COLUMN show_stats BOOLEAN DEFAULT 1;
ALTER TABLE users ADD COLUMN show_activity BOOLEAN DEFAULT 1;
ALTER TABLE users ADD COLUMN updated_at TIMESTAMP;

-- Create user showcase table for top 5 featured items
CREATE TABLE user_showcase (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    unlock_id INTEGER NOT NULL,
    position INTEGER NOT NULL,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (unlock_id) REFERENCES user_unlocks(id) ON DELETE CASCADE,
    UNIQUE(user_id, unlock_id), -- Prevent duplicate showcase items
    UNIQUE(user_id, position) -- Prevent duplicate positions
);

-- Add index for performance
CREATE INDEX idx_user_showcase_user_id ON user_showcase(user_id);