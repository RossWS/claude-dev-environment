// Admin Dashboard Component - handles overview metrics and real-time data
class AdminDashboard extends BaseComponent {
    constructor(selector, options = {}) {
        super(selector, options);
        this.stats = {};
        this.activities = [];
        this.contentPerformance = [];
        this.refreshInterval = null;
    }

    getDefaultOptions() {
        return {
            refreshInterval: 30000, // 30 seconds
            autoRefresh: true
        };
    }

    setupEventListeners() {
        super.setupEventListeners();
        
        // Quick actions
        const grantSpinsBtn = this.$('#grantSpinsBtn');
        const exportDataBtn = this.$('#exportDataBtn');
        const broadcastBtn = this.$('#broadcastBtn');
        
        if (grantSpinsBtn) {
            this.addEventListener(grantSpinsBtn, 'click', this.showGrantSpinsModal);
        }
        
        if (exportDataBtn) {
            this.addEventListener(exportDataBtn, 'click', this.exportData);
        }
        
        if (broadcastBtn) {
            this.addEventListener(broadcastBtn, 'click', this.showBroadcastModal);
        }
        
        // Load more activities
        const loadMoreBtn = this.$('.load-more-activities');
        if (loadMoreBtn) {
            this.addEventListener(loadMoreBtn, 'click', this.loadMoreActivities);
        }
    }

    async render() {
        await this.loadDashboardData();
        this.renderDashboardMetrics();
        this.renderRecentActivity();
        this.renderContentPerformance();
        this.renderQuickActions();
    }

    async loadDashboardData() {
        try {
            const [statsResponse, activitiesResponse, contentResponse] = await Promise.all([
                apiClient.get('/admin/stats'),
                apiClient.get('/admin/activities?limit=10'),
                apiClient.get('/admin/content-performance?limit=5')
            ]);

            if (statsResponse.success) {
                this.stats = statsResponse.data;
            }

            if (activitiesResponse.success) {
                this.activities = activitiesResponse.data.activities || [];
            }

            if (contentResponse.success) {
                this.contentPerformance = contentResponse.data || [];
            }
        } catch (error) {
            this.handleError(error, 'loading dashboard data');
        }
    }

    renderDashboardMetrics() {
        if (!this.stats.users) return;

        const metricsElements = {
            totalUsers: this.$('#totalUsersMetric'),
            activeUsers: this.$('#activeUsersMetric'),
            totalContent: this.$('#totalContentMetric'),
            spinsToday: this.$('#spinsTodayMetric'),
            usersChange: this.$('#usersChangeMetric'),
            contentSplit: this.$('#contentSplitMetric'),
            spinsChange: this.$('#spinsChangeMetric')
        };

        if (metricsElements.totalUsers) {
            metricsElements.totalUsers.textContent = this.stats.users.total?.toLocaleString() || '0';
        }

        if (metricsElements.activeUsers) {
            metricsElements.activeUsers.textContent = this.stats.users.active?.toLocaleString() || '0';
        }

        if (metricsElements.totalContent) {
            metricsElements.totalContent.textContent = this.stats.content?.total?.toLocaleString() || '0';
        }

        if (metricsElements.spinsToday) {
            metricsElements.spinsToday.textContent = this.stats.spins?.today?.toLocaleString() || '0';
        }

        if (metricsElements.usersChange) {
            const change = this.stats.users.change || 0;
            metricsElements.usersChange.textContent = `${change > 0 ? '+' : ''}${change}%`;
        }

        if (metricsElements.contentSplit) {
            const movies = this.stats.content?.movies || 0;
            const series = this.stats.content?.series || 0;
            metricsElements.contentSplit.textContent = `${movies}M / ${series}S`;
        }

        if (metricsElements.spinsChange) {
            const change = this.stats.spins?.change || 0;
            metricsElements.spinsChange.textContent = `${change > 0 ? '+' : ''}${change}%`;
        }
    }

    renderRecentActivity() {
        const container = this.$('#recentActivityList');
        
        if (!container) return;

        if (!this.activities || this.activities.length === 0) {
            container.innerHTML = '<div class="no-data">No recent activity</div>';
            return;
        }

        const activitiesHTML = this.activities.map(activity => {
            const timeAgo = Utils.formatTimeAgo(new Date(activity.created_at));
            
            return `
                <div class="activity-item">
                    <div class="activity-icon ${activity.type}">${this.getActivityIcon(activity.type)}</div>
                    <div class="activity-content">
                        <div class="activity-text">${activity.description}</div>
                        <div class="activity-meta">
                            <span class="activity-user">${activity.username || 'System'}</span>
                            <span class="activity-time">${timeAgo}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = activitiesHTML;

        const hasMore = this.activities.length >= 10;
        if (hasMore) {
            const loadMoreBtn = this.$('.load-more-activities');
            if (loadMoreBtn) {
                loadMoreBtn.style.display = 'block';
            }
        }
    }

    renderContentPerformance() {
        const container = this.$('#contentPerformanceList');
        
        if (!container) return;

        if (!this.contentPerformance) {
            container.innerHTML = '<div class="no-data">No performance data available</div>';
            return;
        }

        const performanceHTML = this.contentPerformance.map(item => `
            <div class="performance-item">
                <div class="performance-content">
                    <div class="performance-title">${item.title}</div>
                    <div class="performance-meta">
                        <span class="performance-type">${item.type}</span>
                        <span class="performance-year">${item.year}</span>
                    </div>
                </div>
                <div class="performance-stats">
                    <div class="stat">
                        <span class="stat-value">${item.views || 0}</span>
                        <span class="stat-label">Views</span>
                    </div>
                    <div class="stat">
                        <span class="stat-value">${item.likes || 0}</span>
                        <span class="stat-label">Likes</span>
                    </div>
                    <div class="stat">
                        <span class="stat-value">${(item.quality_score || 0).toFixed(1)}</span>
                        <span class="stat-label">Score</span>
                    </div>
                </div>
            </div>
        `).join('');

        container.innerHTML = performanceHTML;
    }

    renderQuickActions() {
        // Quick actions are already rendered in HTML, just ensure event handlers are attached
        // This method can be used to enable/disable actions based on permissions
    }

    getActivityIcon(type) {
        const icons = {
            'user_register': '👤',
            'content_add': '➕',
            'spin': '🎰',
            'trophy': '🏆',
            'admin_action': '⚙️',
            'system': '🤖'
        };
        return icons[type] || '📝';
    }

    async loadMoreActivities() {
        try {
            const offset = this.activities.length;
            const response = await apiClient.get(`/admin/activities?limit=10&offset=${offset}`);
            
            if (response.success && response.data.activities) {
                this.activities.push(...response.data.activities);
                this.renderRecentActivity();
            }
        } catch (error) {
            this.handleError(error, 'loading more activities');
        }
    }

    startAutoRefresh() {
        if (!this.options.autoRefresh) return;
        
        this.refreshInterval = setInterval(async () => {
            try {
                await this.loadDashboardData();
                this.renderDashboardMetrics();
                this.renderRecentActivity();
            } catch (error) {
                console.error('Auto-refresh error:', error);
            }
        }, this.options.refreshInterval);
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    // Quick action methods
    showGrantSpinsModal() {
        // TODO: Implement modal for granting spins
        console.log('Show grant spins modal');
    }

    exportData() {
        // TODO: Implement data export
        console.log('Export data');
    }

    showBroadcastModal() {
        // TODO: Implement broadcast modal
        console.log('Show broadcast modal');
    }

    // Lifecycle hooks
    onInit() {
        if (this.options.autoRefresh) {
            this.startAutoRefresh();
        }
    }

    onDestroy() {
        this.stopAutoRefresh();
        super.onDestroy();
    }
}