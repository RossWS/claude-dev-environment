// Admin panel functionality
class AdminPanel {
    constructor() {
        this.currentPage = 1;
        this.currentFilters = {
            type: '',
            rarity: '',
            sort: 'quality_score_desc'
        };
        this.content = [];
        this.stats = {};
        this.users = [];
        this.activities = [];
        this.settings = [];
        this.refreshInterval = null;
        this.initializeElements();
        this.attachEventListeners();
    }

    initializeElements() {
        this.adminScreen = document.getElementById('adminScreen');
        this.adminContentGrid = document.getElementById('adminContentGrid');
        this.adminPagination = document.getElementById('adminPagination');
        
        // Filters
        this.typeFilter = document.getElementById('adminTypeFilter');
        this.rarityFilter = document.getElementById('adminRarityFilter');
        this.sortFilter = document.getElementById('adminSortFilter');
        
        // Stats
        this.totalContentCount = document.getElementById('totalContentCount');
        this.movieCount = document.getElementById('movieCount');
        this.seriesCount = document.getElementById('seriesCount');
        
        // Tabs
        this.adminTabs = document.querySelectorAll('.admin-tab');
        this.adminTabContents = document.querySelectorAll('.admin-tab-content');
    }

    attachEventListeners() {
        // Filter changes
        if (this.typeFilter) {
            this.typeFilter.addEventListener('change', () => this.applyFilters());
        }
        
        if (this.rarityFilter) {
            this.rarityFilter.addEventListener('change', () => this.applyFilters());
        }
        
        if (this.sortFilter) {
            this.sortFilter.addEventListener('change', () => this.applyFilters());
        }

        // Back button
        const backBtn = document.getElementById('backToGameFromAdmin');
        if (backBtn) {
            backBtn.addEventListener('click', () => this.hideAdminScreen());
        }

        // Tab switching
        this.adminTabs.forEach(tab => {
            tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
        });
    }

    async showAdminScreen() {
        console.log('🔧 Admin: Showing admin screen...');
        
        // Screen switching is handled by UI.js, we just need to initialize the admin panel
        // Default to dashboard tab
        this.switchTab('dashboard');
        
        // Start auto-refresh for dashboard
        this.startAutoRefresh();
    }

    hideAdminScreen() {
        console.log('🔧 Admin: Returning to game via router...');
        
        // Stop auto-refresh when leaving admin
        this.stopAutoRefresh();
        
        // Use router navigation
        if (window.router) {
            window.router.navigate('/game');
        } else {
            console.error('🔧 Admin: Router not available');
        }
    }

    switchTab(tabName) {
        // Update tab buttons
        this.adminTabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // Update tab contents
        this.adminTabContents.forEach(content => {
            content.classList.toggle('active', content.id === `admin${tabName.charAt(0).toUpperCase() + tabName.slice(1)}Tab`);
        });

        // Load data for specific tabs
        switch (tabName) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'users':
                this.loadUsers(1);
                break;
            case 'content':
                this.loadContent(1);
                break;
            case 'activities':
                this.loadActivities(1);
                break;
            case 'settings':
                this.loadSettings();
                break;
        }
    }

    async loadContent(page = 1) {
        try {
            console.log('🔧 Admin: Loading content page', page);
            UI.showLoading(true);

            const params = {
                page,
                limit: 20,
                type: this.currentFilters.type,
                rarity: this.currentFilters.rarity,
                sort: this.currentFilters.sort
            };

            // Remove empty filters
            Object.keys(params).forEach(key => {
                if (!params[key]) delete params[key];
            });

            console.log('🔧 Admin: API request params:', params);
            const response = await api.admin.getContent(params);
            console.log('🔧 Admin: API response:', response);

            if (response.success) {
                this.content = response.content;
                this.currentPage = page;
                console.log('🔧 Admin: Content loaded:', this.content.length, 'items');
                this.renderContent();
                this.renderContentPagination(response.pagination);
            } else {
                console.error('🔧 Admin: API error:', response.message);
                UI.showNotification(response.message || 'Failed to load content', 'error');
            }

        } catch (error) {
            console.error('Admin content loading error:', error);
            UI.showNotification(error.message || 'Failed to load content', 'error');
        } finally {
            UI.showLoading(false);
        }
    }

    async loadStats() {
        try {
            console.log('🔧 Admin: Making API call to getStats...');
            const response = await api.admin.getStats();
            console.log('🔧 Admin: Stats API response:', response);
            
            if (response.success) {
                this.stats = response.stats;
                console.log('🔧 Admin: Stats data:', this.stats);
                this.renderStats();
            } else {
                console.error('🔧 Admin: Stats API returned failure:', response.message);
                throw new Error(response.message || 'Failed to load stats from API');
            }
        } catch (error) {
            console.error('🔧 Admin: Failed to load admin stats:', error);
            throw error; // Re-throw so caller can handle
        }
    }

    renderStats() {
        if (this.totalContentCount && this.stats.content) {
            this.totalContentCount.textContent = this.stats.content.total || 0;
            this.movieCount.textContent = this.stats.content.movies || 0;
            this.seriesCount.textContent = this.stats.content.series || 0;
        }
    }

    renderContent() {
        if (!this.adminContentGrid) return;

        // Ensure this.content is defined and is an array
        if (!this.content || !Array.isArray(this.content) || this.content.length === 0) {
            this.adminContentGrid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📋</div>
                    <h3>No Content Found</h3>
                    <p>Try adjusting your filters to see more content.</p>
                </div>
            `;
            return;
        }

        this.adminContentGrid.innerHTML = this.content.map(item => this.createContentCard(item)).join('');
        
        // Add click handlers for card detail modal
        setTimeout(() => {
            this.addAdminCardClickHandlers();
        }, 100);
    }

    createContentCard(item) {
        const rarity = Utils.getRarityTier(item.quality_score);
        const platforms = JSON.parse(item.platforms || '[]');
        const contentEmoji = item.emoji || (item.type === 'series' ? '📺' : '🎬');
        const contentType = item.type === 'series' ? '📺 Series' : '🎬 Movie';
        const durationLabel = item.type === 'series' ? 'Seasons' : 'Runtime';
        const durationValue = item.type === 'series' ? (item.seasons || 'N/A') : item.duration;
        
        // Format year for series
        let yearDisplay = item.year;
        if (item.type === 'series' && item.end_year && item.end_year !== item.year) {
            yearDisplay = `${item.year}-${item.end_year}`;
        }
        
        return `
            <div class="collectible-card mini subtle ${item.rarity_tier}" data-type="${item.type}" data-item='${JSON.stringify(item).replace(/'/g, "&apos;")}' style="margin: 0 auto; cursor: pointer;">
                <div class="collectible-card-inner">
                    <div class="collectible-card-header">
                        <div class="collectible-card-title">${Utils.sanitizeHtml(item.title)}</div>
                        <div class="collectible-card-cost">${item.quality_score}</div>
                    </div>
                    
                    <div class="collectible-card-art">
                        <div class="collectible-card-type">${contentType}</div>
                        <div class="collectible-rarity-gem">${rarity.icon}</div>
                        ${contentEmoji}
                    </div>
                    
                    <div class="collectible-card-stats">
                        <div class="collectible-stats-row">
                            <span class="collectible-stat-label">Quality</span>
                            <span class="collectible-stat-value collectible-quality-score">${item.quality_score}</span>
                        </div>
                        <div class="collectible-stats-row">
                            <span class="collectible-stat-label">Critics</span>
                            <span class="collectible-stat-value">${item.critics_score}%</span>
                        </div>
                        <div class="collectible-stats-row">
                            <span class="collectible-stat-label">Audience</span>
                            <span class="collectible-stat-value">${item.audience_score}%</span>
                        </div>
                        <div class="collectible-stats-row">
                            <span class="collectible-stat-label">IMDB</span>
                            <span class="collectible-stat-value">${item.imdb_rating}/10</span>
                        </div>
                    </div>
                    
                    <div class="collectible-card-description">
                        <div class="collectible-description-text">${Utils.sanitizeHtml(item.description)}</div>
                    </div>
                    
                    <div class="collectible-card-footer">
                        <div class="collectible-card-year">${yearDisplay}</div>
                        <div class="collectible-card-rarity">${item.rarity_tier.charAt(0).toUpperCase() + item.rarity_tier.slice(1)}</div>
                    </div>
                </div>
                
                <!-- Admin info overlay -->
                <div class="admin-info-overlay" style="position: absolute; bottom: 8px; left: 8px; right: 8px; background: rgba(0,0,0,0.9); color: white; padding: 4px 6px; border-radius: 4px; font-size: 0.6rem; z-index: 10;">
                    Release: ${item.month} ${item.year} | ${durationLabel}: ${durationValue}
                    ${platforms.length > 0 ? `<br>Platforms: ${platforms.slice(0, 2).join(', ')}${platforms.length > 2 ? ` +${platforms.length - 2}` : ''}` : ''}
                </div>
            </div>
        `;
    }

    renderContentPlatforms(platforms) {
        if (!platforms || platforms.length === 0) return '';
        
        return `
            <div class="trophy-platforms" style="margin-top: var(--space-3);">
                ${platforms.slice(0, 4).map(platform => 
                    `<span class="platform-badge">${Utils.sanitizeHtml(platform)}</span>`
                ).join('')}
                ${platforms.length > 4 ? `<span class="platform-more">+${platforms.length - 4}</span>` : ''}
            </div>
        `;
    }

    addAdminCardClickHandlers() {
        const cards = this.adminContentGrid.querySelectorAll('.collectible-card.mini[data-item]');
        cards.forEach(card => {
            card.addEventListener('click', () => {
                try {
                    const itemData = JSON.parse(card.getAttribute('data-item').replace(/&apos;/g, "'"));
                    if (itemData && UI && UI.showCardDetailModal) {
                        UI.showCardDetailModal(itemData);
                    }
                } catch (error) {
                    console.error('Error parsing item data:', error);
                }
            });
        });
    }

    renderContentPagination(pagination) {
        if (!this.adminPagination || !pagination) return;

        const { page, pages, hasPrev, hasNext } = pagination;

        let paginationHTML = '';

        // Previous button
        paginationHTML += `
            <button class="pagination-btn" ${!hasPrev ? 'disabled' : ''} 
                    onclick="adminPanel.loadContent(${page - 1})">
                ← Previous
            </button>
        `;

        // Page numbers (show up to 5 pages around current)
        const startPage = Math.max(1, page - 2);
        const endPage = Math.min(pages, page + 2);

        if (startPage > 1) {
            paginationHTML += `
                <button class="pagination-btn" onclick="adminPanel.loadContent(1)">1</button>
                ${startPage > 2 ? '<span class="pagination-ellipsis">...</span>' : ''}
            `;
        }

        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <button class="pagination-btn ${i === page ? 'active' : ''}" 
                        onclick="adminPanel.loadContent(${i})">
                    ${i}
                </button>
            `;
        }

        if (endPage < pages) {
            paginationHTML += `
                ${endPage < pages - 1 ? '<span class="pagination-ellipsis">...</span>' : ''}
                <button class="pagination-btn" onclick="adminPanel.loadContent(${pages})">
                    ${pages}
                </button>
            `;
        }

        // Next button
        paginationHTML += `
            <button class="pagination-btn" ${!hasNext ? 'disabled' : ''} 
                    onclick="adminPanel.loadContent(${page + 1})">
                Next →
            </button>
        `;

        this.adminPagination.innerHTML = paginationHTML;
    }

    applyFilters() {
        this.currentFilters.type = this.typeFilter?.value || '';
        this.currentFilters.rarity = this.rarityFilter?.value || '';
        this.currentFilters.sort = this.sortFilter?.value || 'quality_score_desc';
        this.currentPage = 1;
        this.loadContent(1);
    }

    // Dashboard functionality
    async loadDashboard() {
        try {
            console.log('🔧 Admin: Loading dashboard...');
            
            // Check if user has admin permissions before trying to load data
            if (!authManager.isAuthenticated || !authManager.hasPermission('admin')) {
                console.error('🔧 Admin: User not authenticated as admin');
                UI.showNotification('Admin authentication required', 'error');
                return;
            }
            
            UI.showLoading(true);
            console.log('🔧 Admin: Starting parallel data loading...');
            
            // Load each component individually with specific error handling
            const results = [];
            
            // Load stats
            try {
                console.log('🔧 Admin: Loading stats...');
                await this.loadStats();
                console.log('🔧 Admin: Stats loaded successfully');
                results.push('stats: success');
            } catch (err) {
                console.error('🔧 Admin: Stats loading failed:', err);
                results.push(`stats: failed - ${err.message}`);
                // Don't fail completely, continue with other data
            }
            
            // Load recent activity
            try {
                console.log('🔧 Admin: Loading recent activity...');
                await this.loadRecentActivity();
                console.log('🔧 Admin: Recent activity loaded successfully');
                results.push('activity: success');
            } catch (err) {
                console.error('🔧 Admin: Activity loading failed:', err);
                results.push(`activity: failed - ${err.message}`);
                // Don't fail completely, continue with other data
            }
            
            // Load content performance data
            try {
                console.log('🔧 Admin: Loading content performance...');
                await this.loadContentPerformance();
                console.log('🔧 Admin: Content performance loaded successfully');
                results.push('performance: success');
            } catch (err) {
                console.error('🔧 Admin: Content performance loading failed:', err);
                results.push(`performance: failed - ${err.message}`);
                // Don't fail completely, continue with other data
            }
            
            // Load system health (this shouldn't fail as it's mock data)
            try {
                console.log('🔧 Admin: Loading system health...');
                await this.loadSystemHealth();
                console.log('🔧 Admin: System health loaded successfully');
                results.push('health: success');
            } catch (err) {
                console.error('🔧 Admin: System health loading failed:', err);
                results.push(`health: failed - ${err.message}`);
            }
            
            console.log('🔧 Admin: Data loading results:', results);
            console.log('🔧 Admin: Rendering dashboard...');
            this.renderDashboard();
            console.log('🔧 Admin: Dashboard rendered successfully');
            
            // Show success message
            const successCount = results.filter(r => r.includes('success')).length;
            if (successCount > 0) {
                UI.showNotification(`Admin dashboard loaded (${successCount}/3 components)`, 'success');
            } else {
                UI.showNotification('Admin dashboard loaded with limited data', 'warning');
            }
            
        } catch (error) {
            console.error('🔧 Admin: Dashboard loading error:', error);
            console.error('🔧 Admin: Error details:', {
                message: error.message,
                stack: error.stack,
                stats: this.stats,
                activities: this.activities,
                systemHealth: this.systemHealth
            });
            UI.showNotification(`Failed to load dashboard: ${error.message}`, 'error');
        } finally {
            UI.showLoading(false);
        }
    }

    async loadRecentActivity(loadMore = false) {
        try {
            console.log('🔧 Admin: Making API call to getActivity...');
            
            // If loadMore is false, reset to first page, otherwise increment page
            if (!loadMore) {
                this.activityPage = 1;
                this.activities = [];
            } else {
                this.activityPage = (this.activityPage || 1) + 1;
            }
            
            const response = await api.admin.getActivity({ 
                page: this.activityPage, 
                limit: 50  // Show more activities (50 per page instead of 5)
            });
            console.log('🔧 Admin: Activity API response:', response);
            
            if (response.success) {
                const newActivities = response.activities || [];
                
                if (loadMore) {
                    // Append to existing activities
                    this.activities = [...this.activities, ...newActivities];
                } else {
                    // Replace activities
                    this.activities = newActivities;
                }
                
                // Store pagination info for "Load More" functionality
                this.activityPagination = response.pagination || { hasMore: false };
                
                console.log('🔧 Admin: Activity data:', this.activities.length, 'total items');
            } else {
                console.error('🔧 Admin: Activity API returned failure:', response.message);
                throw new Error(response.message || 'Failed to load activity from API');
            }
        } catch (error) {
            console.error('🔧 Admin: Failed to load recent activity:', error);
            if (!loadMore) {
                this.activities = [];
            }
            throw error; // Re-throw so caller can handle
        }
    }

    async loadContentPerformance() {
        try {
            console.log('🔧 Admin: Making API call to get content performance...');
            
            // Get most popular content (most unlocked)
            const popularResponse = await api.admin.getContent({ sort: 'popularity', limit: 10 });
            
            // Get rarity distribution data from existing stats
            const rarityData = this.stats?.breakdowns?.rarity || [];
            
            // Get recent unlock trends (from activities we already have)
            const recentTrends = this.activities
                ?.filter(activity => activity.was_new_unlock)
                .reduce((acc, activity) => {
                    const contentId = activity.content_id || activity.title;
                    acc[contentId] = (acc[contentId] || 0) + 1;
                    return acc;
                }, {});
            
            this.contentPerformance = {
                popular: popularResponse?.success ? popularResponse.content : [],
                rarity: rarityData,
                trends: Object.entries(recentTrends || {})
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 5)
                    .map(([title, unlocks]) => ({ title, unlocks })),
                unlockRate: this.activities
                    ? (this.activities.filter(a => a.was_new_unlock).length / this.activities.length * 100).toFixed(1)
                    : 0
            };
            
            console.log('🔧 Admin: Content performance data:', this.contentPerformance);
            
        } catch (error) {
            console.error('🔧 Admin: Failed to load content performance:', error);
            this.contentPerformance = { popular: [], rarity: [], trends: [], unlockRate: 0 };
            throw error;
        }
    }

    async loadSystemHealth() {
        try {
            // This would be a new endpoint for system health metrics
            // For now, we'll simulate some basic health data
            this.systemHealth = {
                serverStatus: 'healthy',
                databaseStatus: 'healthy',
                apiResponseTime: Math.random() * 100 + 50,
                activeUsers: Math.floor(Math.random() * 50) + 10,
                errorRate: Math.random() * 2
            };
        } catch (error) {
            console.warn('Failed to load system health:', error);
        }
    }

    renderDashboard() {
        this.renderDashboardMetrics();
        this.renderRecentActivity();
        this.renderContentPerformance();
        this.renderQuickActions();
    }

    renderDashboardMetrics() {
        console.log('🔧 Admin: Rendering dashboard metrics...', this.stats);
        
        if (!this.stats.users) {
            console.log('🔧 Admin: No stats.users data available');
            return;
        }

        const metricsElements = {
            totalUsers: document.getElementById('dashTotalUsers'),
            activeUsers: document.getElementById('dashActiveUsers'),
            totalContent: document.getElementById('dashTotalContent'),
            spinsToday: document.getElementById('dashTotalSpins'),
            // Additional elements for change indicators
            usersChange: document.getElementById('dashUsersChange'),
            contentSplit: document.getElementById('dashContentSplit'),
            spinsChange: document.getElementById('dashSpinsChange')
        };

        console.log('🔧 Admin: Found metric elements:', Object.keys(metricsElements).map(key => ({ [key]: !!metricsElements[key] })));

        if (metricsElements.totalUsers) {
            const value = this.stats.users?.total || 0;
            metricsElements.totalUsers.textContent = value;
            console.log('🔧 Admin: Set totalUsers to:', value);
        }
        
        if (metricsElements.activeUsers) {
            const value = this.systemHealth?.activeUsers || this.stats.users?.activeLastWeek || 0;
            metricsElements.activeUsers.textContent = value;
            console.log('🔧 Admin: Set activeUsers to:', value);
        }
        
        if (metricsElements.totalContent) {
            const value = this.stats.content?.total || 0;
            metricsElements.totalContent.textContent = value;
            console.log('🔧 Admin: Set totalContent to:', value);
        }
        
        if (metricsElements.spinsToday) {
            const value = this.stats.activity?.spinsToday || 0;
            metricsElements.spinsToday.textContent = value;
            console.log('🔧 Admin: Set spinsToday to:', value);
        }
        
        // Update change indicators
        if (metricsElements.usersChange) {
            const weeklyChange = this.stats.users?.activeLastWeek || 0;
            metricsElements.usersChange.textContent = `+${weeklyChange} this week`;
        }
        
        if (metricsElements.contentSplit) {
            const movies = this.stats.content?.movies || 0;
            const series = this.stats.content?.series || 0;
            metricsElements.contentSplit.textContent = `${movies} movies, ${series} series`;
        }
        
        if (metricsElements.spinsChange) {
            const totalUnlocks = this.stats.activity?.totalUnlocks || 0;
            metricsElements.spinsChange.textContent = `${totalUnlocks} total unlocks`;
        }
    }

    renderRecentActivity() {
        // Render the recent activity list as requested - showing recent actions by all users
        const container = document.getElementById('userActivityChart');
        console.log('🔧 Admin: Looking for activity container:', !!container);
        
        if (!container) {
            console.log('🔧 Admin: No userActivityChart container found');
            return;
        }

        if (!this.activities || this.activities.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📊</div>
                    <h4>No Recent Activity</h4>
                    <p>No user activities to display yet.</p>
                </div>
            `;
            return;
        }

        console.log('🔧 Admin: Rendering', this.activities.length, 'recent user activities');
        
        const activitiesHtml = this.activities.map(activity => `
            <div class="activity-item">
                <div class="activity-user">👤 ${Utils.sanitizeHtml(activity.username)}</div>
                <div class="activity-action">
                    ${activity.was_new_unlock ? '🎉 Unlocked' : '🔄 Got duplicate'} 
                    <span class="activity-title">${Utils.sanitizeHtml(activity.title)}</span>
                    <span class="activity-rarity rarity-${activity.rarity_tier}">${activity.rarity_tier.toUpperCase()}</span>
                </div>
                <div class="activity-time">⏰ ${Utils.formatRelativeTime(activity.created_at)}</div>
            </div>
        `).join('');
        
        const hasMore = this.activityPagination && this.activityPagination.hasMore;
        const loadMoreButton = hasMore ? `
            <div class="activity-load-more">
                <button class="btn btn-secondary" id="loadMoreActivitiesBtn">
                    <span class="load-icon">📊</span>
                    Load More Activities
                </button>
                <p class="activity-count-text">Showing ${this.activities.length} activities</p>
            </div>
        ` : `
            <div class="activity-load-more">
                <p class="activity-count-text">Showing all ${this.activities.length} activities</p>
            </div>
        `;
        
        container.innerHTML = `
            <div class="recent-activities-list">
                ${activitiesHtml}
                ${loadMoreButton}
            </div>
        `;
        
        // Add event listener for load more button
        if (hasMore) {
            const loadMoreBtn = document.getElementById('loadMoreActivitiesBtn');
            if (loadMoreBtn) {
                loadMoreBtn.addEventListener('click', async () => {
                    loadMoreBtn.disabled = true;
                    loadMoreBtn.innerHTML = '<span class="loading-spinner"></span> Loading...';
                    
                    try {
                        await this.loadRecentActivity(true); // Load more activities
                        this.renderRecentActivity(); // Re-render with new activities
                    } catch (error) {
                        console.error('Failed to load more activities:', error);
                        UI.showNotification('Failed to load more activities', 'error');
                        loadMoreBtn.disabled = false;
                        loadMoreBtn.innerHTML = '<span class="load-icon">📊</span> Load More Activities';
                    }
                });
            }
        }
    }

    renderContentPerformance() {
        const container = document.getElementById('contentPerformanceChart');
        console.log('🔧 Admin: Looking for content performance container:', !!container);
        
        if (!container) {
            console.log('🔧 Admin: No contentPerformanceChart container found');
            return;
        }

        if (!this.contentPerformance) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📈</div>
                    <h4>No Performance Data</h4>
                    <p>Content performance data is not available.</p>
                </div>
            `;
            return;
        }

        console.log('🔧 Admin: Rendering content performance data');
        
        const { popular, rarity, trends, unlockRate } = this.contentPerformance;
        
        const performanceStats = `
            <div class="performance-stats">
                <div class="stat-item">
                    <span class="stat-value">${unlockRate}%</span>
                    <span class="stat-label">New Unlock Rate</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${trends.length}</span>
                    <span class="stat-label">Trending Items</span>
                </div>
            </div>
        `;
        
        const trendingContent = trends.length > 0 ? `
            <div class="trending-content">
                <h5>🔥 Recently Trending</h5>
                <div class="trending-list">
                    ${trends.map(item => `
                        <div class="trending-item">
                            <span class="trending-title">${Utils.sanitizeHtml(item.title)}</span>
                            <span class="trending-count">${item.unlocks} recent unlocks</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : '';
        
        const rarityBreakdown = rarity.length > 0 ? `
            <div class="rarity-breakdown">
                <h5>📊 Unlock Distribution</h5>
                <div class="rarity-list">
                    ${rarity.map(item => `
                        <div class="rarity-item">
                            <span class="rarity-name">${item.rarity_tier}</span>
                            <span class="rarity-count">${item.count} unlocks</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : '';
        
        container.innerHTML = `
            <div class="content-performance-data">
                ${performanceStats}
                ${trendingContent}
                ${rarityBreakdown}
            </div>
        `;
    }

    renderQuickActions() {
        console.log('🔧 Admin: Setting up quick actions...');
        
        // Quick actions are already in HTML, just need to attach event listeners
        const grantSpinsBtn = document.getElementById('grantSpinsAction');
        const exportDataBtn = document.getElementById('exportDataAction');
        const broadcastBtn = document.getElementById('broadcastAction');

        console.log('🔧 Admin: Found buttons:', {
            grantSpins: !!grantSpinsBtn,
            exportData: !!exportDataBtn,
            broadcast: !!broadcastBtn
        });

        if (grantSpinsBtn && !grantSpinsBtn.hasEventListener) {
            grantSpinsBtn.addEventListener('click', () => {
                console.log('🔧 Admin: Grant spins clicked');
                this.showGrantSpinsModal();
            });
            grantSpinsBtn.hasEventListener = true;
            console.log('🔧 Admin: Grant spins event listener added');
        }

        if (exportDataBtn && !exportDataBtn.hasEventListener) {
            exportDataBtn.addEventListener('click', () => {
                console.log('🔧 Admin: Export data clicked');
                this.exportData();
            });
            exportDataBtn.hasEventListener = true;
            console.log('🔧 Admin: Export data event listener added');
        }

        if (broadcastBtn && !broadcastBtn.hasEventListener) {
            broadcastBtn.addEventListener('click', () => {
                console.log('🔧 Admin: Broadcast clicked');
                this.showBroadcastModal();
            });
            broadcastBtn.hasEventListener = true;
            console.log('🔧 Admin: Broadcast event listener added');
        }
    }

    // Users management
    async loadUsers(page = 1) {
        try {
            console.log('🔧 Admin: Loading users page', page);
            UI.showLoading(true);

            const response = await api.admin.getUsers({ page, limit: 50 });
            if (response.success) {
                this.users = response.users || [];
                this.renderUsers();
                this.renderUsersPagination(response.pagination);
            } else {
                UI.showNotification(response.message || 'Failed to load users', 'error');
            }

        } catch (error) {
            console.error('Users loading error:', error);
            UI.showNotification('Failed to load users', 'error');
        } finally {
            UI.showLoading(false);
        }
    }

    renderUsers() {
        const container = document.getElementById('adminUsersGrid');
        if (!container) return;

        if (this.users.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">👥</div>
                    <h3>No Users Found</h3>
                    <p>No users match your current filters.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.users.map(user => `
            <div class="admin-user-card">
                <div class="user-header">
                    <h3 class="user-name">${Utils.sanitizeHtml(user.username)}</h3>
                    ${user.is_admin ? '<span class="admin-badge">ADMIN</span>' : ''}
                </div>
                <div class="user-details">
                    <div class="user-detail-item">
                        <strong>Email:</strong> ${Utils.sanitizeHtml(user.email)}
                    </div>
                    <div class="user-detail-item">
                        <strong>Total Unlocks:</strong> ${user.total_unlocks || 0}
                    </div>
                    <div class="user-detail-item">
                        <strong>Total Spins:</strong> ${user.total_spins || 0}
                    </div>
                    <div class="user-detail-item">
                        <strong>Daily Spins Used:</strong> ${user.daily_spins_used || 0}/3
                    </div>
                    <div class="user-detail-item">
                        <strong>Override Spins:</strong> ${user.admin_override_spins || 0}
                    </div>
                    <div class="user-detail-item">
                        <strong>Last Login:</strong> ${user.last_login ? Utils.formatDate(user.last_login) : 'Never'}
                    </div>
                </div>
                <div class="user-actions">
                    <button class="btn btn-secondary" onclick="adminPanel.grantUserSpins(${user.id})">
                        Grant Spins
                    </button>
                </div>
            </div>
        `).join('');
    }

    renderUsersPagination(pagination) {
        // Similar to content pagination but for users
        const container = document.getElementById('adminUsersPagination');
        if (!container || !pagination) return;

        const { page, pages, hasPrev, hasNext } = pagination;
        let html = '';

        if (hasPrev) {
            html += `<button class="pagination-btn" onclick="adminPanel.loadUsers(${page - 1})">← Previous</button>`;
        }

        const startPage = Math.max(1, page - 2);
        const endPage = Math.min(pages, page + 2);

        for (let i = startPage; i <= endPage; i++) {
            html += `<button class="pagination-btn ${i === page ? 'active' : ''}" onclick="adminPanel.loadUsers(${i})">${i}</button>`;
        }

        if (hasNext) {
            html += `<button class="pagination-btn" onclick="adminPanel.loadUsers(${page + 1})">Next →</button>`;
        }

        container.innerHTML = html;
    }

    // Activities management
    async loadActivities(page = 1) {
        try {
            console.log('🔧 Admin: Loading activities page', page);
            UI.showLoading(true);

            const response = await api.admin.getActivity({ page, limit: 100 });
            if (response.success) {
                this.activities = response.activities || [];
                this.renderActivities();
            } else {
                UI.showNotification(response.message || 'Failed to load activities', 'error');
            }

        } catch (error) {
            console.error('Activities loading error:', error);
            UI.showNotification('Failed to load activities', 'error');
        } finally {
            UI.showLoading(false);
        }
    }

    renderActivities() {
        const container = document.getElementById('adminActivitiesGrid');
        if (!container) return;

        if (this.activities.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📊</div>
                    <h3>No Activities Found</h3>
                    <p>No recent activities to display.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.activities.map(activity => `
            <div class="admin-activity-item">
                <div class="activity-main">
                    <div class="activity-user">${Utils.sanitizeHtml(activity.username)}</div>
                    <div class="activity-action">
                        ${activity.was_new_unlock ? 'Unlocked' : 'Got duplicate'} 
                        <strong>${Utils.sanitizeHtml(activity.title)}</strong>
                    </div>
                    <div class="activity-meta">
                        <span class="activity-type">${activity.spin_type.toUpperCase()}</span>
                        <span class="activity-rarity ${activity.rarity_tier}">${activity.rarity_tier.toUpperCase()}</span>
                        <span class="activity-time">${Utils.formatTimeAgo(activity.created_at)}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // Settings management
    async loadSettings() {
        try {
            console.log('🔧 Admin: Loading settings...');
            UI.showLoading(true);

            const response = await api.admin.getSettings();
            if (response.success) {
                this.settings = response.settings || [];
                this.renderSettings();
            } else {
                UI.showNotification(response.message || 'Failed to load settings', 'error');
            }

        } catch (error) {
            console.error('Settings loading error:', error);
            UI.showNotification('Failed to load settings', 'error');
        } finally {
            UI.showLoading(false);
        }
    }

    renderSettings() {
        const container = document.getElementById('adminSettingsGrid');
        if (!container) return;

        if (this.settings.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">⚙️</div>
                    <h3>No Settings Found</h3>
                    <p>No system settings to display.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.settings.map(setting => `
            <div class="admin-setting-item">
                <div class="setting-info">
                    <h4 class="setting-key">${Utils.sanitizeHtml(setting.setting_key)}</h4>
                    <p class="setting-description">${Utils.sanitizeHtml(setting.description || '')}</p>
                </div>
                <div class="setting-control">
                    <input type="text" 
                           class="setting-input" 
                           value="${Utils.sanitizeHtml(setting.setting_value)}" 
                           data-key="${setting.setting_key}">
                    <button class="btn btn-primary" onclick="adminPanel.updateSetting('${setting.setting_key}')">
                        Update
                    </button>
                </div>
            </div>
        `).join('');
    }

    // Auto-refresh functionality
    startAutoRefresh() {
        this.stopAutoRefresh(); // Clear any existing interval
        
        // Refresh dashboard data every 30 seconds
        this.refreshInterval = setInterval(() => {
            const activeTab = document.querySelector('.admin-tab.active')?.dataset.tab;
            if (activeTab === 'dashboard') {
                this.loadDashboard();
            }
        }, 30000);
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    // Action methods
    async grantUserSpins(userId) {
        const amount = prompt('How many bonus spins would you like to grant?');
        if (!amount || isNaN(amount) || amount <= 0) return;

        try {
            const response = await api.admin.grantSpins(userId, parseInt(amount));
            if (response.success) {
                UI.showNotification(response.message, 'success');
                // Refresh users if we're on that tab
                const activeTab = document.querySelector('.admin-tab.active')?.dataset.tab;
                if (activeTab === 'users') {
                    this.loadUsers(1);
                }
            } else {
                UI.showNotification(response.message || 'Failed to grant spins', 'error');
            }
        } catch (error) {
            console.error('Grant spins error:', error);
            UI.showNotification('Failed to grant spins', 'error');
        }
    }

    async updateSetting(key) {
        const input = document.querySelector(`input[data-key="${key}"]`);
        if (!input) return;

        const value = input.value.trim();
        if (!value) return;

        try {
            const response = await api.admin.updateSetting(key, value);
            if (response.success) {
                UI.showNotification(response.message, 'success');
            } else {
                UI.showNotification(response.message || 'Failed to update setting', 'error');
            }
        } catch (error) {
            console.error('Update setting error:', error);
            UI.showNotification('Failed to update setting', 'error');
        }
    }

    showGrantSpinsModal() {
        // This would show a modal for bulk granting spins
        UI.showNotification('Grant spins modal - coming soon!', 'info');
    }

    exportData() {
        // This would export system data
        UI.showNotification('Data export - coming soon!', 'info');
    }

    showBroadcastModal() {
        // This would show a modal for broadcasting messages
        UI.showNotification('Broadcast modal - coming soon!', 'info');
    }

    // Toggle content active status
    async toggleContent(contentId) {
        try {
            const response = await api.admin.toggleContent(contentId);
            if (response.success) {
                UI.showNotification(response.message, 'success');
                // Refresh the current page
                await this.loadContent(this.currentPage);
            } else {
                UI.showNotification(response.message || 'Failed to toggle content', 'error');
            }
        } catch (error) {
            console.error('Toggle content error:', error);
            UI.showNotification(error.message || 'Failed to toggle content', 'error');
        }
    }
}

// Create global admin panel instance
const adminPanel = new AdminPanel();

// Export for use in other modules
window.AdminPanel = AdminPanel;
window.adminPanel = adminPanel;