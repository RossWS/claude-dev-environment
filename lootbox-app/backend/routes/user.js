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
        const { type, rarity, page = 1, limit = 20, sort = 'unlock_time', groupByRarity = false } = req.query;
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
                c.quality_score,
                c.type,
                COALESCE(c.emoji, CASE WHEN c.type = 'series' THEN '📺' ELSE '🎬' END) as emoji
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

        // Add sorting
        let orderBy = 'u.unlocked_at DESC';
        switch (sort) {
            case 'unlock_time_asc':
                orderBy = 'u.unlocked_at ASC';
                break;
            case 'title_asc':
                orderBy = 'c.title ASC';
                break;
            case 'title_desc':
                orderBy = 'c.title DESC';
                break;
            case 'release_year':
                orderBy = 'c.year DESC';
                break;
            case 'release_year_asc':
                orderBy = 'c.year ASC';
                break;
            case 'quality_score':
                orderBy = 'c.quality_score DESC';
                break;
            case 'quality_score_asc':
                orderBy = 'c.quality_score ASC';
                break;
            case 'critics_score':
                orderBy = 'c.critics_score DESC';
                break;
            case 'audience_score':
                orderBy = 'c.audience_score DESC';
                break;
            default:
                orderBy = 'u.unlocked_at DESC';
        }

        // If grouping by rarity, add rarity tier ordering first
        if (groupByRarity === 'true') {
            const rarityOrder = `
                CASE u.rarity_tier 
                    WHEN 'mythic' THEN 1 
                    WHEN 'legendary' THEN 2 
                    WHEN 'epic' THEN 3 
                    WHEN 'rare' THEN 4 
                    WHEN 'uncommon' THEN 5 
                    WHEN 'common' THEN 6 
                    ELSE 7 
                END
            `;
            orderBy = `${rarityOrder}, ${orderBy}`;
        }

        sql += ` ORDER BY ${orderBy} LIMIT ? OFFSET ?`;
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

// Get unlock statistics by rarity
router.get('/unlock-stats', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { type } = req.query;

        // Get total content counts by rarity
        let totalContentSql = `
            SELECT 
                CASE 
                    WHEN quality_score >= 95 THEN 'mythic'
                    WHEN quality_score >= 90 THEN 'legendary' 
                    WHEN quality_score >= 85 THEN 'epic'
                    WHEN quality_score >= 80 THEN 'rare'
                    WHEN quality_score >= 75 THEN 'uncommon'
                    ELSE 'common'
                END as rarity_tier,
                COUNT(*) as total_count
            FROM content
        `;

        if (type && ['movie', 'series'].includes(type)) {
            totalContentSql += ` WHERE type = '${type}'`;
        }
        
        totalContentSql += ' GROUP BY rarity_tier';
        
        // Get user's unlocked counts by rarity
        let unlockedSql = `
            SELECT 
                u.rarity_tier,
                COUNT(*) as unlocked_count
            FROM user_unlocks u
            WHERE u.user_id = ?
        `;
        
        const params = [userId];
        
        if (type && ['movie', 'series'].includes(type)) {
            unlockedSql += ' AND u.spin_type = ?';
            params.push(type);
        }
        
        unlockedSql += ' GROUP BY u.rarity_tier';

        const [totalCounts, unlockedCounts] = await Promise.all([
            db.all(totalContentSql),
            db.all(unlockedSql, params)
        ]);

        // Combine the results
        const rarities = ['mythic', 'legendary', 'epic', 'rare', 'uncommon', 'common'];
        const stats = rarities.map(rarity => {
            const totalCount = totalCounts.find(t => t.rarity_tier === rarity)?.total_count || 0;
            const unlockedCount = unlockedCounts.find(u => u.rarity_tier === rarity)?.unlocked_count || 0;
            
            return {
                rarity,
                total: totalCount,
                unlocked: unlockedCount,
                remaining: totalCount - unlockedCount,
                percentage: totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0
            };
        });

        res.json({
            success: true,
            stats
        });

    } catch (error) {
        console.error('Unlock stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching unlock statistics'
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

// Update user profile (username, email)
router.put('/profile', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { username, email } = req.body;

        // Validation
        if (!username || !email) {
            return res.status(400).json({
                success: false,
                message: 'Username and email are required'
            });
        }

        if (username.length < 3 || username.length > 20) {
            return res.status(400).json({
                success: false,
                message: 'Username must be between 3 and 20 characters'
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format'
            });
        }

        // Check if username or email already exists for another user
        const existingUser = await db.get(
            'SELECT id FROM users WHERE (username = ? OR email = ?) AND id != ?',
            [username, email, userId]
        );

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'Username or email already exists'
            });
        }

        // Update user profile
        await db.run(
            'UPDATE users SET username = ?, email = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [username, email, userId]
        );

        res.json({
            success: true,
            message: 'Profile updated successfully'
        });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating profile'
        });
    }
});

// Change password
router.post('/change-password', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { currentPassword, newPassword, confirmPassword } = req.body;

        // Validation
        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'All password fields are required'
            });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'New passwords do not match'
            });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 8 characters long'
            });
        }

        // Get current user
        const user = await db.getUserById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Verify current password
        const bcrypt = require('bcrypt');
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isCurrentPasswordValid) {
            return res.status(400).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // Hash new password
        const saltRounds = 12;
        const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

        // Update password
        await db.run(
            'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [hashedNewPassword, userId]
        );

        res.json({
            success: true,
            message: 'Password changed successfully'
        });

    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            message: 'Error changing password'
        });
    }
});

// Get user's showcase cards
router.get('/showcase', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        const showcaseCards = await db.all(`
            SELECT 
                s.id as showcase_id,
                s.position,
                u.id as unlock_id,
                u.unlocked_at,
                u.rarity_tier,
                c.id,
                c.title,
                c.description,
                c.critics_score,
                c.audience_score,
                c.year,
                c.poster_url,
                c.backdrop_url,
                c.genres,
                c.quality_score,
                c.type,
                COALESCE(c.emoji, CASE WHEN c.type = 'series' THEN '📺' ELSE '🎬' END) as emoji
            FROM user_showcase s
            JOIN user_unlocks u ON s.unlock_id = u.id
            JOIN content c ON u.content_id = c.id
            WHERE s.user_id = ?
            ORDER BY s.position ASC
        `, [userId]);

        // Parse JSON fields
        const formattedCards = showcaseCards.map(card => ({
            ...card,
            genres: JSON.parse(card.genres || '[]')
        }));

        res.json({
            success: true,
            showcase: formattedCards
        });

    } catch (error) {
        console.error('Get showcase error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching showcase'
        });
    }
});

// Update user's showcase cards
router.post('/showcase', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { unlockIds } = req.body; // Array of up to 5 unlock IDs

        // Validation
        if (!Array.isArray(unlockIds)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid showcase data'
            });
        }

        if (unlockIds.length > 5) {
            return res.status(400).json({
                success: false,
                message: 'Maximum 5 showcase items allowed'
            });
        }

        // Verify all unlock IDs belong to the user
        if (unlockIds.length > 0) {
            const userUnlocks = await db.all(
                `SELECT id FROM user_unlocks WHERE id IN (${unlockIds.map(() => '?').join(',')}) AND user_id = ?`,
                [...unlockIds, userId]
            );

            if (userUnlocks.length !== unlockIds.length) {
                return res.status(400).json({
                    success: false,
                    message: 'Some items are not in your collection'
                });
            }
        }

        // Clear current showcase
        await db.run('DELETE FROM user_showcase WHERE user_id = ?', [userId]);

        // Add new showcase items
        for (let i = 0; i < unlockIds.length; i++) {
            await db.run(
                'INSERT INTO user_showcase (user_id, unlock_id, position) VALUES (?, ?, ?)',
                [userId, unlockIds[i], i + 1]
            );
        }

        res.json({
            success: true,
            message: 'Showcase updated successfully'
        });

    } catch (error) {
        console.error('Update showcase error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating showcase'
        });
    }
});

// Get user's privacy settings
router.get('/privacy-settings', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        const settings = await db.get(
            'SELECT profile_public, show_stats, show_activity FROM users WHERE id = ?',
            [userId]
        );

        res.json({
            success: true,
            settings: {
                profilePublic: settings.profile_public || false,
                showStats: settings.show_stats !== false, // Default to true
                showActivity: settings.show_activity !== false // Default to true
            }
        });

    } catch (error) {
        console.error('Get privacy settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching privacy settings'
        });
    }
});

// Update user's privacy settings
router.put('/privacy-settings', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { profilePublic, showStats, showActivity } = req.body;

        // Convert to boolean values
        const profilePublicBool = Boolean(profilePublic);
        const showStatsBool = Boolean(showStats);
        const showActivityBool = Boolean(showActivity);

        await db.run(
            'UPDATE users SET profile_public = ?, show_stats = ?, show_activity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [profilePublicBool, showStatsBool, showActivityBool, userId]
        );

        res.json({
            success: true,
            message: 'Privacy settings updated successfully'
        });

    } catch (error) {
        console.error('Update privacy settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating privacy settings'
        });
    }
});

// Delete user account
router.delete('/account', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { password } = req.body;

        if (!password) {
            return res.status(400).json({
                success: false,
                message: 'Password confirmation required'
            });
        }

        // Get user and verify password
        const user = await db.getUserById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const bcrypt = require('bcrypt');
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({
                success: false,
                message: 'Password is incorrect'
            });
        }

        // Delete user data (cascade delete through foreign keys)
        await db.run('DELETE FROM user_showcase WHERE user_id = ?', [userId]);
        await db.run('DELETE FROM user_unlocks WHERE user_id = ?', [userId]);
        await db.run('DELETE FROM user_spins WHERE user_id = ?', [userId]);
        await db.run('DELETE FROM users WHERE id = ?', [userId]);

        res.json({
            success: true,
            message: 'Account deleted successfully'
        });

    } catch (error) {
        console.error('Delete account error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting account'
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