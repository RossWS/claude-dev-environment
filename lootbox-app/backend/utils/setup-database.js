const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Database setup utility
class DatabaseSetup {
    constructor() {
        this.dbPath = process.env.DB_PATH || path.join(__dirname, '../../database/lootbox.db');
        this.schemaPath = path.join(__dirname, '../../database/schema.sql');
        this.db = null;
    }

    async setup() {
        try {
            console.log('🏗️  Setting up database...');
            
            // Ensure database directory exists
            const dbDir = path.dirname(this.dbPath);
            if (!fs.existsSync(dbDir)) {
                fs.mkdirSync(dbDir, { recursive: true });
                console.log(`📁 Created database directory: ${dbDir}`);
            }

            // Connect to database
            await this.connect();

            // Run schema
            await this.runSchema();

            // Seed initial data
            await this.seedData();

            console.log('✅ Database setup complete!');
            
        } catch (error) {
            console.error('❌ Database setup failed:', error);
            throw error;
        } finally {
            if (this.db) {
                this.db.close();
            }
        }
    }

    connect() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    reject(err);
                } else {
                    console.log(`🔗 Connected to SQLite database: ${this.dbPath}`);
                    resolve();
                }
            });
        });
    }

    async runSchema() {
        try {
            const schema = fs.readFileSync(this.schemaPath, 'utf8');
            const statements = schema.split(';').filter(stmt => stmt.trim());
            
            for (const statement of statements) {
                if (statement.trim()) {
                    await this.run(statement);
                }
            }
            
            console.log('📋 Database schema created successfully');
        } catch (error) {
            console.error('❌ Schema creation failed:', error);
            throw error;
        }
    }

    async seedData() {
        try {
            // Create admin user with secure password generation
            const bcrypt = require('bcryptjs');
            const crypto = require('crypto');
            
            // Generate secure admin password if not provided
            let adminPassword = process.env.ADMIN_PASSWORD;
            if (!adminPassword) {
                adminPassword = crypto.randomBytes(16).toString('hex') + 'A1!';
                console.warn('🔐 No ADMIN_PASSWORD set. Generated secure password:');
                console.warn(`   Email: admin@discoverybox.app`);
                console.warn(`   Password: ${adminPassword}`);
                console.warn('   SAVE THIS PASSWORD - it will not be shown again!');
            }
            
            // Validate password strength
            if (adminPassword.length < 12) {
                throw new Error('Admin password must be at least 12 characters long');
            }
            
            const adminEmail = process.env.ADMIN_EMAIL || 'admin@discoverybox.app';
            const hashedPassword = await bcrypt.hash(adminPassword, 12);

            await this.run(`
                INSERT OR IGNORE INTO users (username, email, password_hash, is_admin)
                VALUES (?, ?, ?, ?)
            `, ['admin', adminEmail, hashedPassword, true]);

            console.log('👑 Admin user created successfully');

            // Sample content from your original data
            const sampleContent = [
                {
                    title: "Dune: Part Two",
                    type: "movie",
                    critics_score: 92,
                    audience_score: 95,
                    imdb_rating: 8.8,
                    year: 2024,
                    month: "March",
                    duration: "166 min",
                    description: "Paul Atreides unites with Chani and the Fremen while on a path of revenge against those who destroyed his family.",
                    certified_fresh: true,
                    verified_hot: true,
                    platforms: '["Max", "Apple TV", "Amazon Prime"]'
                },
                {
                    title: "The Wild Robot",
                    type: "movie",
                    critics_score: 98,
                    audience_score: 98,
                    imdb_rating: 8.3,
                    year: 2024,
                    month: "September",
                    duration: "102 min",
                    description: "Robot Roz awakens on a deserted island and learns to adapt, eventually becoming the adoptive parent of an orphaned gosling.",
                    certified_fresh: true,
                    verified_hot: true,
                    platforms: '["Apple TV", "Amazon Prime", "Vudu"]'
                },
                {
                    title: "The Bear",
                    type: "series",
                    critics_score: 100,
                    audience_score: 89,
                    imdb_rating: 8.7,
                    year: 2022,
                    month: "June",
                    duration: "30 min",
                    description: "A young chef from the fine dining world returns to Chicago to run his family's sandwich shop.",
                    certified_fresh: true,
                    verified_hot: true,
                    platforms: '["Hulu", "Disney+"]'
                }
            ];

            for (const content of sampleContent) {
                const qualityScore = this.calculateQualityScore(content);
                const rarity = this.getRarity(qualityScore);
                
                await this.run(`
                    INSERT OR IGNORE INTO content (
                        title, type, critics_score, audience_score, imdb_rating,
                        year, month, duration, description, certified_fresh,
                        verified_hot, platforms, quality_score, rarity_tier
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    content.title, content.type, content.critics_score,
                    content.audience_score, content.imdb_rating, content.year,
                    content.month, content.duration, content.description,
                    content.certified_fresh, content.verified_hot,
                    content.platforms, qualityScore, rarity.tier
                ]);
            }

            console.log('🎬 Sample content added to database');
            
        } catch (error) {
            console.error('❌ Data seeding failed:', error);
            throw error;
        }
    }

    // Helper method to run SQL statements
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

    // Quality score calculation (same as frontend)
    calculateQualityScore(item) {
        const criticWeight = 0.65;
        const audienceWeight = 0.35;
        const baseScore = (item.critics_score * criticWeight) + (item.audience_score * audienceWeight);
        
        const certifiedBonus = item.certified_fresh ? 5 : 0;
        const hotBonus = item.verified_hot ? 3 : 0;
        const imdbBonus = item.imdb_rating >= 8.0 ? 7 : item.imdb_rating >= 7.5 ? 4 : 0;
        
        return Math.round(baseScore + certifiedBonus + hotBonus + imdbBonus);
    }

    // Rarity determination
    getRarity(score) {
        if (score >= 95) return { tier: 'mythic', label: 'MYTHIC' };
        if (score >= 90) return { tier: 'legendary', label: 'LEGENDARY' };
        if (score >= 85) return { tier: 'epic', label: 'EPIC' };
        if (score >= 80) return { tier: 'rare', label: 'RARE' };
        if (score >= 75) return { tier: 'uncommon', label: 'UNCOMMON' };
        return { tier: 'common', label: 'COMMON' };
    }
}

// Run setup if called directly
if (require.main === module) {
    const setup = new DatabaseSetup();
    setup.setup()
        .then(() => {
            console.log('🎉 Setup completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Setup failed:', error);
            process.exit(1);
        });
}

module.exports = DatabaseSetup;