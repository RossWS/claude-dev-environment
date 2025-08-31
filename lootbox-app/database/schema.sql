-- Content Discovery Loot Box Database Schema

-- Users table for authentication and profile
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    daily_spins_used INTEGER DEFAULT 0,
    daily_spins_reset_date DATE DEFAULT CURRENT_DATE,
    admin_override_spins INTEGER DEFAULT 0,
    profile_public BOOLEAN DEFAULT FALSE,
    show_stats BOOLEAN DEFAULT TRUE,
    show_activity BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- Content table for movies and TV shows
CREATE TABLE content (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tmdb_id INTEGER UNIQUE, -- The Movie Database ID for API lookup
    type VARCHAR(10) NOT NULL, -- 'movie' or 'series'
    title VARCHAR(255) NOT NULL,
    description TEXT,
    critics_score INTEGER,
    audience_score INTEGER,
    imdb_rating DECIMAL(3,1),
    year INTEGER,
    month VARCHAR(20),
    duration VARCHAR(20),
    certified_fresh BOOLEAN DEFAULT FALSE,
    verified_hot BOOLEAN DEFAULT FALSE,
    platforms TEXT, -- JSON array of streaming platforms
    poster_url VARCHAR(500),
    backdrop_url VARCHAR(500),
    genres TEXT, -- JSON array of genres
    cast_crew TEXT, -- JSON array of main cast/crew
    date_added TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE, -- For soft delete/archiving
    quality_score INTEGER, -- Calculated quality score
    rarity_tier VARCHAR(20) -- common, uncommon, rare, epic, legendary, mythic
);

-- User unlocks/trophy cabinet
CREATE TABLE user_unlocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    content_id INTEGER NOT NULL,
    unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    spin_type VARCHAR(10), -- 'movie' or 'series'
    rarity_tier VARCHAR(20),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE,
    UNIQUE(user_id, content_id) -- Prevent duplicate unlocks
);

-- Daily spin tracking
CREATE TABLE user_spins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    content_id INTEGER NOT NULL,
    spin_date DATE DEFAULT CURRENT_DATE,
    spin_type VARCHAR(10), -- 'movie' or 'series'
    rarity_tier VARCHAR(20),
    quality_score INTEGER,
    was_new_unlock BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE
);

-- User showcase (top 5 featured items)
CREATE TABLE user_showcase (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    unlock_id INTEGER NOT NULL,
    position INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (unlock_id) REFERENCES user_unlocks(id) ON DELETE CASCADE,
    UNIQUE(user_id, unlock_id), -- Prevent duplicate showcase items
    UNIQUE(user_id, position) -- Prevent duplicate positions
);

-- Admin settings and overrides
CREATE TABLE admin_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    description TEXT,
    updated_by INTEGER,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (updated_by) REFERENCES users(id)
);

-- Content lookup queue for automated updates
CREATE TABLE content_lookup_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tmdb_id INTEGER NOT NULL,
    type VARCHAR(10) NOT NULL, -- 'movie' or 'series'
    status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
    priority INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_content_type ON content(type);
CREATE INDEX idx_content_date_added ON content(date_added);
CREATE INDEX idx_content_quality_score ON content(quality_score);
CREATE INDEX idx_user_unlocks_user_id ON user_unlocks(user_id);
CREATE INDEX idx_user_spins_user_date ON user_spins(user_id, spin_date);
CREATE INDEX idx_user_showcase_user_id ON user_showcase(user_id);
CREATE INDEX idx_content_lookup_status ON content_lookup_queue(status);

-- Insert default admin settings
INSERT INTO admin_settings (setting_key, setting_value, description) VALUES
('daily_spin_limit', '3', 'Default number of spins allowed per user per day'),
('quality_score_threshold', '83', 'Minimum quality score for content to appear in loot box'),
('legendary_probability', '0.05', 'Probability of legendary items (5%)'),
('epic_probability', '0.15', 'Probability of epic items (15%)'),
('rare_probability', '0.30', 'Probability of rare items (30%)'),
('auto_content_updates', 'true', 'Enable automatic content database updates'),
('tmdb_api_enabled', 'true', 'Enable The Movie Database API integration');