const express = require('express');
const db = require('../utils/database');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const user = await db.getUserById(req.user.userId);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Get user statistics
        const totalUnlocks = await db.get(
            'SELECT COUNT(*) as count FROM user_unlocks WHERE user_id = ?',
            [user.id]
        );

        const totalSpins = await db.get(
            'SELECT COUNT(*) as count FROM user_spins WHERE user_id = ?',
            [user.id]
        );

        const rarityStats = await db.all(`
            SELECT rarity_tier, COUNT(*) as count 
            FROM user_unlocks 
            WHERE user_id = ? 
            GROUP BY rarity_tier
        `, [user.id]);

        res.json({
            success: true,
            profile: {
                id: user.id,
                username: user.username,
                email: user.email,
                memberSince: user.created_at,
                lastLogin: user.last_login,
                stats: {
                    totalUnlocks: totalUnlocks.count,
                    totalSpins: totalSpins.count,
                    rarityBreakdown: rarityStats
                }
            }
        });

    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching user profile'
        });
    }
});

// Get user's trophy cabinet (unlocked content)
router.get('/trophy-cabinet', authenticateToken, async (req, res) => {
    try {
        const { type, rarity, page = 1, limit = 20 } = req.query;
        const userId = req.user.userId;
        const offset = (page - 1) * limit;

        let sql = `
            SELECT 
                u.id as unlock_id,
                u.unlocked_at,
                u.spin_type,
                u.rarity_tier,
                c.id,
                c.title,
                c.description,
                c.critics_score,
                c.audience_score,
                c.imdb_rating,
                c.year,
                c.month,
                c.duration,
                c.poster_url,
                c.backdrop_url,
                c.genres,
                c.platforms,
                c.quality_score
            FROM user_unlocks u
            JOIN content c ON u.content_id = c.id
            WHERE u.user_id = ?
        `;
        
        const params = [userId];

        // Add filters
        if (type && ['movie', 'series'].includes(type)) {
            sql += ' AND u.spin_type = ?';
            params.push(type);
        }

        if (rarity) {
            sql += ' AND u.rarity_tier = ?';
            params.push(rarity);
        }

        sql += ' ORDER BY u.unlocked_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const unlocks = await db.all(sql, params);

        // Get total count for pagination
        let countSql = 'SELECT COUNT(*) as total FROM user_unlocks u WHERE user_id = ?';
        const countParams = [userId];

        if (type && ['movie', 'series'].includes(type)) {
            countSql += ' AND spin_type = ?';
            countParams.push(type);
        }

        if (rarity) {
            countSql += ' AND rarity_tier = ?';
            countParams.push(rarity);
        }

        const totalResult = await db.get(countSql, countParams);
        const total = totalResult.total;

        // Parse JSON fields
        const formattedUnlocks = unlocks.map(unlock => ({
            ...unlock,
            genres: JSON.parse(unlock.genres || '[]'),
            platforms: JSON.parse(unlock.platforms || '[]')
        }));

        res.json({
            success: true,
            trophies: formattedUnlocks,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit),
                hasNext: offset + limit < total,
                hasPrev: page > 1
            }
        });

    } catch (error) {
        console.error('Trophy cabinet error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching trophy cabinet'
        });
    }
});

// Get user's spin history
router.get('/spin-history', authenticateToken, async (req, res) => {
    try {
        const { page = 1, limit = 50 } = req.query;
        const userId = req.user.userId;
        const offset = (page - 1) * limit;

        const spins = await db.all(`
            SELECT 
                s.id,
                s.spin_date,
                s.spin_type,
                s.rarity_tier,
                s.quality_score,
                s.was_new_unlock,
                s.created_at,
                c.title,
                c.poster_url,
                c.year
            FROM user_spins s
            JOIN content c ON s.content_id = c.id
            WHERE s.user_id = ?
            ORDER BY s.created_at DESC
            LIMIT ? OFFSET ?
        `, [userId, parseInt(limit), parseInt(offset)]);

        // Get total count
        const totalResult = await db.get(
            'SELECT COUNT(*) as total FROM user_spins WHERE user_id = ?',
            [userId]
        );

        res.json({
            success: true,
            history: spins,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: totalResult.total,
                pages: Math.ceil(totalResult.total / limit),
                hasNext: offset + limit < totalResult.total,
                hasPrev: page > 1
            }
        });

    } catch (error) {
        console.error('Spin history error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching spin history'
        });
    }
});

// Get user's achievements/statistics
router.get('/achievements', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        // Calculate various achievements
        const achievements = await Promise.all([
            // Total unlocks
            db.get('SELECT COUNT(*) as count FROM user_unlocks WHERE user_id = ?', [userId]),
            
            // Rarity achievements
            db.get('SELECT COUNT(*) as count FROM user_unlocks WHERE user_id = ? AND rarity_tier = "legendary"', [userId]),
            db.get('SELECT COUNT(*) as count FROM user_unlocks WHERE user_id = ? AND rarity_tier = "mythic"', [userId]),
            
            // Type achievements
            db.get('SELECT COUNT(*) as count FROM user_unlocks WHERE user_id = ? AND spin_type = "movie"', [userId]),
            db.get('SELECT COUNT(*) as count FROM user_unlocks WHERE user_id = ? AND spin_type = "series"', [userId]),
            
            // Streak calculations
            db.get(`
                SELECT COUNT(*) as days 
                FROM (
                    SELECT DISTINCT spin_date 
                    FROM user_spins 
                    WHERE user_id = ? 
                    AND spin_date >= date('now', '-30 days')
                ) 
            `, [userId]),
            
            // High quality unlocks
            db.get('SELECT COUNT(*) as count FROM user_unlocks u JOIN content c ON u.content_id = c.id WHERE u.user_id = ? AND c.quality_score >= 90', [userId])
        ]);

        const [
            totalUnlocks,
            legendaryUnlocks,
            mythicUnlocks,
            movieUnlocks,
            seriesUnlocks,
            activeDays,
            highQualityUnlocks
        ] = achievements;

        // Define achievement tiers and rewards
        const achievementList = [
            {
                id: 'first_unlock',
                name: 'First Discovery',
                description: 'Unlock your first piece of content',
                tier: 'bronze',
                unlocked: totalUnlocks.count >= 1,
                progress: Math.min(totalUnlocks.count, 1),
                target: 1
            },
            {
                id: 'collector',
                name: 'Collector',
                description: 'Unlock 25 pieces of content',
                tier: 'silver',
                unlocked: totalUnlocks.count >= 25,
                progress: Math.min(totalUnlocks.count, 25),
                target: 25
            },
            {
                id: 'curator',
                name: 'Content Curator',
                description: 'Unlock 100 pieces of content',
                tier: 'gold',
                unlocked: totalUnlocks.count >= 100,
                progress: Math.min(totalUnlocks.count, 100),
                target: 100
            },
            {
                id: 'legendary_hunter',
                name: 'Legendary Hunter',
                description: 'Unlock 5 legendary items',
                tier: 'legendary',
                unlocked: legendaryUnlocks.count >= 5,
                progress: Math.min(legendaryUnlocks.count, 5),
                target: 5
            },
            {
                id: 'mythic_seeker',
                name: 'Mythic Seeker',
                description: 'Unlock a mythic item',
                tier: 'mythic',
                unlocked: mythicUnlocks.count >= 1,
                progress: Math.min(mythicUnlocks.count, 1),
                target: 1
            },
            {
                id: 'movie_buff',
                name: 'Movie Buff',
                description: 'Unlock 50 movies',
                tier: 'gold',
                unlocked: movieUnlocks.count >= 50,
                progress: Math.min(movieUnlocks.count, 50),
                target: 50
            },
            {
                id: 'series_savant',
                name: 'Series Savant',
                description: 'Unlock 50 TV series',
                tier: 'gold',
                unlocked: seriesUnlocks.count >= 50,
                progress: Math.min(seriesUnlocks.count, 50),
                target: 50
            },
            {
                id: 'quality_connoisseur',
                name: 'Quality Connoisseur',
                description: 'Unlock 25 items with 90+ quality score',
                tier: 'legendary',
                unlocked: highQualityUnlocks.count >= 25,
                progress: Math.min(highQualityUnlocks.count, 25),
                target: 25
            }
        ];

        res.json({
            success: true,
            achievements: achievementList,
            stats: {
                totalUnlocks: totalUnlocks.count,
                legendaryUnlocks: legendaryUnlocks.count,
                mythicUnlocks: mythicUnlocks.count,
                movieUnlocks: movieUnlocks.count,
                seriesUnlocks: seriesUnlocks.count,
                activeDays: activeDays.days,
                highQualityUnlocks: highQualityUnlocks.count
            }
        });

    } catch (error) {
        console.error('Achievements error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching achievements'
        });
    }
});

// TESTING ONLY: Top up user's spins (add 3 more spins)
router.post('/top-up-spins', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        
        // Get user
        const user = await db.getUserById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Add 3 spins to admin_override_spins
        const newOverrideSpins = (user.admin_override_spins || 0) + 3;
        await db.run(
            'UPDATE users SET admin_override_spins = ? WHERE id = ?',
            [newOverrideSpins, userId]
        );

        res.json({
            success: true,
            message: 'Added 3 test spins to your account',
            newTotal: newOverrideSpins
        });

    } catch (error) {
        console.error('Top up spins error:', error);
        res.status(500).json({
            success: false,
            message: 'Error topping up spins'
        });
    }
});

module.exports = router;