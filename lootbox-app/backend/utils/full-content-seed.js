const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Database setup utility for full content
class FullContentSeeder {
    constructor() {
        this.dbPath = process.env.DB_PATH || path.join(__dirname, '../../database/lootbox.db');
        this.db = null;
    }

    async seed() {
        try {
            console.log('🎬 Seeding full content database...');
            
            // Connect to database
            await this.connect();

            // Clear existing content to avoid duplicates
            await this.clearExistingContent();

            // Add all movies and series
            await this.addMovies();
            await this.addSeries();

            console.log('✅ Full content seeding complete!');
            
        } catch (error) {
            console.error('❌ Content seeding failed:', error);
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

    async clearExistingContent() {
        console.log('🧹 Clearing existing content...');
        await this.run('DELETE FROM content');
        console.log('✅ Existing content cleared');
    }

    async addMovies() {
        console.log('🎬 Adding movies...');
        
        const movies = [
            {
                title: "Dune: Part Two",
                criticsScore: 92,
                audienceScore: 95,
                imdbRating: 8.8,
                year: 2024,
                month: "March",
                duration: "166 min",
                description: "Paul Atreides unites with Chani and the Fremen while on a path of revenge against those who destroyed his family. Facing a choice between the love of his life and the fate of the universe, he must prevent a terrible future.",
                certifiedFresh: true,
                verifiedHot: true,
                platforms: ["Max", "Apple TV", "Amazon Prime"]
            },
            {
                title: "Anora",
                criticsScore: 93,
                audienceScore: 90,
                imdbRating: 7.4,
                year: 2024,
                month: "October",
                duration: "139 min",
                description: "A young Brooklyn stripper's whirlwind romance with the son of a Russian oligarch leads to chaos when his family intervenes. Sean Baker's Palme d'Or winner features a star-making performance from Mikey Madison.",
                certifiedFresh: true,
                verifiedHot: false,
                platforms: ["Hulu", "Apple TV", "Amazon Prime"]
            },
            {
                title: "Wicked",
                criticsScore: 92,
                audienceScore: 96,
                imdbRating: 7.4,
                year: 2024,
                month: "November",
                duration: "160 min",
                description: "The untold story of the witches of Oz. Elphaba and Glinda's friendship at Shiz University leads them to fulfill their destinies as the Good Witch and the Wicked Witch of the West.",
                certifiedFresh: true,
                verifiedHot: true,
                platforms: ["In Theaters", "Coming to Digital"]
            },
            {
                title: "Conclave",
                criticsScore: 93,
                audienceScore: 86,
                imdbRating: 7.4,
                year: 2024,
                month: "October",
                duration: "120 min",
                description: "Cardinal Lawrence oversees the secretive papal conclave after the Pope's death, uncovering a conspiracy that could shake the Catholic Church. Ralph Fiennes delivers a career-defining performance.",
                certifiedFresh: true,
                verifiedHot: false,
                platforms: ["Apple TV", "Amazon Prime", "Vudu"]
            },
            {
                title: "The Wild Robot",
                criticsScore: 98,
                audienceScore: 98,
                imdbRating: 8.3,
                year: 2024,
                month: "September",
                duration: "102 min",
                description: "Robot Roz awakens on a deserted island and learns to adapt, eventually becoming the adoptive parent of an orphaned gosling. A heartwarming DreamWorks animation about family and belonging.",
                certifiedFresh: true,
                verifiedHot: true,
                platforms: ["Apple TV", "Amazon Prime", "Vudu"]
            },
            {
                title: "Inside Out 2",
                criticsScore: 91,
                audienceScore: 95,
                imdbRating: 7.8,
                year: 2024,
                month: "June",
                duration: "96 min",
                description: "Riley is now a teenager, and her emotions must navigate new feelings like Anxiety and Embarrassment. Pixar's sequel became the highest-grossing animated film of all time.",
                certifiedFresh: true,
                verifiedHot: true,
                platforms: ["Disney+", "Apple TV", "Amazon Prime"]
            },
            {
                title: "Challengers",
                criticsScore: 88,
                audienceScore: 85,
                imdbRating: 7.2,
                year: 2024,
                month: "April",
                duration: "131 min",
                description: "A former tennis prodigy turned coach transforms her husband into a champion. To overcome a losing streak, he must face his former best friend and her ex-boyfriend. Zendaya stars in Luca Guadagnino's sexy sports drama.",
                certifiedFresh: true,
                verifiedHot: false,
                platforms: ["MGM+", "Amazon Prime", "Apple TV"]
            },
            {
                title: "Hit Man",
                criticsScore: 95,
                audienceScore: 87,
                imdbRating: 7.0,
                year: 2024,
                month: "June",
                duration: "115 min",
                description: "A strait-laced professor moonlights as a fake hitman for the police, but his life spirals when he falls for a woman who wants to hire him. Glen Powell stars in Richard Linklater's dark comedy.",
                certifiedFresh: true,
                verifiedHot: false,
                platforms: ["Netflix"]
            },
            {
                title: "The Substance",
                criticsScore: 90,
                audienceScore: 83,
                imdbRating: 7.5,
                year: 2024,
                month: "September",
                duration: "141 min",
                description: "A fading celebrity takes a black-market drug that creates a younger, better version of herself. Demi Moore stars in this body horror sensation that won Best Screenplay at Cannes.",
                certifiedFresh: true,
                verifiedHot: false,
                platforms: ["MUBI", "Apple TV", "Amazon Prime"]
            },
            {
                title: "Civil War",
                criticsScore: 81,
                audienceScore: 85,
                imdbRating: 7.1,
                year: 2024,
                month: "April",
                duration: "109 min",
                description: "Military-embedded journalists race to reach Washington D.C. before rebel factions descend on the White House. Alex Garland's provocative thriller examines a divided America.",
                certifiedFresh: true,
                verifiedHot: false,
                platforms: ["Max", "Apple TV", "Amazon Prime"]
            },
            {
                title: "All We Imagine as Light",
                criticsScore: 99,
                audienceScore: 88,
                imdbRating: 7.8,
                year: 2024,
                month: "November",
                duration: "118 min",
                description: "The lives of working-class women in contemporary Mumbai are explored in this luminous drama. Payal Kapadia's debut won the Grand Prix at Cannes Film Festival.",
                certifiedFresh: true,
                verifiedHot: false,
                platforms: ["In Theaters", "Coming Soon"]
            },
            {
                title: "Love Lies Bleeding",
                criticsScore: 94,
                audienceScore: 75,
                imdbRating: 6.8,
                year: 2024,
                month: "March",
                duration: "104 min",
                description: "A reclusive gym manager falls for an ambitious bodybuilder, leading them down a violent path. Kristen Stewart stars in this neo-noir thriller from Rose Glass.",
                certifiedFresh: true,
                verifiedHot: false,
                platforms: ["Max", "Apple TV", "Amazon Prime"]
            },
            {
                title: "Furiosa: A Mad Max Saga",
                criticsScore: 90,
                audienceScore: 89,
                imdbRating: 7.7,
                year: 2024,
                month: "May",
                duration: "148 min",
                description: "Young Furiosa is snatched from the Green Place and falls into a biker horde led by Warlord Dementus. Anya Taylor-Joy stars in George Miller's explosive prequel.",
                certifiedFresh: true,
                verifiedHot: true,
                platforms: ["Max", "Apple TV", "Amazon Prime"]
            },
            {
                title: "A Real Pain",
                criticsScore: 96,
                audienceScore: 88,
                imdbRating: 7.6,
                year: 2024,
                month: "November",
                duration: "90 min",
                description: "Mismatched cousins reunite for a tour through Poland to honor their grandmother. Jesse Eisenberg writes, directs and stars opposite Kieran Culkin in this poignant dramedy.",
                certifiedFresh: true,
                verifiedHot: false,
                platforms: ["Searchlight", "Coming to Hulu"]
            },
            {
                title: "Alien: Romulus",
                criticsScore: 80,
                audienceScore: 85,
                imdbRating: 7.2,
                year: 2024,
                month: "August",
                duration: "119 min",
                description: "Young space colonizers scavenging a derelict station face the universe's most terrifying life form. Fede Álvarez reinvigorates the franchise with fresh frights.",
                certifiedFresh: true,
                verifiedHot: true,
                platforms: ["Hulu", "Apple TV", "Amazon Prime"]
            },
            {
                title: "Deadpool & Wolverine",
                criticsScore: 79,
                audienceScore: 95,
                imdbRating: 7.8,
                year: 2024,
                month: "July",
                duration: "128 min",
                description: "Deadpool's peaceful existence ends when the TVA recruits him to help safeguard the multiverse. Ryan Reynolds and Hugh Jackman unite in this irreverent MCU romp.",
                certifiedFresh: true,
                verifiedHot: true,
                platforms: ["Disney+", "Apple TV", "Amazon Prime"]
            },
            {
                title: "Kingdom of the Planet of the Apes",
                criticsScore: 80,
                audienceScore: 86,
                imdbRating: 7.1,
                year: 2024,
                month: "May",
                duration: "145 min",
                description: "Generations after Caesar's reign, a young ape embarks on a journey that will define the future for both apes and humans. Wes Ball breathes new life into the epic franchise.",
                certifiedFresh: true,
                verifiedHot: false,
                platforms: ["Hulu", "Apple TV", "Amazon Prime"]
            },
            {
                title: "The Brutalist",
                criticsScore: 95,
                audienceScore: 82,
                imdbRating: 7.9,
                year: 2024,
                month: "December",
                duration: "215 min",
                description: "Visionary architect László Toth escapes post-war Europe to rebuild his life in America. Adrien Brody stars in Brady Corbet's epic about the immigrant experience.",
                certifiedFresh: true,
                verifiedHot: false,
                platforms: ["A24", "In Theaters"]
            },
            {
                title: "Beetlejuice Beetlejuice",
                criticsScore: 76,
                audienceScore: 82,
                imdbRating: 6.9,
                year: 2024,
                month: "September",
                duration: "105 min",
                description: "Three generations of the Deetz family return to Winter River, where Beetlejuice is still waiting. Tim Burton and Michael Keaton reunite for this madcap sequel.",
                certifiedFresh: true,
                verifiedHot: true,
                platforms: ["Max", "Apple TV", "Amazon Prime"]
            },
            {
                title: "We Live in Time",
                criticsScore: 79,
                audienceScore: 88,
                imdbRating: 7.4,
                year: 2024,
                month: "October",
                duration: "108 min",
                description: "A couple brought together by surprise navigate life's ups and downs through snapshots of their relationship. Andrew Garfield and Florence Pugh's chemistry anchors this emotional journey.",
                certifiedFresh: true,
                verifiedHot: false,
                platforms: ["A24", "Apple TV", "Amazon Prime"]
            },
            {
                title: "Saturday Night",
                criticsScore: 79,
                audienceScore: 83,
                imdbRating: 7.4,
                year: 2024,
                month: "October",
                duration: "109 min",
                description: "At 11:30pm on October 11, 1975, a ferocious troupe of young comedians changed television forever. Jason Reitman captures the chaos behind SNL's first broadcast.",
                certifiedFresh: true,
                verifiedHot: false,
                platforms: ["Sony", "Apple TV", "Amazon Prime"]
            }
        ];

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
        console.log('📺 Adding TV series...');
        
        const series = [
            {
                title: "Shōgun",
                criticsScore: 99,
                audienceScore: 93,
                imdbRating: 8.7,
                year: 2024,
                month: "February",
                duration: "10 Episodes",
                description: "Set in 17th century Japan, an English sailor becomes embroiled in the politics of the ruling class. This epic historical drama features stunning cinematography and meticulous attention to detail. Winner of multiple Emmy Awards including Best Drama Series.",
                certifiedFresh: true,
                verifiedHot: true,
                platforms: ["Hulu", "Disney+"]
            },
            {
                title: "Baby Reindeer",
                criticsScore: 99,
                audienceScore: 82,
                imdbRating: 7.9,
                year: 2024,
                month: "April",
                duration: "7 Episodes",
                description: "Richard Gadd's haunting true story about his experience with a female stalker and complex trauma. This limited series is a brave exploration of abuse, obsession, and victimhood. Emmy winner for Best Limited Series.",
                certifiedFresh: true,
                verifiedHot: false,
                platforms: ["Netflix"]
            },
            {
                title: "Fallout",
                criticsScore: 94,
                audienceScore: 89,
                imdbRating: 8.5,
                year: 2024,
                month: "April",
                duration: "8 Episodes",
                description: "Based on the beloved video game franchise, survivors navigate the wasteland 200 years after nuclear war. With dark humor and stunning production design, it's a triumph of video game adaptation.",
                certifiedFresh: true,
                verifiedHot: true,
                platforms: ["Prime Video"]
            },
            {
                title: "The Penguin",
                criticsScore: 95,
                audienceScore: 87,
                imdbRating: 8.6,
                year: 2024,
                month: "September",
                duration: "8 Episodes",
                description: "Colin Farrell returns as Oswald Cobblepot in this gritty crime drama set after The Batman. Following Penguin's rise through Gotham's criminal underworld with exceptional performances.",
                certifiedFresh: true,
                verifiedHot: true,
                platforms: ["Max"]
            },
            {
                title: "True Detective: Night Country",
                criticsScore: 92,
                audienceScore: 73,
                imdbRating: 7.7,
                year: 2024,
                month: "January",
                duration: "6 Episodes",
                description: "Jodie Foster and Kali Reis star as detectives investigating the disappearance of eight scientists in Alaska. A haunting return to form for the anthology series.",
                certifiedFresh: true,
                verifiedHot: false,
                platforms: ["Max"]
            },
            {
                title: "Slow Horses (Season 4)",
                criticsScore: 98,
                audienceScore: 91,
                imdbRating: 8.2,
                year: 2024,
                month: "September",
                duration: "6 Episodes",
                description: "Gary Oldman returns as Jackson Lamb, leading his team of MI5 rejects through another conspiracy. This season delivers the series' best blend of espionage thrills and dark humor.",
                certifiedFresh: true,
                verifiedHot: true,
                platforms: ["Apple TV+"]
            },
            {
                title: "The Bear (Season 3)",
                criticsScore: 91,
                audienceScore: 72,
                imdbRating: 8.0,
                year: 2024,
                month: "June",
                duration: "10 Episodes",
                description: "Carmen and the crew navigate running their new fine dining restaurant. While more divisive than previous seasons, it remains a masterclass in character development and cinematography.",
                certifiedFresh: true,
                verifiedHot: false,
                platforms: ["FX", "Hulu"]
            },
            {
                title: "Hacks (Season 3)",
                criticsScore: 100,
                audienceScore: 88,
                imdbRating: 8.3,
                year: 2024,
                month: "May",
                duration: "9 Episodes",
                description: "Deborah and Ava's professional and personal relationship evolves as they tour together. Jean Smart continues to deliver Emmy-worthy performances in this sharp comedy-drama.",
                certifiedFresh: true,
                verifiedHot: true,
                platforms: ["Max"]
            },
            {
                title: "Arcane (Season 2)",
                criticsScore: 100,
                audienceScore: 96,
                imdbRating: 9.0,
                year: 2024,
                month: "November",
                duration: "9 Episodes",
                description: "The animated masterpiece concludes with Vi and Jinx's story reaching its climax. Revolutionary animation and storytelling cement this as one of the greatest animated series ever made.",
                certifiedFresh: true,
                verifiedHot: true,
                platforms: ["Netflix"]
            },
            {
                title: "Nobody Wants This",
                criticsScore: 87,
                audienceScore: 95,
                imdbRating: 7.8,
                year: 2024,
                month: "September",
                duration: "10 Episodes",
                description: "A sex podcaster and a rabbi navigate an unlikely romance across religious and cultural divides. Kristen Bell and Adam Brody's chemistry anchors this sweet romantic comedy.",
                certifiedFresh: true,
                verifiedHot: true,
                platforms: ["Netflix"]
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

    // Quality score calculation (same as frontend)
    calculateQualityScore(item) {
        // Favor critics more heavily (80/20 split instead of 65/35)
        const criticWeight = 0.80;
        const audienceWeight = 0.20;
        const baseScore = (item.criticsScore * criticWeight) + (item.audienceScore * audienceWeight);
        
        // Penalize movies with low critical scores to avoid mainstream bias
        const criticsPenalty = item.criticsScore < 80 ? -5 : 0;
        const lowCriticsMajorPenalty = item.criticsScore < 70 ? -5 : 0; // Additional penalty for very low critics scores
        
        // NEW: Penalize when audience score significantly exceeds critic score (mainstream bias)
        const scoreDifference = item.audienceScore - item.criticsScore;
        let mainstreamPenalty = 0;
        if (scoreDifference > 10) {
            // Moderate penalty for 10-20 point gaps
            mainstreamPenalty = scoreDifference > 20 ? -10 : -5;
        }
        
        // Bonuses remain the same but are now worth less relative to critics score
        const certifiedBonus = item.certifiedFresh ? 5 : 0;
        const hotBonus = item.verifiedHot ? 3 : 0;
        const imdbBonus = item.imdbRating >= 8.5 ? 8 : item.imdbRating >= 8.0 ? 6 : item.imdbRating >= 7.5 ? 3 : 0;
        
        return Math.round(baseScore + certifiedBonus + hotBonus + imdbBonus + criticsPenalty + lowCriticsMajorPenalty + mainstreamPenalty);
    }

    // Rarity determination - PLACEHOLDER (will be recalculated after seeding)
    // This is a temporary assignment. Final rarities are determined by percentile ranking
    // using the rarity-rebalance.js script after all content is added.
    getRarity(score) {
        // Temporary scoring for initial insert - will be rebalanced
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
    const seeder = new FullContentSeeder();
    seeder.seed()
        .then(() => {
            console.log('🎉 Full content seeding completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Full content seeding failed:', error);
            process.exit(1);
        });
}

module.exports = FullContentSeeder;