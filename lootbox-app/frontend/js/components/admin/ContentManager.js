// Content Manager Component - handles content CRUD operations and filtering
class ContentManager extends BaseComponent {
    constructor(selector, options = {}) {
        super(selector, options);
        this.content = [];
        this.currentPage = 1;
        this.currentFilters = {
            type: '',
            rarity: '',
            sort: 'quality_score_desc'
        };
        this.pagination = {};
    }

    getDefaultOptions() {
        return {
            itemsPerPage: 12,
            enableFiltering: true,
            enableSorting: true,
            enablePagination: true
        };
    }

    setupEventListeners() {
        super.setupEventListeners();
        
        // Filter controls
        const typeFilter = this.$('#adminTypeFilter');
        const rarityFilter = this.$('#adminRarityFilter');
        const sortFilter = this.$('#adminSortFilter');
        
        if (typeFilter) {
            this.addEventListener(typeFilter, 'change', this.applyFilters);
        }
        
        if (rarityFilter) {
            this.addEventListener(rarityFilter, 'change', this.applyFilters);
        }
        
        if (sortFilter) {
            this.addEventListener(sortFilter, 'change', this.applyFilters);
        }

        // Bulk operations
        const selectAllBtn = this.$('#selectAllContent');
        const bulkDeleteBtn = this.$('#bulkDeleteContent');
        const bulkUpdateBtn = this.$('#bulkUpdateContent');
        
        if (selectAllBtn) {
            this.addEventListener(selectAllBtn, 'change', this.toggleSelectAll);
        }
        
        if (bulkDeleteBtn) {
            this.addEventListener(bulkDeleteBtn, 'click', this.bulkDelete);
        }
        
        if (bulkUpdateBtn) {
            this.addEventListener(bulkUpdateBtn, 'click', this.bulkUpdate);
        }
    }

    async render() {
        await this.loadContent();
        this.renderContent();
        this.renderContentPagination();
        this.addContentCardClickHandlers();
    }

    async loadContent(loadMore = false) {
        try {
            const params = new URLSearchParams({
                page: loadMore ? this.currentPage + 1 : this.currentPage,
                limit: this.options.itemsPerPage,
                ...this.currentFilters
            });

            const response = await apiClient.get(`/admin/content?${params}`);
            
            if (response.success) {
                if (loadMore) {
                    this.content.push(...response.data.content);
                    this.currentPage++;
                } else {
                    this.content = response.data.content;
                    this.currentPage = 1;
                }
                
                this.pagination = response.data.pagination;
            }
        } catch (error) {
            this.handleError(error, 'loading content');
        }
    }

    renderContent() {
        const container = this.$('#adminContentGrid');
        
        if (!container) return;

        if (this.content.length === 0) {
            container.innerHTML = '<div class="no-content">No content found matching your filters.</div>';
            return;
        }

        const contentHTML = this.content.map(item => this.createContentCard(item)).join('');
        container.innerHTML = contentHTML;
    }

    createContentCard(item) {
        const year = item.type === 'series' && item.end_year && item.end_year !== item.year 
            ? `${item.year}-${item.end_year}` 
            : item.year;

        const platforms = this.renderContentPlatforms(item.platforms);
        const qualityScore = item.quality_score ? `${item.quality_score.toFixed(1)}/10` : 'N/A';
        
        return `
            <div class="admin-content-card" data-id="${item.id}">
                <div class="card-selector">
                    <input type="checkbox" class="content-checkbox" data-id="${item.id}">
                </div>
                <div class="card-content">
                    <div class="content-header">
                        <h3 class="content-title">${Utils.escapeHtml(item.title)}</h3>
                        <span class="content-type ${item.type}">${item.type.toUpperCase()}</span>
                    </div>
                    
                    <div class="content-meta">
                        <div class="meta-row">
                            <span class="meta-label">Year:</span>
                            <span class="meta-value">${year || 'Unknown'}</span>
                        </div>
                        <div class="meta-row">
                            <span class="meta-label">Rarity:</span>
                            <span class="meta-value rarity-${item.rarity}">${Utils.capitalizeFirst(item.rarity)}</span>
                        </div>
                        <div class="meta-row">
                            <span class="meta-label">Score:</span>
                            <span class="meta-value">${qualityScore}</span>
                        </div>
                    </div>
                    
                    ${platforms}
                    
                    <div class="content-description">
                        ${Utils.truncateText(item.description || 'No description available', 100)}
                    </div>
                    
                    <div class="card-actions">
                        <button class="btn-small edit-content" data-id="${item.id}">Edit</button>
                        <button class="btn-small delete-content" data-id="${item.id}">Delete</button>
                        <button class="btn-small view-details" data-id="${item.id}">Details</button>
                    </div>
                </div>
            </div>
        `;
    }

    renderContentPlatforms(platforms) {
        if (!platforms || platforms.length === 0) {
            return '<div class="content-platforms"><span class="platform-tag">No platforms</span></div>';
        }

        const platformTags = platforms.slice(0, 3).map(platform => 
            `<span class="platform-tag">${Utils.escapeHtml(platform)}</span>`
        ).join('');

        const moreCount = platforms.length > 3 ? ` +${platforms.length - 3}` : '';
        
        return `<div class="content-platforms">${platformTags}${moreCount}</div>`;
    }

    renderContentPagination() {
        const container = this.$('#adminPagination');
        
        if (!container || !this.pagination.pages || this.pagination.pages <= 1) {
            if (container) container.innerHTML = '';
            return;
        }

        const { page, pages } = this.pagination;
        const maxVisible = 5;
        const startPage = Math.max(1, page - Math.floor(maxVisible / 2));
        const endPage = Math.min(pages, startPage + maxVisible - 1);

        let paginationHTML = '';

        // Previous button
        if (page > 1) {
            paginationHTML += `<button class="pagination-btn" data-page="${page - 1}">Previous</button>`;
        }

        // Page numbers
        for (let i = startPage; i <= endPage; i++) {
            const isActive = i === page ? 'active' : '';
            paginationHTML += `<button class="pagination-btn ${isActive}" data-page="${i}">${i}</button>`;
        }

        // Next button
        if (page < pages) {
            paginationHTML += `<button class="pagination-btn" data-page="${page + 1}">Next</button>`;
        }

        container.innerHTML = paginationHTML;

        // Add click handlers for pagination
        this.$$('.pagination-btn').forEach(btn => {
            this.addEventListener(btn, 'click', (e) => {
                const targetPage = parseInt(e.target.dataset.page);
                this.changePage(targetPage);
            });
        });
    }

    addContentCardClickHandlers() {
        // Edit buttons
        this.$$('.edit-content').forEach(btn => {
            this.addEventListener(btn, 'click', (e) => {
                const itemId = e.target.dataset.id;
                this.editContent(itemId);
            });
        });

        // Delete buttons
        this.$$('.delete-content').forEach(btn => {
            this.addEventListener(btn, 'click', (e) => {
                const itemId = e.target.dataset.id;
                this.deleteContent(itemId);
            });
        });

        // View details buttons
        this.$$('.view-details').forEach(btn => {
            this.addEventListener(btn, 'click', (e) => {
                const itemId = e.target.dataset.id;
                this.viewContentDetails(itemId);
            });
        });

        // Checkbox handlers
        this.$$('.content-checkbox').forEach(checkbox => {
            this.addEventListener(checkbox, 'change', this.updateBulkActionsState);
        });
    }

    applyFilters() {
        const typeFilter = this.$('#adminTypeFilter');
        const rarityFilter = this.$('#adminRarityFilter');
        const sortFilter = this.$('#adminSortFilter');

        this.currentFilters = {
            type: typeFilter?.value || '',
            rarity: rarityFilter?.value || '',
            sort: sortFilter?.value || 'quality_score_desc'
        };

        this.currentPage = 1;
        this.render();
    }

    async changePage(page) {
        this.currentPage = page;
        await this.loadContent();
        this.renderContent();
        this.renderContentPagination();
        this.addContentCardClickHandlers();
    }

    toggleSelectAll(e) {
        const isChecked = e.target.checked;
        this.$$('.content-checkbox').forEach(checkbox => {
            checkbox.checked = isChecked;
        });
        this.updateBulkActionsState();
    }

    updateBulkActionsState() {
        const checkedBoxes = this.$$('.content-checkbox:checked');
        const bulkActions = this.$$('.bulk-action-btn');
        
        bulkActions.forEach(btn => {
            btn.disabled = checkedBoxes.length === 0;
        });
    }

    getSelectedContentIds() {
        return Array.from(this.$$('.content-checkbox:checked'))
            .map(checkbox => parseInt(checkbox.dataset.id));
    }

    async editContent(itemId) {
        try {
            const item = this.content.find(c => c.id === parseInt(itemId));
            if (!item) return;

            // TODO: Open edit modal with item data
            console.log('Edit content:', item);
        } catch (error) {
            this.handleError(error, 'editing content');
        }
    }

    async deleteContent(itemId) {
        if (!confirm('Are you sure you want to delete this content?')) return;

        try {
            const response = await apiClient.delete(`/admin/content/${itemId}`);
            
            if (response.success) {
                // Remove from local array
                this.content = this.content.filter(c => c.id !== parseInt(itemId));
                this.renderContent();
                this.renderContentPagination();
                
                Utils.showNotification('Content deleted successfully', 'success');
            }
        } catch (error) {
            this.handleError(error, 'deleting content');
        }
    }

    viewContentDetails(itemId) {
        const item = this.content.find(c => c.id === parseInt(itemId));
        if (item && window.UI && window.UI.showCardDetailModal) {
            window.UI.showCardDetailModal(item);
        }
    }

    async bulkDelete() {
        const selectedIds = this.getSelectedContentIds();
        if (selectedIds.length === 0) return;

        if (!confirm(`Are you sure you want to delete ${selectedIds.length} items?`)) return;

        try {
            const response = await apiClient.post('/admin/content/bulk-delete', { ids: selectedIds });
            
            if (response.success) {
                await this.loadContent();
                this.renderContent();
                this.renderContentPagination();
                
                Utils.showNotification(`${selectedIds.length} items deleted successfully`, 'success');
            }
        } catch (error) {
            this.handleError(error, 'bulk deleting content');
        }
    }

    async bulkUpdate() {
        const selectedIds = this.getSelectedContentIds();
        if (selectedIds.length === 0) return;

        // TODO: Open bulk update modal
        console.log('Bulk update:', selectedIds);
    }

    onError(error, context) {
        super.onError(error, context);
        Utils.showNotification(`Error ${context}: ${error.message}`, 'error');
    }
}