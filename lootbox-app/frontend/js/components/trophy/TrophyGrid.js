// Trophy Grid Component - handles trophy display and grid layout
class TrophyGrid extends BaseComponent {
    constructor(selector, options = {}) {
        super(selector, options);
        this.trophies = [];
        this.selectedTrophies = new Set();
        this.viewMode = 'grid'; // 'grid' or 'list'
    }

    getDefaultOptions() {
        return {
            itemsPerPage: 12,
            enableSelection: false,
            enableGrouping: true,
            showStats: true,
            animateEntrance: true
        };
    }

    setupEventListeners() {
        super.setupEventListeners();
        
        // View mode toggle
        const viewToggle = this.$('.view-mode-toggle');
        if (viewToggle) {
            this.addEventListener(viewToggle, 'click', this.toggleViewMode);
        }

        // Select all checkbox
        const selectAllBtn = this.$('#selectAllTrophies');
        if (selectAllBtn) {
            this.addEventListener(selectAllBtn, 'change', this.toggleSelectAll);
        }
    }

    render() {
        if (this.options.enableGrouping && this.shouldGroupByRarity()) {
            this.renderGroupedTrophies();
        } else {
            this.renderFlatTrophies();
        }
        
        this.addTrophyClickHandlers();
        
        if (this.options.animateEntrance) {
            this.animateEntrance();
        }
    }

    renderGroupedTrophies() {
        const groupedTrophies = this.groupTrophiesByRarity();
        const groupsHTML = Object.entries(groupedTrophies)
            .sort(([a], [b]) => this.getRarityOrder(a) - this.getRarityOrder(b))
            .map(([rarity, trophies]) => this.renderRarityGroup(rarity, trophies))
            .join('');

        this.element.innerHTML = groupsHTML;
    }

    renderFlatTrophies() {
        if (this.trophies.length === 0) {
            this.element.innerHTML = this.createEmptyState();
            return;
        }

        const trophiesHTML = this.trophies.map((trophy, index) => 
            this.createTrophyCard(trophy, index)
        ).join('');

        this.element.innerHTML = `
            <div class="trophy-grid ${this.viewMode}">
                ${trophiesHTML}
            </div>
        `;
    }

    renderRarityGroup(rarity, trophies) {
        if (trophies.length === 0) return '';

        const trophiesHTML = trophies.map((trophy, index) => 
            this.createTrophyCard(trophy, index)
        ).join('');

        const count = trophies.length;
        const rarityColor = this.getRarityColor(rarity);
        
        return `
            <div class="rarity-group" data-rarity="${rarity}">
                <div class="rarity-header" style="border-color: ${rarityColor}">
                    <h3 class="rarity-title" style="color: ${rarityColor}">
                        ${Utils.capitalizeFirst(rarity)} 
                        <span class="rarity-count">(${count})</span>
                    </h3>
                    <div class="rarity-actions">
                        <button class="collapse-group" data-rarity="${rarity}">−</button>
                    </div>
                </div>
                <div class="trophy-grid ${this.viewMode}" data-rarity="${rarity}">
                    ${trophiesHTML}
                </div>
            </div>
        `;
    }

    createTrophyCard(trophy, index) {
        const isSelected = this.selectedTrophies.has(trophy.id);
        const selectionClass = isSelected ? 'selected' : '';
        const selectionCheckbox = this.options.enableSelection ? 
            `<input type="checkbox" class="trophy-checkbox" data-id="${trophy.id}" ${isSelected ? 'checked' : ''}>` : '';

        const unlockDate = trophy.unlock_time ? Utils.formatDateInTimezone(trophy.unlock_time) : 'Not unlocked';
        const isUnlocked = !!trophy.unlock_time;
        const unlockedClass = isUnlocked ? 'unlocked' : 'locked';

        return `
            <div class="trophy-card ${selectionClass} ${unlockedClass}" 
                 data-id="${trophy.id}" 
                 data-rarity="${trophy.rarity}"
                 data-index="${index}">
                
                ${selectionCheckbox}
                
                <div class="trophy-card-inner">
                    <div class="trophy-image-container">
                        ${trophy.poster_url ? 
                            `<img src="${trophy.poster_url}" 
                                 alt="${Utils.escapeHtml(trophy.title)}" 
                                 class="trophy-image"
                                 loading="lazy">` :
                            '<div class="trophy-placeholder">🎬</div>'
                        }
                        
                        <div class="trophy-overlay">
                            <div class="rarity-badge rarity-${trophy.rarity}">
                                ${Utils.capitalizeFirst(trophy.rarity)}
                            </div>
                            
                            ${!isUnlocked ? '<div class="lock-icon">🔒</div>' : ''}
                        </div>
                    </div>
                    
                    <div class="trophy-info">
                        <h4 class="trophy-title">${Utils.escapeHtml(trophy.title)}</h4>
                        
                        <div class="trophy-meta">
                            <span class="trophy-type">${trophy.type.toUpperCase()}</span>
                            ${trophy.year ? `<span class="trophy-year">${trophy.year}</span>` : ''}
                        </div>
                        
                        <div class="trophy-description">
                            ${Utils.truncateText(trophy.description || 'A rare find in your collection', 80)}
                        </div>
                        
                        <div class="trophy-unlock-info">
                            <span class="unlock-date">${unlockDate}</span>
                        </div>
                        
                        ${trophy.platforms && trophy.platforms.length > 0 ? 
                            `<div class="trophy-platforms">
                                ${this.renderPlatformTags(trophy.platforms)}
                            </div>` : ''
                        }
                    </div>
                </div>
            </div>
        `;
    }

    createEmptyState() {
        return `
            <div class="empty-trophy-cabinet">
                <div class="empty-trophy-icon">🏆</div>
                <div class="empty-trophy-title">No Trophies Yet</div>
                <div class="empty-trophy-description">
                    Start spinning lootboxes to collect your first trophy!
                </div>
                <button class="btn primary start-spinning-btn">Start Spinning</button>
            </div>
        `;
    }

    renderPlatformTags(platforms) {
        return platforms.slice(0, 3).map(platform => 
            `<span class="platform-tag">${Utils.escapeHtml(platform)}</span>`
        ).join('') + (platforms.length > 3 ? ` +${platforms.length - 3}` : '');
    }

    addTrophyClickHandlers() {
        // Trophy card clicks
        this.$$('.trophy-card').forEach(card => {
            this.addEventListener(card, 'click', (e) => {
                // Don't trigger if clicking on checkbox
                if (e.target.classList.contains('trophy-checkbox')) return;
                
                const trophyId = parseInt(card.dataset.id);
                this.onTrophyClick(trophyId, e);
            });
        });

        // Checkbox handlers
        if (this.options.enableSelection) {
            this.$$('.trophy-checkbox').forEach(checkbox => {
                this.addEventListener(checkbox, 'change', (e) => {
                    e.stopPropagation();
                    const trophyId = parseInt(checkbox.dataset.id);
                    this.toggleTrophySelection(trophyId);
                });
            });
        }

        // Collapse/expand group handlers
        this.$$('.collapse-group').forEach(btn => {
            this.addEventListener(btn, 'click', (e) => {
                e.stopPropagation();
                const rarity = btn.dataset.rarity;
                this.toggleGroupCollapse(rarity);
            });
        });

        // Start spinning button
        const startSpinningBtn = this.$('.start-spinning-btn');
        if (startSpinningBtn) {
            this.addEventListener(startSpinningBtn, 'click', () => {
                this.onStartSpinning();
            });
        }
    }

    groupTrophiesByRarity() {
        const grouped = {
            legendary: [],
            epic: [],
            rare: [],
            uncommon: [],
            common: []
        };

        this.trophies.forEach(trophy => {
            const rarity = trophy.rarity || 'common';
            if (grouped[rarity]) {
                grouped[rarity].push(trophy);
            } else {
                grouped.common.push(trophy);
            }
        });

        return grouped;
    }

    getRarityOrder(rarity) {
        const order = {
            legendary: 1,
            epic: 2,
            rare: 3,
            uncommon: 4,
            common: 5
        };
        return order[rarity] || 6;
    }

    getRarityColor(rarity) {
        const colors = {
            legendary: '#ff9800',
            epic: '#9c27b0',
            rare: '#2196f3',
            uncommon: '#4caf50',
            common: '#9e9e9e'
        };
        return colors[rarity] || colors.common;
    }

    shouldGroupByRarity() {
        return this.options.enableGrouping && this.trophies.length > 6;
    }

    toggleViewMode() {
        this.viewMode = this.viewMode === 'grid' ? 'list' : 'grid';
        this.render();
        this.onViewModeChange(this.viewMode);
    }

    toggleSelectAll(e) {
        const isChecked = e.target.checked;
        
        if (isChecked) {
            this.trophies.forEach(trophy => this.selectedTrophies.add(trophy.id));
        } else {
            this.selectedTrophies.clear();
        }
        
        // Update checkbox states
        this.$$('.trophy-checkbox').forEach(checkbox => {
            checkbox.checked = isChecked;
        });
        
        this.render();
        this.onSelectionChange(Array.from(this.selectedTrophies));
    }

    toggleTrophySelection(trophyId) {
        if (this.selectedTrophies.has(trophyId)) {
            this.selectedTrophies.delete(trophyId);
        } else {
            this.selectedTrophies.add(trophyId);
        }
        
        this.updateSelectionDisplay();
        this.onSelectionChange(Array.from(this.selectedTrophies));
    }

    updateSelectionDisplay() {
        const selectedCount = this.selectedTrophies.size;
        const totalCount = this.trophies.length;
        
        // Update select all checkbox state
        const selectAllBtn = this.$('#selectAllTrophies');
        if (selectAllBtn) {
            selectAllBtn.checked = selectedCount === totalCount;
            selectAllBtn.indeterminate = selectedCount > 0 && selectedCount < totalCount;
        }
        
        // Update selected cards appearance
        this.$$('.trophy-card').forEach(card => {
            const trophyId = parseInt(card.dataset.id);
            card.classList.toggle('selected', this.selectedTrophies.has(trophyId));
        });
    }

    toggleGroupCollapse(rarity) {
        const group = this.$(`.rarity-group[data-rarity="${rarity}"]`);
        const grid = this.$(`.trophy-grid[data-rarity="${rarity}"]`);
        const button = this.$(`.collapse-group[data-rarity="${rarity}"]`);
        
        if (group && grid && button) {
            const isCollapsed = grid.classList.toggle('collapsed');
            button.textContent = isCollapsed ? '+' : '−';
            group.classList.toggle('collapsed', isCollapsed);
        }
    }

    animateEntrance() {
        const cards = this.$$('.trophy-card');
        
        cards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 50);
        });
    }

    // Public API methods
    setTrophies(trophies) {
        this.trophies = trophies || [];
        this.render();
    }

    getTrophies() {
        return [...this.trophies];
    }

    getSelectedTrophies() {
        return Array.from(this.selectedTrophies);
    }

    clearSelection() {
        this.selectedTrophies.clear();
        this.updateSelectionDisplay();
    }

    setViewMode(mode) {
        if (['grid', 'list'].includes(mode)) {
            this.viewMode = mode;
            this.render();
        }
    }

    // Event hooks for subclasses
    onTrophyClick(trophyId, event) {
        // Override in parent component
        console.log('Trophy clicked:', trophyId);
    }

    onSelectionChange(selectedIds) {
        // Override in parent component
        console.log('Selection changed:', selectedIds);
    }

    onViewModeChange(mode) {
        // Override in parent component
        console.log('View mode changed:', mode);
    }

    onStartSpinning() {
        // Override in parent component - navigate to game
        if (window.router) {
            window.router.navigate('/game');
        }
    }
}