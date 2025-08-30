const express = require('express');
const db = require('../utils/database');
const { optionalAuth } = require('../middleware/auth');
const router = express.Router();

// Get content by type (public endpoint with optional auth)
router.get('/:type', optionalAuth, async (req, res) => {
    try {
        const { type } = req.params;
        const { page = 1, limit = 20 } = req.query;
        
        if (!['movie', 'series'].includes(type)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid content type'
            });
        }

        const offset = (page - 1) * limit;
        const content = await db.getContentByType(type, limit, offset);

        res.json({
            success: true,
            content: content.map(item => ({
                ...item,
                platforms: JSON.parse(item.platforms || '[]'),
                genres: JSON.parse(item.genres || '[]')
            })),
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit)
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

module.exports = router;