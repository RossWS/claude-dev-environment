// Trophy cabinet functionality
class TrophyCabinet {
    constructor() {
        this.currentPage = 1;
        this.currentFilters = {
            type: '',
            rarity: '',
            sort: 'unlock_time',
            groupByRarity: true
        };
        this.trophies = [];
        this.unlockStats = [];
        this.hasMore = true;
        this.isLoading = false;
        this.initializeElements();
        this.attachEventListeners();
        
        // Listen for guest unlocks to refresh trophy cabinet
        document.addEventListener('guestUnlockAdded', () => {
            if (!Utils.storage.get('authToken')) {
                // Only refresh if we're currently viewing the trophy screen
                const trophyScreen = document.getElementById('trophyScreen');
                if (trophyScreen && !trophyScreen.classList.contains('hidden')) {
                    this.loadGuestTrophies();
                }
            }
        });
    }

    initializeElements() {
        this.trophyGrid = document.getElementById('trophyGrid');
        this.typeFilter = document.getElementById('typeFilter');
        this.rarityFilter = document.getElementById('rarityFilter');
        this.sortFilter = document.getElementById('sortFilter');
        this.groupByRarityToggle = document.getElementById('groupByRarityToggle');
        this.trophyStats = document.getElementById('trophyStats');
        this.rarityCounters = document.getElementById('rarityCounters');
        this.pagination = document.getElementById('trophyPagination');
    }

    attachEventListeners() {
        if (this.typeFilter) {
            this.typeFilter.addEventListener('change', () => this.applyFilters());
        }
        
        if (this.rarityFilter) {
            this.rarityFilter.addEventListener('change', () => this.applyFilters());
        }

        if (this.sortFilter) {
            this.sortFilter.addEventListener('change', () => this.applyFilters());
        }

        if (this.groupByRarityToggle) {
            this.groupByRarityToggle.addEventListener('change', () => this.applyFilters());
        }

        const clearFiltersBtn = document.getElementById('clearFiltersBtn');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => this.clearAllFilters());
        }

        const backBtn = document.getElementById('backToGameBtn');
        if (backBtn) {
            backBtn.addEventListener('click', () => this.hideTrophyScreen());
        }

        // Infinite scroll detection
        this.setupInfiniteScroll();
    }

    setupInfiniteScroll() {
        // Throttle scroll events for better performance
        let scrollTimeout;
        
        const handleScroll = () => {
            if (scrollTimeout) {
                clearTimeout(scrollTimeout);
            }
            
            scrollTimeout = setTimeout(() => {
                this.checkInfiniteScroll();
            }, 100);
        };

        // Add scroll listener to window
        window.addEventListener('scroll', handleScroll);
        
        // Store reference for cleanup
        this.scrollHandler = handleScroll;
    }

    checkInfiniteScroll() {
        if (!this.hasMore || this.isLoading) return;

        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;
        
        // Load more when user is 80% down the page
        const scrollPercentage = (scrollTop + windowHeight) / documentHeight;
        
        if (scrollPercentage >= 0.8) {
            this.loadMoreTrophies();
        }
    }

    cleanup() {
        // Remove scroll listener when component is destroyed
        if (this.scrollHandler) {
            window.removeEventListener('scroll', this.scrollHandler);
        }
    }

    async loadTrophies(page = 1, append = false) {
        if (this.isLoading) return;
        
        try {
            this.isLoading = true;
            if (!append) {
                UI.showLoading(true);
            }

            // Check if user is a guest
            const isGuest = !Utils.storage.get('authToken');
            
            if (isGuest && guestSession) {
                this.loadGuestTrophies();
                return;
            }

            const params = {
                page,
                limit: page === 1 ? 24 : 12,
                type: this.currentFilters.type,
                rarity: this.currentFilters.rarity,
                sort: this.currentFilters.sort,
                groupByRarity: this.currentFilters.groupByRarity
            };

            // Remove empty filters
            Object.keys(params).forEach(key => {
                if (!params[key] && params[key] !== false) delete params[key];
            });

            const response = await api.user.getTrophies(params);

            if (response.success) {
                // Remove loading skeletons before adding new content
                if (append) {
                    this.removeLoadingSkeletons();
                    this.trophies = [...this.trophies, ...response.trophies];
                } else {
                    this.trophies = response.trophies;
                }
                
                this.currentPage = page;
                this.hasMore = response.trophies.length === params.limit;
                
                this.renderTrophies();
                this.updateLoadMoreButton();
                
                // Load stats on first load or when filters change
                if (page === 1 && !append) {
                    this.loadStats();
                    this.loadUnlockStats();
                }
            } else {
                UI.showNotification(response.message || 'Failed to load trophies', 'error');
            }

        } catch (error) {
            console.error('Trophy loading error:', error);
            UI.showNotification(error.message || 'Failed to load trophies', 'error');
        } finally {
            this.isLoading = false;
            if (!append) {
                UI.showLoading(false);
            }
        }
    }

    loadGuestTrophies() {
        try {
            const session = guestSession.getSession();
            if (!session || !session.unlockedContent || session.unlockedContent.length === 0) {
                this.displayEmptyGuestState();
                return;
            }

            // Convert guest unlocks to trophy format
            const guestTrophies = session.unlockedContent.map(content => ({
                ...content,
                unlock_time: content.unlockedAt,
                spin_type: content.type,
                is_new: false, // Already unlocked
                rarity_tier: Utils.getRarityTier(content.quality_score).tier
            }));

            // Apply filters to guest trophies
            let filteredTrophies = this.filterGuestTrophies(guestTrophies);

            // Update UI
            this.trophies = filteredTrophies;
            this.displayGuestTrophies(filteredTrophies);
            this.updateGuestStats(session);
            this.hasMore = false; // No pagination for guest

        } catch (error) {
            console.error('Error loading guest trophies:', error);
            this.displayEmptyGuestState();
        } finally {
            this.isLoading = false;
            UI.showLoading(false);
        }
    }

    filterGuestTrophies(trophies) {
        let filtered = [...trophies];

        // Apply type filter
        if (this.currentFilters.type) {
            filtered = filtered.filter(trophy => trophy.type === this.currentFilters.type);
        }

        // Apply rarity filter
        if (this.currentFilters.rarity) {
            filtered = filtered.filter(trophy => {
                const rarity = Utils.getRarityTier(trophy.quality_score);
                return rarity.tier === this.currentFilters.rarity;
            });
        }

        // Apply sorting
        filtered.sort((a, b) => {
            switch (this.currentFilters.sort) {
                case 'unlock_time':
                    return new Date(b.unlock_time) - new Date(a.unlock_time);
                case 'quality_score':
                    return b.quality_score - a.quality_score;
                case 'title':
                    return a.title.localeCompare(b.title);
                case 'year':
                    return b.year - a.year;
                default:
                    return 0;
            }
        });

        return filtered;
    }

    displayGuestTrophies(trophies) {
        if (!this.trophyGrid) return;

        if (trophies.length === 0) {
            this.displayEmptyGuestState();
            return;
        }

        if (this.currentFilters.groupByRarity) {
            this.displayGroupedGuestTrophies(trophies);
        } else {
            this.displayFlatGuestTrophies(trophies);
        }

        // Add tutorial prompts for guests
        setTimeout(() => this.addGuestTutorialPrompts(), 500);
    }

    displayGroupedGuestTrophies(trophies) {
        const groupedTrophies = Utils.groupByRarity(trophies);
        let html = '';

        Object.entries(groupedTrophies).forEach(([tier, tierTrophies]) => {
            if (tierTrophies.length === 0) return;
            
            const rarity = Utils.getRarityFromTier(tier);
            html += `
                <div class="rarity-section ${tier}">
                    <div class="rarity-section-header ${tier}">
                        <div class="rarity-section-title">
                            <span class="rarity-icon">${rarity.icon}</span>
                            ${rarity.label}
                        </div>
                        <div class="rarity-section-count">${tierTrophies.length} discovered</div>
                    </div>
                    <div class="trophy-rarity-grid">
                        ${tierTrophies.map(trophy => this.createTrophyHTML(trophy)).join('')}
                    </div>
                </div>
            `;
        });

        this.trophyGrid.innerHTML = html;
    }

    displayFlatGuestTrophies(trophies) {
        const html = trophies.map(trophy => this.createTrophyHTML(trophy)).join('');
        this.trophyGrid.innerHTML = `<div class="trophy-flat-grid">${html}</div>`;
    }

    displayEmptyGuestState() {
        if (!this.trophyGrid) return;

        this.trophyGrid.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🎬</div>
                <h3>Start Your Collection!</h3>
                <p>Spin the lootbox to discover movies and TV shows.<br>Your discoveries will appear here as trophies!</p>
                <button class="btn btn-primary" onclick="window.router?.navigate('/game')">
                    <span>🎰</span>
                    Start Spinning
                </button>
            </div>
        `;
    }

    updateGuestStats(session) {
        if (!this.trophyStats) return;

        const stats = guestSession.getStats();
        
        this.trophyStats.innerHTML = `
            <div class="guest-stats-banner">
                <div class="guest-badge">👤 Guest Session</div>
                <p>Sign up to save your progress permanently!</p>
            </div>
            <div class="trophy-stat">
                <span class="stat-value">${stats.totalUnlocks}</span>
                <span class="stat-label">Discoveries</span>
            </div>
            <div class="trophy-stat">
                <span class="stat-value">${stats.totalSpins}</span>
                <span class="stat-label">Total Spins</span>
            </div>
            <div class="trophy-stat">
                <span class="stat-value">${stats.uniqueRarities}</span>
                <span class="stat-label">Rarity Types</span>
            </div>
            <div class="trophy-stat">
                <span class="stat-value">${stats.highestQualityScore.toFixed(1)}</span>
                <span class="stat-label">Best Find</span>
            </div>
        `;
    }

    addGuestTutorialPrompts() {
        // Add trophy cabinet tutorial prompt
        if (!document.querySelector('.trophy-tutorial-prompt')) {
            const prompt = document.createElement('div');
            prompt.className = 'trophy-tutorial-prompt';
            prompt.innerHTML = `
                <div class="tutorial-content">
                    <div class="tutorial-icon">🏆</div>
                    <div class="tutorial-text">
                        <strong>Trophy Cabinet Fun!</strong>
                        <span>Collect all rarities and build your perfect movie library. Click cards to see details!</span>
                    </div>
                </div>
            `;
            
            const trophyGrid = this.trophyGrid;
            if (trophyGrid && trophyGrid.parentNode) {
                trophyGrid.parentNode.insertBefore(prompt, trophyGrid);
            }
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

    async loadUnlockStats() {
        try {
            const params = {};
            if (this.currentFilters.type) {
                params.type = this.currentFilters.type;
            }

            const response = await api.user.getUnlockStats(params);
            if (response.success) {
                this.unlockStats = response.stats;
                this.renderUnlockCounters();
            }
        } catch (error) {
            console.warn('Failed to load unlock stats:', error);
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

    renderUnlockCounters() {
        if (!this.rarityCounters || !this.unlockStats.length) return;

        const rarityIcons = {
            mythic: '🌟',
            legendary: '👑',
            epic: '💎',
            rare: '⭐',
            uncommon: '🔹',
            common: '⚪'
        };

        this.rarityCounters.innerHTML = this.unlockStats
            .filter(stat => stat.total > 0) // Only show rarities that exist
            .map(stat => `
                <div class="rarity-counter ${stat.rarity}">
                    <span class="rarity-icon">${rarityIcons[stat.rarity]}</span>
                    <span class="unlock-count">${stat.unlocked}</span>
                    <span class="total-count">/${stat.total}</span>
                </div>
            `).join('');
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

        if (this.currentFilters.groupByRarity) {
            this.renderTrophiesGrouped();
        } else {
            this.trophyGrid.innerHTML = this.trophies.map(trophy => this.createTrophyCard(trophy)).join('');
        }
        
        // Adjust card descriptions after rendering
        setTimeout(() => {
            if (UI && UI.adjustCardDescriptions) {
                UI.adjustCardDescriptions();
            }
            // Add click handlers for card detail modal
            this.addCardClickHandlers();
        }, 100);
    }

    renderTrophiesGrouped() {
        const rarityOrder = ['mythic', 'legendary', 'epic', 'rare', 'uncommon', 'common'];
        const rarityIcons = {
            mythic: '🌟',
            legendary: '👑',
            epic: '💎',
            rare: '⭐',
            uncommon: '🔹',
            common: '⚪'
        };
        
        // Group trophies by rarity
        const groupedTrophies = {};
        this.trophies.forEach(trophy => {
            if (!groupedTrophies[trophy.rarity_tier]) {
                groupedTrophies[trophy.rarity_tier] = [];
            }
            groupedTrophies[trophy.rarity_tier].push(trophy);
        });

        let html = '';
        
        // Render each rarity section
        rarityOrder.forEach(rarity => {
            const trophiesInRarity = groupedTrophies[rarity] || [];
            if (trophiesInRarity.length > 0) {
                html += `
                    <div class=\"rarity-section\">
                        <div class=\"rarity-section-header ${rarity}\">
                            <span class=\"rarity-section-title\">
                                ${rarityIcons[rarity]} ${rarity.charAt(0).toUpperCase() + rarity.slice(1)}
                            </span>
                            <span class=\"rarity-section-count\">${trophiesInRarity.length} items</span>
                        </div>
                    </div>
                `;
                
                // Add trophy cards for this rarity
                html += trophiesInRarity.map(trophy => this.createTrophyCard(trophy)).join('');
            }
        });

        this.trophyGrid.innerHTML = html;
        
        // Adjust card descriptions after rendering
        setTimeout(() => {
            if (UI && UI.adjustCardDescriptions) {
                UI.adjustCardDescriptions();
            }
            // Add click handlers for card detail modal
            this.addCardClickHandlers();
        }, 100);
    }

    createTrophyCard(trophy) {
        const unlockedDate = Utils.formatRelativeTime(trophy.unlocked_at);
        const rarity = Utils.getRarityTier(trophy.quality_score);
        const contentEmoji = trophy.emoji || (trophy.type === 'series' ? '📺' : '🎬');
        const contentType = trophy.type === 'series' ? '📺 Series' : '🎬 Movie';
        const durationLabel = trophy.type === 'series' ? 'Seasons' : 'Runtime';
        const durationValue = trophy.type === 'series' ? (trophy.seasons || 'N/A') : trophy.duration;
        
        // Format year for series
        let yearDisplay = trophy.year;
        if (trophy.type === 'series' && trophy.end_year && trophy.end_year !== trophy.year) {
            yearDisplay = `${trophy.year}-${trophy.end_year}`;
        }
        
        return `
            <div class="collectible-card small subtle ${trophy.rarity_tier}" data-type="${trophy.spin_type}" data-trophy='${JSON.stringify(trophy).replace(/'/g, "&apos;")}'>
                <div class="collectible-card-inner">
                    <div class="collectible-card-header">
                        <div class="collectible-card-title">${Utils.sanitizeHtml(trophy.title)}</div>
                        <div class="collectible-card-cost">${trophy.quality_score}</div>
                    </div>
                    
                    <div class="collectible-card-art">
                        <div class="collectible-card-type">${contentType}</div>
                        <div class="collectible-rarity-gem">${rarity.icon}</div>
                        ${contentEmoji}
                    </div>
                    
                    <div class="collectible-card-stats">
                        <div class="collectible-stats-row">
                            <span class="collectible-stat-label">Quality Score</span>
                            <span class="collectible-stat-value collectible-quality-score">${trophy.quality_score}</span>
                        </div>
                        <div class="collectible-stats-row">
                            <span class="collectible-stat-label">Critics</span>
                            <span class="collectible-stat-value">${trophy.critics_score || 'N/A'}%</span>
                        </div>
                        <div class="collectible-stats-row">
                            <span class="collectible-stat-label">Audience</span>
                            <span class="collectible-stat-value">${trophy.audience_score || 'N/A'}%</span>
                        </div>
                        <div class="collectible-stats-row">
                            <span class="collectible-stat-label">${durationLabel}</span>
                            <span class="collectible-stat-value">${durationValue}</span>
                        </div>
                    </div>
                    
                    <div class="collectible-card-description">
                        <div class="collectible-description-text">${Utils.sanitizeHtml(trophy.description)}</div>
                    </div>
                    
                    <div class="collectible-card-footer">
                        <div class="collectible-card-year">${yearDisplay}</div>
                        <div class="collectible-card-rarity">${trophy.rarity_tier.charAt(0).toUpperCase() + trophy.rarity_tier.slice(1)}</div>
                    </div>
                    
                    <!-- Trophy unlock timestamp -->
                    <div class="collectible-card-unlock-time">
                        <span class="unlock-icon">🔓</span>
                        <span class="unlock-text">${unlockedDate}</span>
                    </div>
                </div>
            </div>
        `;
    }

    addCardClickHandlers() {
        const cards = this.trophyGrid.querySelectorAll('.collectible-card.small[data-trophy]');
        cards.forEach(card => {
            card.style.cursor = 'pointer';
            card.addEventListener('click', () => {
                try {
                    const trophyData = JSON.parse(card.getAttribute('data-trophy').replace(/&apos;/g, "'"));
                    if (trophyData && UI && UI.showCardDetailModal) {
                        UI.showCardDetailModal(trophyData);
                    }
                } catch (error) {
                    console.error('Error parsing trophy data:', error);
                }
            });
        });
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

    async loadMoreTrophies() {
        if (!this.hasMore || this.isLoading) return;
        
        const nextPage = this.currentPage + 1;
        await this.loadTrophies(nextPage, true);
    }

    updateLoadMoreButton() {
        if (!this.pagination) return;

        if (!this.hasMore) {
            this.pagination.innerHTML = `
                <div class="load-more-container">
                    <p class="no-more-text">
                        🎯 You've seen all your trophies! 
                        <span class="trophy-count">${this.trophies.length} total</span>
                    </p>
                </div>
            `;
            return;
        }

        this.pagination.innerHTML = `
            <div class="load-more-container">
                <button class="load-more-btn" id="loadMoreBtn" ${this.isLoading ? 'disabled' : ''}>
                    ${this.isLoading ? 
                        '<span class="loading-spinner"></span> Loading more...' : 
                        `<span class="load-icon">⬇️</span> Load More Trophies`
                    }
                </button>
                <p class="trophy-count-text">
                    Showing ${this.trophies.length} trophies
                    ${this.isLoading ? ' • Loading more...' : ''}
                </p>
            </div>
        `;

        // Add loading skeletons if currently loading
        if (this.isLoading) {
            this.showLoadingSkeletons();
        }

        // Add click handler
        const loadMoreBtn = document.getElementById('loadMoreBtn');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => this.loadMoreTrophies());
        }
    }

    showLoadingSkeletons() {
        if (!this.trophyGrid) return;
        
        // Create 6 skeleton cards for loading state
        const skeletons = Array.from({length: 6}, (_, i) => `
            <div class="trophy-skeleton" data-skeleton="true">
                <div class="skeleton-header">
                    <div class="skeleton-badge"></div>
                    <div class="skeleton-date"></div>
                </div>
                <div class="skeleton-title"></div>
                <div class="skeleton-details">
                    <div class="skeleton-detail"></div>
                    <div class="skeleton-detail"></div>
                    <div class="skeleton-detail"></div>
                </div>
                <div class="skeleton-description">
                    <div class="skeleton-line"></div>
                    <div class="skeleton-line short"></div>
                </div>
            </div>
        `).join('');
        
        this.trophyGrid.insertAdjacentHTML('beforeend', skeletons);
    }

    removeLoadingSkeletons() {
        const skeletons = document.querySelectorAll('[data-skeleton="true"]');
        skeletons.forEach(skeleton => skeleton.remove());
    }

    applyFilters() {
        this.currentFilters.type = this.typeFilter?.value || '';
        this.currentFilters.rarity = this.rarityFilter?.value || '';
        this.currentFilters.sort = this.sortFilter?.value || 'unlock_time';
        this.currentFilters.groupByRarity = this.groupByRarityToggle?.checked ?? true;
        
        // Reset pagination state
        this.currentPage = 1;
        this.hasMore = true;
        this.trophies = [];
        
        this.loadTrophies(1);
    }

    clearAllFilters() {
        if (this.typeFilter) {
            this.typeFilter.value = '';
        }
        if (this.rarityFilter) {
            this.rarityFilter.value = '';
        }
        if (this.sortFilter) {
            this.sortFilter.value = 'unlock_time';
        }
        if (this.groupByRarityToggle) {
            this.groupByRarityToggle.checked = true;
        }
        
        this.currentFilters = {
            type: '',
            rarity: '',
            sort: 'unlock_time',
            groupByRarity: true
        };
        
        // Reset pagination state
        this.currentPage = 1;
        this.hasMore = true;
        this.trophies = [];
        
        this.loadTrophies(1);
        
        UI.showNotification('All filters cleared', 'success');
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
        console.log('🔧 Trophy: Returning to game via router...');
        
        // Use router navigation
        if (window.router) {
            window.router.navigate('/game');
        } else {
            console.error('🔧 Trophy: Router not available');
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