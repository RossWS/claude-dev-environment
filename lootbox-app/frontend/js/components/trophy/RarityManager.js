// Rarity Manager Component - handles rarity-based operations and statistics
class RarityManager extends BaseComponent {
    constructor(selector, options = {}) {
        super(selector, options);
        this.rarityStats = {};
        this.rarityDistribution = {};
        this.completionData = {};
    }

    getDefaultOptions() {
        return {
            showStats: true,
            showProgress: true,
            showComparison: false,
            animateStats: true
        };
    }

    setupEventListeners() {
        super.setupEventListeners();
        
        // Rarity card clicks for detailed view
        this.addEventListener(this.element, 'click', (e) => {
            const rarityCard = e.target.closest('.rarity-card');
            if (rarityCard) {
                const rarity = rarityCard.dataset.rarity;
                this.onRarityClick(rarity);
            }
        });

        // Toggle rarity visibility
        this.addEventListener(this.element, 'change', (e) => {
            if (e.target.classList.contains('rarity-visibility-toggle')) {
                const rarity = e.target.dataset.rarity;
                const isVisible = e.target.checked;
                this.onRarityVisibilityChange(rarity, isVisible);
            }
        });
    }

    render() {
        if (this.options.showStats) {
            this.renderRarityStats();
        }
        
        if (this.options.showProgress) {
            this.renderRarityProgress();
        }
        
        this.renderRarityDistribution();
        
        if (this.options.animateStats) {
            this.animateStatistics();
        }
    }

    renderRarityStats() {
        const container = this.$('#rarityStatsContainer');
        if (!container) return;

        const rarities = ['legendary', 'epic', 'rare', 'uncommon', 'common'];
        const statsHTML = rarities.map(rarity => this.createRarityStatCard(rarity)).join('');
        
        container.innerHTML = `
            <div class="rarity-stats-grid">
                ${statsHTML}
            </div>
        `;
    }

    createRarityStatCard(rarity) {
        const stats = this.rarityStats[rarity] || { collected: 0, total: 0, percentage: 0 };
        const color = this.getRarityColor(rarity);
        const icon = this.getRarityIcon(rarity);
        
        return `
            <div class="rarity-card" data-rarity="${rarity}">
                <div class="rarity-card-header" style="border-color: ${color}">
                    <div class="rarity-icon" style="color: ${color}">${icon}</div>
                    <h3 class="rarity-name" style="color: ${color}">
                        ${Utils.capitalizeFirst(rarity)}
                    </h3>
                </div>
                
                <div class="rarity-card-content">
                    <div class="rarity-counts">
                        <div class="collected-count">
                            <span class="count-value" data-animate="${stats.collected}">${stats.collected}</span>
                            <span class="count-label">Collected</span>
                        </div>
                        <div class="total-count">
                            <span class="count-value">${stats.total}</span>
                            <span class="count-label">Total</span>
                        </div>
                    </div>
                    
                    <div class="rarity-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" 
                                 data-percentage="${stats.percentage}"
                                 style="--rarity-color: ${color}">
                            </div>
                        </div>
                        <div class="progress-percentage">${stats.percentage.toFixed(1)}%</div>
                    </div>
                    
                    <div class="rarity-actions">
                        <label class="rarity-visibility">
                            <input type="checkbox" 
                                   class="rarity-visibility-toggle" 
                                   data-rarity="${rarity}"
                                   checked>
                            <span>Show in grid</span>
                        </label>
                    </div>
                </div>
            </div>
        `;
    }

    renderRarityProgress() {
        const container = this.$('#rarityProgressContainer');
        if (!container) return;

        const overallProgress = this.calculateOverallProgress();
        
        container.innerHTML = `
            <div class="overall-progress">
                <h3 class="progress-title">Collection Completion</h3>
                <div class="progress-summary">
                    <div class="overall-progress-bar">
                        <div class="overall-progress-fill" 
                             data-percentage="${overallProgress.percentage}"
                             style="background: linear-gradient(45deg, ${this.getRarityColor('common')}, ${this.getRarityColor('legendary')})">
                        </div>
                    </div>
                    <div class="progress-details">
                        <span class="progress-text">
                            ${overallProgress.collected} of ${overallProgress.total} items
                        </span>
                        <span class="progress-percent">${overallProgress.percentage.toFixed(1)}%</span>
                    </div>
                </div>
                
                <div class="milestone-indicators">
                    ${this.renderMilestoneIndicators(overallProgress.percentage)}
                </div>
            </div>
        `;
    }

    renderMilestoneIndicators(currentPercentage) {
        const milestones = [25, 50, 75, 100];
        
        return milestones.map(milestone => {
            const isReached = currentPercentage >= milestone;
            const reachedClass = isReached ? 'reached' : '';
            
            return `
                <div class="milestone ${reachedClass}" data-milestone="${milestone}">
                    <div class="milestone-marker"></div>
                    <span class="milestone-label">${milestone}%</span>
                </div>
            `;
        }).join('');
    }

    renderRarityDistribution() {
        const container = this.$('#rarityDistributionContainer');
        if (!container) return;

        const distributionData = this.calculateRarityDistribution();
        
        container.innerHTML = `
            <div class="distribution-chart">
                <h3 class="chart-title">Collection Distribution</h3>
                <div class="distribution-bars">
                    ${this.renderDistributionBars(distributionData)}
                </div>
                <div class="distribution-legend">
                    ${this.renderDistributionLegend(distributionData)}
                </div>
            </div>
        `;
    }

    renderDistributionBars(data) {
        const maxCount = Math.max(...Object.values(data));
        
        return Object.entries(data).map(([rarity, count]) => {
            const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
            const color = this.getRarityColor(rarity);
            
            return `
                <div class="distribution-bar" data-rarity="${rarity}">
                    <div class="bar-fill" 
                         style="height: ${height}%; background-color: ${color};"
                         data-count="${count}">
                    </div>
                    <div class="bar-label">${Utils.capitalizeFirst(rarity)}</div>
                    <div class="bar-count">${count}</div>
                </div>
            `;
        }).join('');
    }

    renderDistributionLegend(data) {
        return Object.entries(data).map(([rarity, count]) => {
            const color = this.getRarityColor(rarity);
            
            return `
                <div class="legend-item" data-rarity="${rarity}">
                    <div class="legend-color" style="background-color: ${color}"></div>
                    <span class="legend-label">${Utils.capitalizeFirst(rarity)}</span>
                    <span class="legend-count">${count}</span>
                </div>
            `;
        }).join('');
    }

    calculateOverallProgress() {
        let totalCollected = 0;
        let totalAvailable = 0;
        
        Object.values(this.rarityStats).forEach(stats => {
            totalCollected += stats.collected || 0;
            totalAvailable += stats.total || 0;
        });
        
        const percentage = totalAvailable > 0 ? (totalCollected / totalAvailable) * 100 : 0;
        
        return {
            collected: totalCollected,
            total: totalAvailable,
            percentage
        };
    }

    calculateRarityDistribution() {
        const distribution = {};
        
        Object.entries(this.rarityStats).forEach(([rarity, stats]) => {
            distribution[rarity] = stats.collected || 0;
        });
        
        return distribution;
    }

    animateStatistics() {
        // Animate count numbers
        this.$$('[data-animate]').forEach(element => {
            const targetValue = parseInt(element.dataset.animate);
            this.animateNumber(element, 0, targetValue, 1000);
        });

        // Animate progress bars
        setTimeout(() => {
            this.$$('.progress-fill[data-percentage]').forEach(bar => {
                const percentage = parseFloat(bar.dataset.percentage);
                bar.style.width = '0%';
                setTimeout(() => {
                    bar.style.transition = 'width 1s ease-out';
                    bar.style.width = `${percentage}%`;
                }, 100);
            });

            // Animate overall progress bar
            this.$$('.overall-progress-fill[data-percentage]').forEach(bar => {
                const percentage = parseFloat(bar.dataset.percentage);
                bar.style.width = '0%';
                setTimeout(() => {
                    bar.style.transition = 'width 1.5s ease-out';
                    bar.style.width = `${percentage}%`;
                }, 200);
            });
        }, 500);

        // Animate distribution bars
        setTimeout(() => {
            this.$$('.bar-fill[data-count]').forEach(bar => {
                bar.style.height = '0%';
                setTimeout(() => {
                    const originalHeight = bar.style.height;
                    bar.style.transition = 'height 0.8s ease-out';
                    bar.style.height = bar.dataset.height || originalHeight;
                }, Math.random() * 300);
            });
        }, 1000);
    }

    animateNumber(element, start, end, duration) {
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const currentValue = Math.floor(start + (end - start) * this.easeOutQuart(progress));
            element.textContent = currentValue;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }

    easeOutQuart(t) {
        return 1 - (--t) * t * t * t;
    }

    getRarityColor(rarity) {
        const colors = {
            legendary: '#ff9800',  // Orange
            epic: '#9c27b0',       // Purple
            rare: '#2196f3',       // Blue
            uncommon: '#4caf50',   // Green
            common: '#9e9e9e'      // Grey
        };
        return colors[rarity] || colors.common;
    }

    getRarityIcon(rarity) {
        const icons = {
            legendary: '🌟',
            epic: '💎',
            rare: '🔷',
            uncommon: '🟢',
            common: '⚪'
        };
        return icons[rarity] || icons.common;
    }

    // Public API methods
    updateRarityStats(stats) {
        this.rarityStats = { ...this.rarityStats, ...stats };
        this.render();
    }

    getRarityStats() {
        return { ...this.rarityStats };
    }

    setRarityVisibility(rarity, isVisible) {
        this.onRarityVisibilityChange(rarity, isVisible);
    }

    getVisibleRarities() {
        const visibleRarities = [];
        this.$$('.rarity-visibility-toggle:checked').forEach(toggle => {
            visibleRarities.push(toggle.dataset.rarity);
        });
        return visibleRarities;
    }

    showRarityDetails(rarity) {
        // Create detailed modal/panel for specific rarity
        const stats = this.rarityStats[rarity];
        if (!stats) return;

        const modal = document.createElement('div');
        modal.className = 'rarity-detail-modal';
        modal.innerHTML = this.createRarityDetailContent(rarity, stats);
        
        document.body.appendChild(modal);
        
        // Add close handler
        modal.addEventListener('click', (e) => {
            if (e.target === modal || e.target.classList.contains('close-modal')) {
                document.body.removeChild(modal);
            }
        });
    }

    createRarityDetailContent(rarity, stats) {
        const color = this.getRarityColor(rarity);
        
        return `
            <div class="modal-content">
                <div class="modal-header" style="border-color: ${color}">
                    <h2 style="color: ${color}">${Utils.capitalizeFirst(rarity)} Collection</h2>
                    <button class="close-modal">×</button>
                </div>
                
                <div class="modal-body">
                    <div class="rarity-detail-stats">
                        <div class="stat-item">
                            <span class="stat-label">Collected:</span>
                            <span class="stat-value">${stats.collected}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Total Available:</span>
                            <span class="stat-value">${stats.total}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Completion:</span>
                            <span class="stat-value">${stats.percentage.toFixed(1)}%</span>
                        </div>
                    </div>
                    
                    <div class="missing-items">
                        <h3>Missing Items</h3>
                        <p>You need ${stats.total - stats.collected} more ${rarity} items to complete this rarity.</p>
                    </div>
                </div>
            </div>
        `;
    }

    // Event hooks
    onRarityClick(rarity) {
        // Override in parent component
        console.log('Rarity clicked:', rarity);
        this.showRarityDetails(rarity);
    }

    onRarityVisibilityChange(rarity, isVisible) {
        // Override in parent component
        console.log('Rarity visibility changed:', rarity, isVisible);
        
        // Emit custom event
        this.element.dispatchEvent(new CustomEvent('rarityVisibilityChanged', {
            detail: { rarity, isVisible }
        }));
    }
}