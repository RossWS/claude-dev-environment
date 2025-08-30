const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
    constructor() {
        const dbPath = process.env.DB_PATH || path.join(__dirname, '../../database/lootbox.db');
        this.db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('Error opening database:', err.message);
            } else {
                console.log('📦 Connected to SQLite database');
                this.db.run('PRAGMA foreign_keys = ON'); // Enable foreign key constraints
            }
        });
    }

    // Promise wrapper for database operations
    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID, changes: this.changes });
                }
            });
        });
    }

    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            });
        });
    }

    all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // User management
    async createUser(userData) {
        const sql = `
            INSERT INTO users (username, email, password_hash, is_admin)
            VALUES (?, ?, ?, ?)
        `;
        return await this.run(sql, [
            userData.username,
            userData.email,
            userData.password_hash,
            userData.is_admin || false
        ]);
    }

    async getUserByEmail(email) {
        return await this.get('SELECT * FROM users WHERE email = ?', [email]);
    }

    async getUserById(id) {
        return await this.get('SELECT * FROM users WHERE id = ?', [id]);
    }

    // Content management
    async getContentByType(type, limit = 50) {
        const sql = `
            SELECT * FROM content 
            WHERE type = ? AND is_active = 1 
            ORDER BY date_added DESC 
            LIMIT ?
        `;
        return await this.all(sql, [type, limit]);
    }

    async getHighQualityContent(type, minQuality = 83) {
        const sql = `
            SELECT * FROM content 
            WHERE type = ? AND quality_score >= ? AND is_active = 1
            ORDER BY quality_score DESC
        `;
        return await this.all(sql, [type, minQuality]);
    }

    async addContent(contentData) {
        const sql = `
            INSERT INTO content (
                tmdb_id, type, title, description, critics_score, 
                audience_score, imdb_rating, year, month, duration,
                certified_fresh, verified_hot, platforms, poster_url,
                backdrop_url, genres, cast_crew, quality_score, rarity_tier
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        return await this.run(sql, [
            contentData.tmdb_id, contentData.type, contentData.title,
            contentData.description, contentData.critics_score,
            contentData.audience_score, contentData.imdb_rating,
            contentData.year, contentData.month, contentData.duration,
            contentData.certified_fresh, contentData.verified_hot,
            JSON.stringify(contentData.platforms), contentData.poster_url,
            contentData.backdrop_url, JSON.stringify(contentData.genres),
            JSON.stringify(contentData.cast_crew), contentData.quality_score,
            contentData.rarity_tier
        ]);
    }

    // User spins and unlocks
    async getUserSpinsToday(userId) {
        const today = new Date().toISOString().split('T')[0];
        return await this.get(
            'SELECT COUNT(*) as count FROM user_spins WHERE user_id = ? AND spin_date = ?',
            [userId, today]
        );
    }

    async addUserSpin(userId, contentId, type, rarityTier, qualityScore, wasNewUnlock) {
        const sql = `
            INSERT INTO user_spins (user_id, content_id, spin_type, rarity_tier, quality_score, was_new_unlock)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        return await this.run(sql, [userId, contentId, type, rarityTier, qualityScore, wasNewUnlock]);
    }

    async addUserUnlock(userId, contentId, type, rarityTier) {
        const sql = `
            INSERT OR IGNORE INTO user_unlocks (user_id, content_id, spin_type, rarity_tier)
            VALUES (?, ?, ?, ?)
        `;
        return await this.run(sql, [userId, contentId, type, rarityTier]);
    }

    async getUserUnlocks(userId, type = null) {
        let sql = `
            SELECT u.*, c.title, c.poster_url, c.year, c.rarity_tier, c.quality_score
            FROM user_unlocks u
            JOIN content c ON u.content_id = c.id
            WHERE u.user_id = ?
        `;
        const params = [userId];
        
        if (type) {
            sql += ' AND u.spin_type = ?';
            params.push(type);
        }
        
        sql += ' ORDER BY u.unlocked_at DESC';
        return await this.all(sql, params);
    }

    // Admin functions
    async getAdminSetting(key) {
        return await this.get('SELECT * FROM admin_settings WHERE setting_key = ?', [key]);
    }

    async updateAdminSetting(key, value, updatedBy) {
        const sql = `
            UPDATE admin_settings 
            SET setting_value = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
            WHERE setting_key = ?
        `;
        return await this.run(sql, [value, updatedBy, key]);
    }

    async updateUserSpins(userId, spinsUsed, resetDate) {
        const sql = `
            UPDATE users 
            SET daily_spins_used = ?, daily_spins_reset_date = ?
            WHERE id = ?
        `;
        return await this.run(sql, [spinsUsed, resetDate, userId]);
    }

    // Close database connection
    close() {
        return new Promise((resolve) => {
            this.db.close((err) => {
                if (err) {
                    console.error('Error closing database:', err.message);
                } else {
                    console.log('Database connection closed.');
                }
                resolve();
            });
        });
    }
}

// Export singleton instance
module.exports = new Database();