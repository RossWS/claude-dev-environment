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
        const gameScreen = document.getElementById('gameScreen');
        const trophyScreen = document.getElementById('trophyScreen');
        
        if (gameScreen) gameScreen.classList.add('hidden');
        if (trophyScreen) trophyScreen.classList.add('hidden');
        this.adminScreen.classList.remove('hidden');
        
        // Load content when screen is shown
        console.log('🔧 Admin: Loading content and stats...');
        await this.loadContent(1);
        await this.loadStats();
    }

    hideAdminScreen() {
        const gameScreen = document.getElementById('gameScreen');
        
        this.adminScreen.classList.add('hidden');
        if (gameScreen) gameScreen.classList.remove('hidden');
    }

    switchTab(tabName) {
        // Update tab buttons
        this.adminTabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // Update tab contents
        this.adminTabContents.forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}Tab`);
        });

        // Load data for specific tabs
        if (tabName === 'content') {
            this.loadContent(1);
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
            const response = await api.admin.getStats();
            if (response.success) {
                this.stats = response.stats;
                this.renderStats();
            }
        } catch (error) {
            console.warn('Failed to load admin stats:', error);
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

        if (this.content.length === 0) {
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
    }

    createContentCard(item) {
        const rarity = Utils.getRarityTier(item.quality_score);
        const platforms = JSON.parse(item.platforms || '[]');
        
        return `
            <div class="admin-content-item ${item.rarity_tier}">
                <div class="admin-content-header">
                    <h3 class="admin-content-title">${Utils.sanitizeHtml(item.title)}</h3>
                    <span class="admin-content-type">${item.type.toUpperCase()}</span>
                </div>
                
                <div class="admin-content-details">
                    <div class="admin-detail-item">
                        <strong>Year:</strong> ${item.year}
                    </div>
                    <div class="admin-detail-item">
                        <strong>Duration:</strong> ${item.duration}
                    </div>
                    <div class="admin-detail-item">
                        <strong>Critics:</strong> ${item.critics_score}%
                    </div>
                    <div class="admin-detail-item">
                        <strong>Audience:</strong> ${item.audience_score}%
                    </div>
                    <div class="admin-detail-item">
                        <strong>IMDB:</strong> ${item.imdb_rating}/10
                    </div>
                    <div class="admin-detail-item">
                        <strong>Release:</strong> ${item.month} ${item.year}
                    </div>
                </div>
                
                <div class="admin-quality-score">
                    <span class="admin-score-badge ${item.rarity_tier}">
                        ${rarity.icon} ${item.quality_score} - ${item.rarity_tier.toUpperCase()}
                    </span>
                </div>
                
                <div class="admin-content-description">
                    ${Utils.sanitizeHtml(item.description)}
                </div>
                
                ${this.renderContentPlatforms(platforms)}
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