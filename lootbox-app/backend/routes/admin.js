const express = require('express');
const db = require('../utils/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const router = express.Router();

// All admin routes require authentication and admin privileges
router.use(authenticateToken);
router.use(requireAdmin);

// Get admin dashboard stats
router.get('/stats', async (req, res) => {
    try {
        const stats = await Promise.all([
            db.get('SELECT COUNT(*) as count FROM users'),
            db.get('SELECT COUNT(*) as count FROM users WHERE last_login >= date("now", "-7 days")'),
            db.get('SELECT COUNT(*) as count FROM content'),
            db.get('SELECT COUNT(*) as count FROM content WHERE type = "movie"'),
            db.get('SELECT COUNT(*) as count FROM content WHERE type = "series"'),
            db.get('SELECT COUNT(*) as count FROM user_spins WHERE spin_date = date("now")'),
            db.get('SELECT COUNT(*) as count FROM user_unlocks'),
            db.all('SELECT rarity_tier, COUNT(*) as count FROM user_unlocks GROUP BY rarity_tier'),
            db.all('SELECT spin_type, COUNT(*) as count FROM user_spins WHERE spin_date >= date("now", "-30 days") GROUP BY spin_type')
        ]);

        const [
            totalUsers,
            activeUsers,
            totalContent,
            movieCount,
            seriesCount,
            todaySpins,
            totalUnlocks,
            rarityBreakdown,
            typeBreakdown
        ] = stats;

        res.json({
            success: true,
            stats: {
                users: {
                    total: totalUsers.count,
                    activeLastWeek: activeUsers.count
                },
                content: {
                    total: totalContent.count,
                    movies: movieCount.count,
                    series: seriesCount.count
                },
                activity: {
                    spinsToday: todaySpins.count,
                    totalUnlocks: totalUnlocks.count
                },
                breakdowns: {
                    rarity: rarityBreakdown,
                    type: typeBreakdown
                }
            }
        });

    } catch (error) {
        console.error('Admin stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching admin statistics'
        });
    }
});

// Get admin settings
router.get('/settings', async (req, res) => {
    try {
        const settings = await db.all('SELECT * FROM admin_settings ORDER BY setting_key');
        
        res.json({
            success: true,
            settings
        });

    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching settings'
        });
    }
});

// Update admin setting
router.put('/settings/:key', async (req, res) => {
    try {
        const { key } = req.params;
        const { value } = req.body;

        if (!value && value !== 0 && value !== false) {
            return res.status(400).json({
                success: false,
                message: 'Setting value is required'
            });
        }

        await db.updateAdminSetting(key, value.toString(), req.user.userId);

        res.json({
            success: true,
            message: 'Setting updated successfully'
        });

    } catch (error) {
        console.error('Update setting error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating setting'
        });
    }
});

// Grant admin override spins to user
router.post('/users/:userId/grant-spins', async (req, res) => {
    try {
        const { userId } = req.params;
        const { amount } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Amount must be a positive number'
            });
        }

        // Check if user exists
        const user = await db.getUserById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Grant admin override spins
        const newOverrideSpins = (user.admin_override_spins || 0) + parseInt(amount);
        await db.run(
            'UPDATE users SET admin_override_spins = ? WHERE id = ?',
            [newOverrideSpins, userId]
        );

        res.json({
            success: true,
            message: `Granted ${amount} bonus spins to ${user.username}`,
            newTotal: newOverrideSpins
        });

    } catch (error) {
        console.error('Grant spins error:', error);
        res.status(500).json({
            success: false,
            message: 'Error granting spins'
        });
    }
});

// Get all users (with pagination)
router.get('/users', async (req, res) => {
    try {
        const { page = 1, limit = 50, search } = req.query;
        const offset = (page - 1) * limit;

        let sql = `
            SELECT 
                id, username, email, is_admin, daily_spins_used, 
                daily_spins_reset_date, admin_override_spins,
                created_at, last_login,
                (SELECT COUNT(*) FROM user_unlocks WHERE user_id = users.id) as total_unlocks,
                (SELECT COUNT(*) FROM user_spins WHERE user_id = users.id) as total_spins
            FROM users
        `;
        let countSql = 'SELECT COUNT(*) as total FROM users';
        const params = [];
        const countParams = [];

        if (search) {
            sql += ' WHERE username LIKE ? OR email LIKE ?';
            countSql += ' WHERE username LIKE ? OR email LIKE ?';
            params.push(`%${search}%`, `%${search}%`);
            countParams.push(`%${search}%`, `%${search}%`);
        }

        sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const users = await db.all(sql, params);
        const totalResult = await db.get(countSql, countParams);

        res.json({
            success: true,
            users,
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
        console.error('Get users error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching users'
        });
    }
});

// Get content management data
router.get('/content', async (req, res) => {
    try {
        const { page = 1, limit = 50, type, rarity, search, sort = 'quality_score_desc' } = req.query;
        const offset = (page - 1) * limit;

        let sql = `
            SELECT 
                id, type, title, critics_score, audience_score,
                imdb_rating, year, month, duration, description,
                certified_fresh, verified_hot, platforms, quality_score, rarity_tier, 
                date_added, last_updated, is_active,
                COALESCE(emoji, CASE WHEN type = 'series' THEN '📺' ELSE '🎬' END) as emoji
            FROM content
        `;
        let countSql = 'SELECT COUNT(*) as total FROM content';
        const params = [];
        const countParams = [];
        const conditions = [];

        if (type && ['movie', 'series'].includes(type)) {
            conditions.push('type = ?');
            params.push(type);
            countParams.push(type);
        }

        if (rarity) {
            conditions.push('rarity_tier = ?');
            params.push(rarity);
            countParams.push(rarity);
        }

        if (search) {
            conditions.push('title LIKE ?');
            params.push(`%${search}%`);
            countParams.push(`%${search}%`);
        }

        if (conditions.length > 0) {
            const whereClause = ' WHERE ' + conditions.join(' AND ');
            sql += whereClause;
            countSql += whereClause;
        }

        // Add sorting
        let orderBy = 'ORDER BY ';
        switch (sort) {
            case 'quality_score_desc':
                orderBy += 'quality_score DESC';
                break;
            case 'quality_score_asc':
                orderBy += 'quality_score ASC';
                break;
            case 'title_asc':
                orderBy += 'title ASC';
                break;
            case 'title_desc':
                orderBy += 'title DESC';
                break;
            case 'year_desc':
                orderBy += 'year DESC';
                break;
            case 'year_asc':
                orderBy += 'year ASC';
                break;
            default:
                orderBy += 'quality_score DESC';
        }

        sql += ' ' + orderBy + ' LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const content = await db.all(sql, params);
        const totalResult = await db.get(countSql, countParams);

        res.json({
            success: true,
            content,
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
        console.error('Get content error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching content'
        });
    }
});

// Toggle content active status
router.put('/content/:id/toggle', async (req, res) => {
    try {
        const { id } = req.params;

        const content = await db.get('SELECT * FROM content WHERE id = ?', [id]);
        if (!content) {
            return res.status(404).json({
                success: false,
                message: 'Content not found'
            });
        }

        const newStatus = content.is_active ? 0 : 1;
        await db.run(
            'UPDATE content SET is_active = ?, last_updated = CURRENT_TIMESTAMP WHERE id = ?',
            [newStatus, id]
        );

        res.json({
            success: true,
            message: `Content ${newStatus ? 'activated' : 'deactivated'} successfully`,
            isActive: newStatus
        });

    } catch (error) {
        console.error('Toggle content error:', error);
        res.status(500).json({
            success: false,
            message: 'Error toggling content status'
        });
    }
});

// Recent activity log
router.get('/activity', async (req, res) => {
    try {
        const { page = 1, limit = 100 } = req.query;
        const offset = (page - 1) * limit;

        const activities = await db.all(`
            SELECT 
                s.id,
                s.spin_date,
                s.spin_type,
                s.rarity_tier,
                s.was_new_unlock,
                s.created_at,
                u.username,
                c.title
            FROM user_spins s
            JOIN users u ON s.user_id = u.id
            JOIN content c ON s.content_id = c.id
            ORDER BY s.created_at DESC
            LIMIT ? OFFSET ?
        `, [parseInt(limit), parseInt(offset)]);

        res.json({
            success: true,
            activities
        });

    } catch (error) {
        console.error('Activity log error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching activity log'
        });
    }
});

module.exports = router;