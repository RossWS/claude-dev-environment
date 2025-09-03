const express = require('express');
const db = require('../utils/database');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Quality score calculation (same algorithm as frontend)
function calculateQualityScore(item) {
    const criticWeight = 0.65;
    const audienceWeight = 0.35;
    const baseScore = (item.critics_score * criticWeight) + (item.audience_score * audienceWeight);
    
    // Bonus for certified fresh
    const certifiedBonus = item.certified_fresh ? 5 : 0;
    // Bonus for verified hot
    const hotBonus = item.verified_hot ? 3 : 0;
    // Bonus for high IMDB rating
    const imdbBonus = item.imdb_rating >= 8.0 ? 7 : item.imdb_rating >= 7.5 ? 4 : 0;
    
    return Math.round(baseScore + certifiedBonus + hotBonus + imdbBonus);
}

// Rarity determination
function getRarity(score) {
    if (score >= 95) return { tier: 'mythic', label: 'MYTHIC', icon: '🌟' };
    if (score >= 90) return { tier: 'legendary', label: 'LEGENDARY', icon: '👑' };
    if (score >= 85) return { tier: 'epic', label: 'EPIC', icon: '💎' };
    if (score >= 80) return { tier: 'rare', label: 'RARE', icon: '⭐' };
    if (score >= 75) return { tier: 'uncommon', label: 'UNCOMMON', icon: '🔹' };
    return { tier: 'common', label: 'COMMON', icon: '⚪' };
}

// Guest lootbox endpoint (no authentication required)
router.post('/guest-open', async (req, res) => {
    try {
        const { type } = req.body; // 'movie' or 'series'

        // Validate type
        if (!type || !['movie', 'series'].includes(type)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid lootbox type. Must be "movie" or "series"'
            });
        }

        // Get random content of the specified type
        const query = `
            SELECT * FROM content 
            WHERE type = ? AND is_active = 1
            ORDER BY RANDOM() 
            LIMIT 1
        `;
        
        const content = await db.get(query, [type]);
        
        if (!content) {
            return res.status(404).json({
                success: false,
                message: `No ${type}s available`
            });
        }

        // Calculate quality score and rarity
        const qualityScore = calculateQualityScore(content);
        const rarity = getRarity(qualityScore);
        
        // Prepare content object
        const contentWithMetrics = {
            ...content,
            qualityScore: qualityScore, // Make sure this is consistent with frontend expectation
            quality_score: qualityScore,
            rarity: rarity,
            rarity_tier: rarity.tier
        };

        res.json({
            success: true,
            content: contentWithMetrics,
            unlock: {
                is_new: true, // For guests, everything is "new"
                unlock_time: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Guest lootbox error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Open lootbox endpoint
router.post('/open', authenticateToken, async (req, res) => {
    try {
        const { type } = req.body; // 'movie' or 'series'
        const userId = req.user.userId;

        // Validate type
        if (!type || !['movie', 'series'].includes(type)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid lootbox type. Must be "movie" or "series"'
            });
        }

        // Check daily spin limit
        const user = await db.getUserById(userId);
        const today = new Date().toISOString().split('T')[0];
        
        // Reset daily spins if it's a new day
        if (user.daily_spins_reset_date !== today) {
            await db.updateUserSpins(userId, 0, today);
            user.daily_spins_used = 0;
        }

        // Get daily spin limit setting
        const dailyLimitSetting = await db.getAdminSetting('daily_spin_limit');
        const dailyLimit = parseInt(dailyLimitSetting?.setting_value || 3);

        // Check if user has spins remaining (unless admin override)
        if (user.daily_spins_used >= dailyLimit && user.admin_override_spins <= 0) {
            return res.status(429).json({
                success: false,
                message: 'Daily spin limit reached. Come back tomorrow!',
                spinsRemaining: 0,
                nextResetTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            });
        }

        // Get quality threshold setting
        const qualityThresholdSetting = await db.getAdminSetting('quality_score_threshold');
        const minQuality = parseInt(qualityThresholdSetting?.setting_value || 83);

        // Get high-quality content for the specified type
        const contentList = await db.getHighQualityContent(type, minQuality);
        
        if (contentList.length === 0) {
            return res.status(404).json({
                success: false,
                message: `No high-quality ${type} content available`
            });
        }

        // Select random content with weighted rarity
        const selected = selectWeightedRandomContent(contentList);
        
        // Calculate quality score and rarity
        const qualityScore = calculateQualityScore(selected);
        const rarity = getRarity(qualityScore);

        // Check if this is a new unlock for the user
        const existingUnlock = await db.get(
            'SELECT id FROM user_unlocks WHERE user_id = ? AND content_id = ?',
            [userId, selected.id]
        );
        const wasNewUnlock = !existingUnlock;

        // Add to user unlocks if new
        if (wasNewUnlock) {
            await db.addUserUnlock(userId, selected.id, type, rarity.tier);
        }

        // Record the spin
        await db.addUserSpin(userId, selected.id, type, rarity.tier, qualityScore, wasNewUnlock);

        // Update user's daily spins
        let newSpinsUsed = user.daily_spins_used + 1;
        let newOverrideSpins = user.admin_override_spins;

        // Use admin override spins first
        if (user.admin_override_spins > 0) {
            newOverrideSpins -= 1;
        } else {
            newSpinsUsed = user.daily_spins_used + 1;
        }

        await db.run(
            'UPDATE users SET daily_spins_used = ?, admin_override_spins = ? WHERE id = ?',
            [newSpinsUsed, newOverrideSpins, userId]
        );

        // Prepare response with all content details
        const response = {
            success: true,
            content: {
                ...selected,
                platforms: JSON.parse(selected.platforms || '[]'),
                genres: JSON.parse(selected.genres || '[]'),
                cast_crew: JSON.parse(selected.cast_crew || '[]'),
                qualityScore,
                rarity
            },
            unlock: {
                wasNewUnlock,
                totalUnlocks: wasNewUnlock ? 
                    (await db.get('SELECT COUNT(*) as count FROM user_unlocks WHERE user_id = ?', [userId])).count :
                    null
            },
            spins: {
                used: newSpinsUsed,
                remaining: Math.max(0, dailyLimit - newSpinsUsed + newOverrideSpins),
                dailyLimit,
                adminOverride: newOverrideSpins
            }
        };

        res.json(response);

    } catch (error) {
        console.error('Lootbox open error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error opening lootbox'
        });
    }
});

// Weighted random selection based on rarity probabilities
function selectWeightedRandomContent(contentList) {
    // Calculate quality scores and assign probabilities
    const itemsWithProbability = contentList.map(item => {
        const score = calculateQualityScore(item);
        const rarity = getRarity(score);
        
        // Set probability weights (higher score = higher chance)
        let weight;
        switch (rarity.tier) {
            case 'mythic': weight = 0.05; break;
            case 'legendary': weight = 0.10; break;
            case 'epic': weight = 0.20; break;
            case 'rare': weight = 0.35; break;
            case 'uncommon': weight = 0.20; break;
            default: weight = 0.10; break;
        }
        
        return { item, weight, score, rarity };
    });

    // Weighted random selection
    const totalWeight = itemsWithProbability.reduce((sum, item) => sum + item.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const weighted of itemsWithProbability) {
        random -= weighted.weight;
        if (random <= 0) {
            return weighted.item;
        }
    }
    
    // Fallback to last item if somehow nothing was selected
    return itemsWithProbability[itemsWithProbability.length - 1].item;
}

// Get user's spin status
router.get('/status', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const user = await db.getUserById(userId);
        const today = new Date().toISOString().split('T')[0];

        // Get daily limit setting
        const dailyLimitSetting = await db.getAdminSetting('daily_spin_limit');
        const dailyLimit = parseInt(dailyLimitSetting?.setting_value || 3);

        // Reset if new day
        let spinsUsed = user.daily_spins_used;
        if (user.daily_spins_reset_date !== today) {
            spinsUsed = 0;
        }

        const spinsRemaining = Math.max(0, dailyLimit - spinsUsed + user.admin_override_spins);

        res.json({
            success: true,
            spins: {
                used: spinsUsed,
                remaining: spinsRemaining,
                dailyLimit,
                adminOverride: user.admin_override_spins,
                resetDate: today
            }
        });

    } catch (error) {
        console.error('Status check error:', error);
        res.status(500).json({
            success: false,
            message: 'Error checking spin status'
        });
    }
});

module.exports = router;