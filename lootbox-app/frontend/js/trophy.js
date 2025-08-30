// Trophy cabinet functionality
class TrophyCabinet {
    constructor() {
        this.currentPage = 1;
        this.currentFilters = {
            type: '',
            rarity: ''
        };
        this.trophies = [];
        this.initializeElements();
        this.attachEventListeners();
    }

    initializeElements() {
        this.trophyGrid = document.getElementById('trophyGrid');
        this.typeFilter = document.getElementById('typeFilter');
        this.rarityFilter = document.getElementById('rarityFilter');
        this.trophyStats = document.getElementById('trophyStats');
        this.pagination = document.getElementById('trophyPagination');
    }

    attachEventListeners() {
        if (this.typeFilter) {
            this.typeFilter.addEventListener('change', () => this.applyFilters());
        }
        
        if (this.rarityFilter) {
            this.rarityFilter.addEventListener('change', () => this.applyFilters());
        }

        const backBtn = document.getElementById('backToGameBtn');
        if (backBtn) {
            backBtn.addEventListener('click', () => this.hideTrophyScreen());
        }
    }

    async loadTrophies(page = 1) {
        try {
            UI.showLoading(true);

            const params = {
                page,
                limit: 12,
                type: this.currentFilters.type,
                rarity: this.currentFilters.rarity
            };

            // Remove empty filters
            Object.keys(params).forEach(key => {
                if (!params[key]) delete params[key];
            });

            const response = await api.user.getTrophies(params);

            if (response.success) {
                this.trophies = response.trophies;
                this.currentPage = page;
                this.renderTrophies();
                this.renderPagination(response.pagination);
                
                // Load stats on first load
                if (page === 1) {
                    this.loadStats();
                }
            } else {
                UI.showNotification(response.message || 'Failed to load trophies', 'error');
            }

        } catch (error) {
            console.error('Trophy loading error:', error);
            UI.showNotification(error.message || 'Failed to load trophies', 'error');
        } finally {
            UI.showLoading(false);
        }
    }

    async loadStats() {
        try {
            const response = await api.user.getProfile();
            if (response.success && response.profile.stats) {
                this.renderStats(response.profile.stats);
            }
        } catch (error) {
            console.warn('Failed to load trophy stats:', error);
        }
    }

    renderStats(stats) {
        if (!this.trophyStats) return;

        const rarityStats = stats.rarityBreakdown || [];
        const totalUnlocks = stats.totalUnlocks || 0;
        const totalSpins = stats.totalSpins || 0;

        this.trophyStats.innerHTML = `
            <div class=\"stat-item\">
                <span class=\"stat-number\">${totalUnlocks}</span>
                <span class=\"stat-label\">Total Unlocks</span>
            </div>
            <div class=\"stat-item\">
                <span class=\"stat-number\">${totalSpins}</span>
                <span class=\"stat-label\">Total Spins</span>
            </div>
            <div class=\"stat-item\">
                <span class=\"stat-number\">${this.getLegendaryCount(rarityStats)}</span>
                <span class=\"stat-label\">Legendary+</span>
            </div>
            <div class=\"stat-item\">
                <span class=\"stat-number\">${Math.round((totalSpins > 0 ? totalUnlocks / totalSpins : 0) * 100)}%</span>
                <span class=\"stat-label\">Collection Rate</span>
            </div>
        `;
    }

    getLegendaryCount(rarityStats) {
        const legendary = rarityStats.find(r => r.rarity_tier === 'legendary')?.count || 0;
        const mythic = rarityStats.find(r => r.rarity_tier === 'mythic')?.count || 0;
        return legendary + mythic;
    }

    renderTrophies() {
        if (!this.trophyGrid) return;

        if (this.trophies.length === 0) {
            this.trophyGrid.innerHTML = `
                <div class=\"empty-state\">
                    <div class=\"empty-icon\">🎁</div>
                    <h3>No Trophies Yet</h3>
                    <p>Start opening loot boxes to build your collection!</p>
                </div>
            `;
            return;
        }

        this.trophyGrid.innerHTML = this.trophies.map(trophy => this.createTrophyCard(trophy)).join('');
    }

    createTrophyCard(trophy) {
        const unlockedDate = Utils.formatRelativeTime(trophy.unlocked_at);
        const rarity = Utils.getRarityTier(trophy.quality_score);
        
        return `
            <div class=\"trophy-item ${trophy.rarity_tier}\">
                <div class=\"trophy-item-header\">
                    <div class=\"trophy-rarity ${trophy.rarity_tier}\">
                        ${rarity.icon} ${trophy.rarity_tier.toUpperCase()}
                    </div>
                    <div class=\"trophy-unlocked-date\">${unlockedDate}</div>
                </div>
                
                <div class=\"trophy-title-text\">${Utils.sanitizeHtml(trophy.title)}</div>
                
                <div class=\"trophy-details\">
                    <span>${trophy.year}</span>
                    <span>${trophy.duration}</span>
                    <span>Score: ${trophy.quality_score}</span>
                </div>
                
                <div class=\"trophy-description\">
                    ${Utils.sanitizeHtml(trophy.description)}
                </div>
                
                ${trophy.platforms ? this.renderPlatforms(trophy.platforms) : ''}
            </div>
        `;
    }

    renderPlatforms(platforms) {
        if (!platforms || platforms.length === 0) return '';
        
        return `
            <div class=\"trophy-platforms\">
                ${platforms.slice(0, 3).map(platform => 
                    `<span class=\"platform-badge\">${Utils.sanitizeHtml(platform)}</span>`
                ).join('')}
                ${platforms.length > 3 ? `<span class=\"platform-more\">+${platforms.length - 3}</span>` : ''}
            </div>
        `;
    }

    renderPagination(pagination) {
        if (!this.pagination || !pagination) return;

        const { page, pages, hasPrev, hasNext } = pagination;

        let paginationHTML = '';

        // Previous button
        paginationHTML += `
            <button class=\"pagination-btn\" ${!hasPrev ? 'disabled' : ''} 
                    onclick=\"trophyCabinet.loadTrophies(${page - 1})\">
                ← Previous
            </button>
        `;

        // Page numbers (show up to 5 pages around current)
        const startPage = Math.max(1, page - 2);
        const endPage = Math.min(pages, page + 2);

        if (startPage > 1) {
            paginationHTML += `
                <button class=\"pagination-btn\" onclick=\"trophyCabinet.loadTrophies(1)\">1</button>
                ${startPage > 2 ? '<span class=\"pagination-ellipsis\">...</span>' : ''}
            `;
        }

        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <button class=\"pagination-btn ${i === page ? 'active' : ''}\" 
                        onclick=\"trophyCabinet.loadTrophies(${i})\">
                    ${i}
                </button>
            `;
        }

        if (endPage < pages) {
            paginationHTML += `
                ${endPage < pages - 1 ? '<span class=\"pagination-ellipsis\">...</span>' : ''}
                <button class=\"pagination-btn\" onclick=\"trophyCabinet.loadTrophies(${pages})\">${pages}</button>
            `;
        }

        // Next button
        paginationHTML += `
            <button class=\"pagination-btn\" ${!hasNext ? 'disabled' : ''} 
                    onclick=\"trophyCabinet.loadTrophies(${page + 1})\">
                Next →
            </button>
        `;

        this.pagination.innerHTML = paginationHTML;
    }

    applyFilters() {
        this.currentFilters.type = this.typeFilter?.value || '';
        this.currentFilters.rarity = this.rarityFilter?.value || '';
        this.currentPage = 1;
        this.loadTrophies(1);
    }

    showTrophyScreen() {
        const gameScreen = document.getElementById('gameScreen');
        const trophyScreen = document.getElementById('trophyScreen');
        
        if (gameScreen && trophyScreen) {
            gameScreen.classList.add('hidden');
            trophyScreen.classList.remove('hidden');
            
            // Load trophies when screen is shown
            this.loadTrophies(1);
        }
    }

    hideTrophyScreen() {
        const gameScreen = document.getElementById('gameScreen');
        const trophyScreen = document.getElementById('trophyScreen');
        
        if (gameScreen && trophyScreen) {
            gameScreen.classList.remove('hidden');
            trophyScreen.classList.add('hidden');
        }
    }

    // Search functionality (for future enhancement)
    async searchTrophies(query) {
        try {
            // This would require a search endpoint
            const params = {
                search: query,
                type: this.currentFilters.type,
                rarity: this.currentFilters.rarity
            };

            const response = await api.user.getTrophies(params);
            
            if (response.success) {
                this.trophies = response.trophies;
                this.renderTrophies();
                this.renderPagination(response.pagination);
            }

        } catch (error) {
            console.error('Trophy search error:', error);
        }
    }

    // Export trophy data (for future enhancement)
    exportTrophies() {
        if (this.trophies.length === 0) {
            UI.showNotification('No trophies to export', 'warning');
            return;
        }

        const data = this.trophies.map(trophy => ({
            title: trophy.title,
            type: trophy.spin_type,
            rarity: trophy.rarity_tier,
            quality_score: trophy.quality_score,
            year: trophy.year,
            duration: trophy.duration,
            unlocked_at: trophy.unlocked_at
        }));

        const blob = new Blob([JSON.stringify(data, null, 2)], {
            type: 'application/json'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lootbox-trophies-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        UI.showNotification('Trophy data exported successfully!', 'success');
    }
}

// Create global trophy cabinet instance
const trophyCabinet = new TrophyCabinet();

// Export for use in other modules
window.TrophyCabinet = TrophyCabinet;
window.trophyCabinet = trophyCabinet;