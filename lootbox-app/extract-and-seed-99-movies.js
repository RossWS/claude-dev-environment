const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Script to extract 99 movies from the HTML file and seed the database
class ExtendedMovieSeeder {
    constructor() {
        this.dbPath = path.join(__dirname, 'database/lootbox.db');
        this.htmlPath = '/workspaces/claude-dev-environment/content-lootbox.html';
        this.db = null;
    }

    async seed() {
        try {
            console.log('🎬 Extracting and seeding 99 movies...');
            
            // Connect to database
            await this.connect();

            // Extract movies from HTML file
            const movies = await this.extractMoviesFromHTML();
            console.log(`📊 Found ${movies.length} movies in HTML file`);

            // Clear existing content
            await this.clearExistingContent();

            // Add all movies
            await this.addMovies(movies);

            // Add some TV series for variety (from the existing seed)
            await this.addSeries();

            console.log('✅ Extended movie seeding complete!');
            
        } catch (error) {
            console.error('❌ Movie seeding failed:', error);
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
                    console.log(`🔗 Connected to database: ${this.dbPath}`);
                    resolve();
                }
            });
        });
    }

    async extractMoviesFromHTML() {
        const htmlContent = fs.readFileSync(this.htmlPath, 'utf8');
        
        // Find the movies array in the JavaScript
        const moviesMatch = htmlContent.match(/movies:\s*\[([\s\S]*?)\],\s*series:/);
        if (!moviesMatch) {
            throw new Error('Could not find movies array in HTML file');
        }

        const moviesString = moviesMatch[1];
        
        // Parse the movie objects manually
        const movies = [];
        const movieMatches = moviesString.matchAll(/\{\s*title:\s*"([^"]+)",?\s*criticsScore:\s*(\d+),?\s*audienceScore:\s*(\d+),?\s*imdbRating:\s*([0-9.]+),?\s*year:\s*(\d+),?\s*month:\s*"([^"]+)",?\s*duration:\s*"([^"]+)",?\s*description:\s*"([^"]+)",?\s*certifiedFresh:\s*(true|false),?\s*verifiedHot:\s*(true|false),?\s*platforms:\s*\[([^\]]+)\][^}]*\}/g);

        for (const match of movieMatches) {
            const [, title, criticsScore, audienceScore, imdbRating, year, month, duration, description, certifiedFresh, verifiedHot, platforms] = match;
            
            // Parse platforms
            const platformsArray = platforms.split(',').map(p => p.trim().replace(/"/g, ''));
            
            movies.push({
                title,
                criticsScore: parseInt(criticsScore),
                audienceScore: parseInt(audienceScore),
                imdbRating: parseFloat(imdbRating),
                year: parseInt(year),
                month,
                duration,
                description,
                certifiedFresh: certifiedFresh === 'true',
                verifiedHot: verifiedHot === 'true',
                platforms: platformsArray
            });
        }

        return movies;
    }

    async clearExistingContent() {
        console.log('🧹 Clearing existing content...');
        await this.run('DELETE FROM content');
        console.log('✅ Existing content cleared');
    }

    async addMovies(movies) {
        console.log(`🎬 Adding ${movies.length} movies...`);
        
        for (const movie of movies) {
            const qualityScore = this.calculateQualityScore(movie);
            const rarity = this.getRarity(qualityScore);
            
            await this.run(`
                INSERT INTO content (
                    title, type, critics_score, audience_score, imdb_rating,
                    year, month, duration, description, certified_fresh,
                    verified_hot, platforms, quality_score, rarity_tier
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                movie.title, "movie", movie.criticsScore,
                movie.audienceScore, movie.imdbRating, movie.year,
                movie.month, movie.duration, movie.description,
                movie.certifiedFresh, movie.verifiedHot,
                JSON.stringify(movie.platforms), qualityScore, rarity.tier
            ]);
        }

        console.log(`✅ Added ${movies.length} movies`);
    }

    async addSeries() {
        console.log('📺 Adding some TV series for variety...');
        
        const series = [
            {
                title: "Shōgun",
                criticsScore: 99,
                audienceScore: 93,
                imdbRating: 8.7,
                year: 2024,
                month: "February",
                duration: "10 Episodes",
                description: "Set in 17th century Japan, an English sailor becomes embroiled in the politics of the ruling class.",
                certifiedFresh: true,
                verifiedHot: true,
                platforms: ["Hulu", "Disney+"]
            },
            {
                title: "Fallout",
                criticsScore: 94,
                audienceScore: 89,
                imdbRating: 8.5,
                year: 2024,
                month: "April",
                duration: "8 Episodes",
                description: "Based on the beloved video game franchise, survivors navigate the wasteland 200 years after nuclear war.",
                certifiedFresh: true,
                verifiedHot: true,
                platforms: ["Prime Video"]
            }
        ];

        for (const show of series) {
            const qualityScore = this.calculateQualityScore(show);
            const rarity = this.getRarity(qualityScore);
            
            await this.run(`
                INSERT INTO content (
                    title, type, critics_score, audience_score, imdb_rating,
                    year, month, duration, description, certified_fresh,
                    verified_hot, platforms, quality_score, rarity_tier
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                show.title, "series", show.criticsScore,
                show.audienceScore, show.imdbRating, show.year,
                show.month, show.duration, show.description,
                show.certifiedFresh, show.verifiedHot,
                JSON.stringify(show.platforms), qualityScore, rarity.tier
            ]);
        }

        console.log(`✅ Added ${series.length} TV series`);
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

    // Quality score calculation
    calculateQualityScore(item) {
        const criticWeight = 0.80;
        const audienceWeight = 0.20;
        const baseScore = (item.criticsScore * criticWeight) + (item.audienceScore * audienceWeight);
        
        // Penalize low critical scores
        const criticsPenalty = item.criticsScore < 80 ? -5 : 0;
        const lowCriticsMajorPenalty = item.criticsScore < 70 ? -5 : 0;
        
        // NEW: Penalize when audience score significantly exceeds critic score (mainstream bias)
        const scoreDifference = item.audienceScore - item.criticsScore;
        let mainstreamPenalty = 0;
        if (scoreDifference > 10) {
            // Moderate penalty for 10-20 point gaps
            mainstreamPenalty = scoreDifference > 20 ? -10 : -5;
        }
        
        const certifiedBonus = item.certifiedFresh ? 5 : 0;
        const hotBonus = item.verifiedHot ? 3 : 0;
        const imdbBonus = item.imdbRating >= 8.5 ? 8 : item.imdbRating >= 8.0 ? 6 : item.imdbRating >= 7.5 ? 3 : 0;
        
        return Math.round(baseScore + certifiedBonus + hotBonus + imdbBonus + criticsPenalty + lowCriticsMajorPenalty + mainstreamPenalty);
    }

    // Rarity determination
    getRarity(score) {
        if (score >= 100) return { tier: 'mythic', label: 'MYTHIC' };
        if (score >= 95) return { tier: 'legendary', label: 'LEGENDARY' };
        if (score >= 90) return { tier: 'epic', label: 'EPIC' };
        if (score >= 85) return { tier: 'rare', label: 'RARE' };
        if (score >= 80) return { tier: 'uncommon', label: 'UNCOMMON' };
        return { tier: 'common', label: 'COMMON' };
    }
}

// Run seeder if called directly
if (require.main === module) {
    const seeder = new ExtendedMovieSeeder();
    seeder.seed()
        .then(() => {
            console.log('🎉 Extended movie seeding completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Extended movie seeding failed:', error);
            process.exit(1);
        });
}

module.exports = ExtendedMovieSeeder;