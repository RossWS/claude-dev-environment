// Statistics Display Component - handles user statistics and progress tracking
class StatisticsDisplay extends BaseComponent {
    constructor(selector, options = {}) {
        super(selector, options);
        this.stats = {};
        this.progressData = {};
        this.chartInstances = new Map();
    }

    getDefaultOptions() {
        return {
            showCharts: true,
            showProgress: true,
            showComparisons: false,
            updateInterval: 60000, // 1 minute
            animateNumbers: true
        };
    }

    setupEventListeners() {
        super.setupEventListeners();
        
        // Period selector for statistics
        const periodSelector = this.$('#statsPeriodSelector');
        if (periodSelector) {
            this.addEventListener(periodSelector, 'change', this.changePeriod);
        }

        // Refresh stats button
        const refreshBtn = this.$('#refreshStatsBtn');
        if (refreshBtn) {
            this.addEventListener(refreshBtn, 'click', this.refreshStats);
        }

        // Toggle chart views
        this.$$('.chart-toggle').forEach(toggle => {
            this.addEventListener(toggle, 'click', (e) => {
                const chartType = e.target.dataset.chart;
                this.toggleChart(chartType);
            });
        });
    }

    async render() {
        await this.loadStatistics();
        this.renderOverallStats();
        this.renderProgressBars();
        
        if (this.options.showCharts) {
            this.renderCharts();
        }
        
        this.renderAchievements();
    }

    async loadStatistics() {
        try {
            const period = this.$('#statsPeriodSelector')?.value || 'all';
            const response = await apiClient.get(`/user/statistics?period=${period}`);
            
            if (response.success) {
                this.stats = response.data.stats || {};
                this.progressData = response.data.progress || {};
            }
        } catch (error) {
            this.handleError(error, 'loading statistics');
        }
    }

    renderOverallStats() {
        const statsContainer = this.$('#overallStatsContainer');
        if (!statsContainer) return;

        const statCards = [
            {
                key: 'total_spins',
                label: 'Total Spins',
                icon: '🎰',
                value: this.stats.total_spins || 0,
                change: this.stats.spins_change || 0
            },
            {
                key: 'total_trophies',
                label: 'Total Trophies',
                icon: '🏆',
                value: this.stats.total_trophies || 0,
                change: this.stats.trophies_change || 0
            },
            {
                key: 'rare_items',
                label: 'Rare Items',
                icon: '💎',
                value: this.stats.rare_items || 0,
                change: this.stats.rare_items_change || 0
            },
            {
                key: 'streak_days',
                label: 'Current Streak',
                icon: '🔥',
                value: this.stats.streak_days || 0,
                suffix: ' days'
            },
            {
                key: 'completion_rate',
                label: 'Completion Rate',
                icon: '📊',
                value: this.stats.completion_rate || 0,
                suffix: '%',
                change: this.stats.completion_change || 0
            },
            {
                key: 'time_played',
                label: 'Time Played',
                icon: '⏰',
                value: this.formatPlayTime(this.stats.time_played || 0)
            }
        ];

        const statsHTML = statCards.map(stat => this.createStatCard(stat)).join('');
        statsContainer.innerHTML = statsHTML;

        // Animate numbers if enabled
        if (this.options.animateNumbers) {
            this.animateStatNumbers();
        }
    }

    createStatCard(stat) {
        const changeIndicator = stat.change !== undefined ? this.createChangeIndicator(stat.change) : '';
        const formattedValue = typeof stat.value === 'number' && !stat.suffix 
            ? stat.value.toLocaleString() 
            : stat.value;

        return `
            <div class="stat-card" data-stat="${stat.key}">
                <div class="stat-icon">${stat.icon}</div>
                <div class="stat-content">
                    <div class="stat-value" data-value="${typeof stat.value === 'number' ? stat.value : 0}">
                        ${formattedValue}${stat.suffix || ''}
                    </div>
                    <div class="stat-label">${stat.label}</div>
                    ${changeIndicator}
                </div>
            </div>
        `;
    }

    createChangeIndicator(change) {
        if (change === 0) return '';
        
        const isPositive = change > 0;
        const arrow = isPositive ? '↗' : '↘';
        const changeClass = isPositive ? 'positive' : 'negative';
        
        return `
            <div class="stat-change ${changeClass}">
                <span class="change-arrow">${arrow}</span>
                <span class="change-value">${Math.abs(change)}%</span>
            </div>
        `;
    }

    renderProgressBars() {
        const progressContainer = this.$('#progressContainer');
        if (!progressContainer || !this.options.showProgress) return;

        const progressItems = [
            {
                label: 'Collection Progress',
                current: this.progressData.collection_current || 0,
                max: this.progressData.collection_max || 100,
                color: '#4CAF50'
            },
            {
                label: 'Level Progress',
                current: this.progressData.level_current || 0,
                max: this.progressData.level_max || 1000,
                color: '#2196F3'
            },
            {
                label: 'Achievement Progress',
                current: this.progressData.achievements_current || 0,
                max: this.progressData.achievements_max || 50,
                color: '#FF9800'
            }
        ];

        const progressHTML = progressItems.map(item => this.createProgressBar(item)).join('');
        progressContainer.innerHTML = progressHTML;

        // Animate progress bars
        this.animateProgressBars();
    }

    createProgressBar(item) {
        const percentage = Math.min((item.current / item.max) * 100, 100);
        
        return `
            <div class="progress-item">
                <div class="progress-header">
                    <span class="progress-label">${item.label}</span>
                    <span class="progress-value">${item.current}/${item.max}</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" 
                         data-percentage="${percentage}"
                         style="--progress-color: ${item.color}">
                    </div>
                </div>
                <div class="progress-percentage">${percentage.toFixed(1)}%</div>
            </div>
        `;
    }

    renderCharts() {
        this.renderSpinHistoryChart();
        this.renderTrophyDistributionChart();
        this.renderActivityHeatmap();
    }

    renderSpinHistoryChart() {
        const container = this.$('#spinHistoryChart');
        if (!container) return;

        const chartData = this.stats.spin_history || [];
        
        if (chartData.length === 0) {
            container.innerHTML = '<div class="no-chart-data">No data available</div>';
            return;
        }

        // Simple line chart implementation
        const chartHTML = this.createLineChart(chartData, 'Spins Over Time');
        container.innerHTML = chartHTML;
    }

    renderTrophyDistributionChart() {
        const container = this.$('#trophyDistributionChart');
        if (!container) return;

        const distribution = this.stats.trophy_distribution || {};
        
        if (Object.keys(distribution).length === 0) {
            container.innerHTML = '<div class="no-chart-data">No trophies collected yet</div>';
            return;
        }

        const chartHTML = this.createPieChart(distribution, 'Trophy Distribution by Rarity');
        container.innerHTML = chartHTML;
    }

    renderActivityHeatmap() {
        const container = this.$('#activityHeatmap');
        if (!container) return;

        const activityData = this.stats.activity_heatmap || [];
        
        if (activityData.length === 0) {
            container.innerHTML = '<div class="no-chart-data">No activity data available</div>';
            return;
        }

        const heatmapHTML = this.createActivityHeatmap(activityData);
        container.innerHTML = heatmapHTML;
    }

    createLineChart(data, title) {
        const maxValue = Math.max(...data.map(d => d.value));
        const points = data.map((d, i) => {
            const x = (i / (data.length - 1)) * 100;
            const y = 100 - (d.value / maxValue) * 100;
            return `${x},${y}`;
        }).join(' ');

        return `
            <div class="chart-container">
                <h4 class="chart-title">${title}</h4>
                <svg class="line-chart" viewBox="0 0 100 100">
                    <polyline points="${points}" 
                              fill="none" 
                              stroke="#2196F3" 
                              stroke-width="0.5"/>
                </svg>
                <div class="chart-labels">
                    ${data.map(d => `<span class="chart-label">${d.label}</span>`).join('')}
                </div>
            </div>
        `;
    }

    createPieChart(distribution, title) {
        const total = Object.values(distribution).reduce((sum, val) => sum + val, 0);
        let cumulativePercentage = 0;
        
        const slices = Object.entries(distribution).map(([rarity, count]) => {
            const percentage = (count / total) * 100;
            const startAngle = cumulativePercentage * 3.6; // Convert to degrees
            const endAngle = (cumulativePercentage + percentage) * 3.6;
            cumulativePercentage += percentage;

            const color = this.getRarityColor(rarity);
            
            return {
                rarity,
                count,
                percentage: percentage.toFixed(1),
                color,
                startAngle,
                endAngle
            };
        });

        const slicesHTML = slices.map(slice => this.createPieSlice(slice)).join('');
        const legendHTML = slices.map(slice => 
            `<div class="legend-item">
                <div class="legend-color" style="background-color: ${slice.color}"></div>
                <span>${Utils.capitalizeFirst(slice.rarity)}: ${slice.count} (${slice.percentage}%)</span>
            </div>`
        ).join('');

        return `
            <div class="chart-container">
                <h4 class="chart-title">${title}</h4>
                <div class="pie-chart-container">
                    <svg class="pie-chart" viewBox="0 0 100 100">
                        ${slicesHTML}
                    </svg>
                    <div class="chart-legend">
                        ${legendHTML}
                    </div>
                </div>
            </div>
        `;
    }

    createActivityHeatmap(data) {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const maxActivity = Math.max(...data.map(d => d.activity));
        
        const heatmapHTML = data.map(day => {
            const intensity = day.activity / maxActivity;
            const opacity = Math.max(0.1, intensity);
            
            return `
                <div class="heatmap-cell" 
                     style="opacity: ${opacity}"
                     title="${day.date}: ${day.activity} activities">
                </div>
            `;
        }).join('');

        return `
            <div class="chart-container">
                <h4 class="chart-title">Activity Heatmap</h4>
                <div class="activity-heatmap">
                    ${heatmapHTML}
                </div>
            </div>
        `;
    }

    renderAchievements() {
        const container = this.$('#achievementsContainer');
        if (!container) return;

        const achievements = this.stats.recent_achievements || [];
        
        if (achievements.length === 0) {
            container.innerHTML = '<div class="no-achievements">No recent achievements</div>';
            return;
        }

        const achievementsHTML = achievements.map(achievement => `
            <div class="achievement-item">
                <div class="achievement-icon">${achievement.icon || '🏆'}</div>
                <div class="achievement-content">
                    <div class="achievement-title">${Utils.escapeHtml(achievement.title)}</div>
                    <div class="achievement-description">${Utils.escapeHtml(achievement.description)}</div>
                    <div class="achievement-date">${Utils.formatTimeAgo(new Date(achievement.earned_at))}</div>
                </div>
            </div>
        `).join('');

        container.innerHTML = achievementsHTML;
    }

    animateStatNumbers() {
        this.$$('.stat-value[data-value]').forEach(element => {
            const finalValue = parseInt(element.dataset.value) || 0;
            const duration = 1000; // 1 second
            const startTime = Date.now();
            
            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                const currentValue = Math.floor(finalValue * this.easeOutQuart(progress));
                element.textContent = currentValue.toLocaleString() + (element.textContent.match(/[^\d,]/g) || []).join('');
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                }
            };
            
            requestAnimationFrame(animate);
        });
    }

    animateProgressBars() {
        this.$$('.progress-fill').forEach(bar => {
            const percentage = parseFloat(bar.dataset.percentage);
            bar.style.width = '0%';
            
            setTimeout(() => {
                bar.style.transition = 'width 1s ease-out';
                bar.style.width = `${percentage}%`;
            }, 100);
        });
    }

    easeOutQuart(t) {
        return 1 - (--t) * t * t * t;
    }

    getRarityColor(rarity) {
        const colors = {
            'common': '#9E9E9E',
            'uncommon': '#4CAF50',
            'rare': '#2196F3',
            'epic': '#9C27B0',
            'legendary': '#FF9800'
        };
        return colors[rarity] || colors.common;
    }

    formatPlayTime(minutes) {
        if (minutes < 60) {
            return `${minutes}m`;
        }
        
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        
        if (hours < 24) {
            return `${hours}h ${remainingMinutes}m`;
        }
        
        const days = Math.floor(hours / 24);
        const remainingHours = hours % 24;
        
        return `${days}d ${remainingHours}h`;
    }

    async changePeriod(e) {
        const newPeriod = e.target.value;
        await this.loadStatistics();
        this.renderOverallStats();
        this.renderProgressBars();
        
        if (this.options.showCharts) {
            this.renderCharts();
        }
    }

    async refreshStats() {
        const refreshBtn = this.$('#refreshStatsBtn');
        if (refreshBtn) {
            refreshBtn.disabled = true;
            refreshBtn.textContent = 'Refreshing...';
        }

        try {
            await this.render();
            Utils.showNotification('Statistics refreshed', 'success');
        } catch (error) {
            this.handleError(error, 'refreshing statistics');
        } finally {
            if (refreshBtn) {
                refreshBtn.disabled = false;
                refreshBtn.textContent = 'Refresh';
            }
        }
    }

    toggleChart(chartType) {
        const chartContainer = this.$(`#${chartType}Chart`);
        if (chartContainer) {
            chartContainer.classList.toggle('hidden');
        }
    }

    // Public API methods
    getStatistics() {
        return { ...this.stats };
    }

    getProgressData() {
        return { ...this.progressData };
    }

    onError(error, context) {
        super.onError(error, context);
        Utils.showNotification(`Error ${context}: ${error.message}`, 'error');
    }
}