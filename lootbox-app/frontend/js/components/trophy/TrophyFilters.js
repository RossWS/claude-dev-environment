// Trophy Filters Component - handles filtering and sorting of trophies
class TrophyFilters extends BaseComponent {
    constructor(selector, options = {}) {
        super(selector, options);
        this.currentFilters = {
            type: '',
            rarity: '',
            sort: 'unlock_time',
            search: '',
            unlocked: 'all' // 'all', 'unlocked', 'locked'
        };
        this.availableFilters = {
            types: [],
            rarities: [],
            platforms: []
        };
    }

    getDefaultOptions() {
        return {
            enableSearch: true,
            enableTypeFilter: true,
            enableRarityFilter: true,
            enableSortFilter: true,
            enableUnlockedFilter: true,
            debounceDelay: 300
        };
    }

    setupEventListeners() {
        super.setupEventListeners();
        
        // Search input
        if (this.options.enableSearch) {
            const searchInput = this.$('#trophySearch');
            if (searchInput) {
                this.addEventListener(searchInput, 'input', 
                    this.debounce(() => this.handleSearchChange(), this.options.debounceDelay));
            }
        }

        // Type filter
        if (this.options.enableTypeFilter) {
            const typeFilter = this.$('#typeFilter');
            if (typeFilter) {
                this.addEventListener(typeFilter, 'change', this.handleTypeChange);
            }
        }

        // Rarity filter
        if (this.options.enableRarityFilter) {
            const rarityFilter = this.$('#rarityFilter');
            if (rarityFilter) {
                this.addEventListener(rarityFilter, 'change', this.handleRarityChange);
            }
        }

        // Sort filter
        if (this.options.enableSortFilter) {
            const sortFilter = this.$('#sortFilter');
            if (sortFilter) {
                this.addEventListener(sortFilter, 'change', this.handleSortChange);
            }
        }

        // Unlocked filter
        if (this.options.enableUnlockedFilter) {
            const unlockedFilter = this.$('#unlockedFilter');
            if (unlockedFilter) {
                this.addEventListener(unlockedFilter, 'change', this.handleUnlockedChange);
            }
        }

        // Clear filters button
        const clearBtn = this.$('#clearFiltersBtn');
        if (clearBtn) {
            this.addEventListener(clearBtn, 'click', this.clearAllFilters);
        }

        // Advanced filters toggle
        const advancedToggle = this.$('#advancedFiltersToggle');
        if (advancedToggle) {
            this.addEventListener(advancedToggle, 'click', this.toggleAdvancedFilters);
        }
    }

    render() {
        this.updateFilterOptions();
        this.updateFilterCounts();
        this.updateClearButtonState();
    }

    updateFilterOptions() {
        // Update type filter options
        const typeFilter = this.$('#typeFilter');
        if (typeFilter && this.availableFilters.types.length > 0) {
            const currentValue = typeFilter.value;
            
            typeFilter.innerHTML = '<option value="">All Types</option>' + 
                this.availableFilters.types.map(type => 
                    `<option value="${type}" ${type === currentValue ? 'selected' : ''}>
                        ${Utils.capitalizeFirst(type)}
                    </option>`
                ).join('');
        }

        // Update rarity filter options
        const rarityFilter = this.$('#rarityFilter');
        if (rarityFilter && this.availableFilters.rarities.length > 0) {
            const currentValue = rarityFilter.value;
            const sortedRarities = [...this.availableFilters.rarities].sort((a, b) => 
                this.getRarityOrder(a) - this.getRarityOrder(b)
            );
            
            rarityFilter.innerHTML = '<option value="">All Rarities</option>' + 
                sortedRarities.map(rarity => 
                    `<option value="${rarity}" ${rarity === currentValue ? 'selected' : ''}>
                        ${Utils.capitalizeFirst(rarity)}
                    </option>`
                ).join('');
        }
    }

    updateFilterCounts() {
        // Show active filter count
        const activeCount = this.getActiveFilterCount();
        const filterBadge = this.$('.filter-count-badge');
        
        if (filterBadge) {
            if (activeCount > 0) {
                filterBadge.textContent = activeCount;
                filterBadge.classList.remove('hidden');
            } else {
                filterBadge.classList.add('hidden');
            }
        }

        // Update filter labels with counts if available
        this.updateFilterLabelCounts();
    }

    updateFilterLabelCounts() {
        // This would be populated with actual counts from the trophy data
        const counts = this.getFilterCounts();
        
        // Update type filter labels
        const typeFilter = this.$('#typeFilter');
        if (typeFilter && counts.types) {
            Array.from(typeFilter.options).forEach(option => {
                if (option.value && counts.types[option.value]) {
                    const originalText = option.textContent.split(' (')[0];
                    option.textContent = `${originalText} (${counts.types[option.value]})`;
                }
            });
        }

        // Update rarity filter labels
        const rarityFilter = this.$('#rarityFilter');
        if (rarityFilter && counts.rarities) {
            Array.from(rarityFilter.options).forEach(option => {
                if (option.value && counts.rarities[option.value]) {
                    const originalText = option.textContent.split(' (')[0];
                    option.textContent = `${originalText} (${counts.rarities[option.value]})`;
                }
            });
        }
    }

    updateClearButtonState() {
        const clearBtn = this.$('#clearFiltersBtn');
        if (clearBtn) {
            const hasActiveFilters = this.getActiveFilterCount() > 0;
            clearBtn.disabled = !hasActiveFilters;
            clearBtn.classList.toggle('has-filters', hasActiveFilters);
        }
    }

    handleSearchChange() {
        const searchInput = this.$('#trophySearch');
        const searchTerm = searchInput ? searchInput.value.trim() : '';
        
        this.currentFilters.search = searchTerm;
        this.onFiltersChange();
    }

    handleTypeChange(e) {
        this.currentFilters.type = e.target.value;
        this.onFiltersChange();
    }

    handleRarityChange(e) {
        this.currentFilters.rarity = e.target.value;
        this.onFiltersChange();
    }

    handleSortChange(e) {
        this.currentFilters.sort = e.target.value;
        this.onFiltersChange();
    }

    handleUnlockedChange(e) {
        this.currentFilters.unlocked = e.target.value;
        this.onFiltersChange();
    }

    clearAllFilters() {
        // Reset all filters to default values
        this.currentFilters = {
            type: '',
            rarity: '',
            sort: 'unlock_time',
            search: '',
            unlocked: 'all'
        };

        // Reset UI elements
        const searchInput = this.$('#trophySearch');
        if (searchInput) searchInput.value = '';

        const typeFilter = this.$('#typeFilter');
        if (typeFilter) typeFilter.value = '';

        const rarityFilter = this.$('#rarityFilter');
        if (rarityFilter) rarityFilter.value = '';

        const sortFilter = this.$('#sortFilter');
        if (sortFilter) sortFilter.value = 'unlock_time';

        const unlockedFilter = this.$('#unlockedFilter');
        if (unlockedFilter) unlockedFilter.value = 'all';

        this.updateClearButtonState();
        this.onFiltersChange();
    }

    toggleAdvancedFilters() {
        const advancedSection = this.$('#advancedFiltersSection');
        const toggleBtn = this.$('#advancedFiltersToggle');
        
        if (advancedSection && toggleBtn) {
            const isVisible = advancedSection.classList.toggle('expanded');
            toggleBtn.textContent = isVisible ? 'Hide Advanced Filters' : 'Show Advanced Filters';
            toggleBtn.classList.toggle('expanded', isVisible);
        }
    }

    getActiveFilterCount() {
        let count = 0;
        
        if (this.currentFilters.search) count++;
        if (this.currentFilters.type) count++;
        if (this.currentFilters.rarity) count++;
        if (this.currentFilters.unlocked !== 'all') count++;
        
        return count;
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

    // Filter application methods
    applyFilters(trophies) {
        let filtered = [...trophies];

        // Apply search filter
        if (this.currentFilters.search) {
            const searchTerm = this.currentFilters.search.toLowerCase();
            filtered = filtered.filter(trophy => 
                trophy.title.toLowerCase().includes(searchTerm) ||
                (trophy.description && trophy.description.toLowerCase().includes(searchTerm)) ||
                (trophy.platforms && trophy.platforms.some(platform => 
                    platform.toLowerCase().includes(searchTerm)
                ))
            );
        }

        // Apply type filter
        if (this.currentFilters.type) {
            filtered = filtered.filter(trophy => trophy.type === this.currentFilters.type);
        }

        // Apply rarity filter
        if (this.currentFilters.rarity) {
            filtered = filtered.filter(trophy => trophy.rarity === this.currentFilters.rarity);
        }

        // Apply unlocked filter
        if (this.currentFilters.unlocked !== 'all') {
            const showUnlocked = this.currentFilters.unlocked === 'unlocked';
            filtered = filtered.filter(trophy => !!trophy.unlock_time === showUnlocked);
        }

        // Apply sorting
        filtered.sort((a, b) => this.compareTrophies(a, b, this.currentFilters.sort));

        return filtered;
    }

    compareTrophies(a, b, sortBy) {
        switch (sortBy) {
            case 'title_asc':
                return a.title.localeCompare(b.title);
            
            case 'title_desc':
                return b.title.localeCompare(a.title);
            
            case 'unlock_time':
                // Unlocked items first, sorted by unlock time (newest first)
                if (a.unlock_time && b.unlock_time) {
                    return new Date(b.unlock_time) - new Date(a.unlock_time);
                }
                if (a.unlock_time && !b.unlock_time) return -1;
                if (!a.unlock_time && b.unlock_time) return 1;
                return a.title.localeCompare(b.title);
            
            case 'rarity_asc':
                const rarityA = this.getRarityOrder(a.rarity);
                const rarityB = this.getRarityOrder(b.rarity);
                if (rarityA !== rarityB) return rarityA - rarityB;
                return a.title.localeCompare(b.title);
            
            case 'rarity_desc':
                const rarityA2 = this.getRarityOrder(a.rarity);
                const rarityB2 = this.getRarityOrder(b.rarity);
                if (rarityA2 !== rarityB2) return rarityB2 - rarityA2;
                return a.title.localeCompare(b.title);
            
            case 'year_desc':
                if (a.year && b.year) return b.year - a.year;
                if (a.year && !b.year) return -1;
                if (!a.year && b.year) return 1;
                return a.title.localeCompare(b.title);
            
            default:
                return a.title.localeCompare(b.title);
        }
    }

    // Public API methods
    getFilters() {
        return { ...this.currentFilters };
    }

    setFilters(filters) {
        this.currentFilters = { ...this.currentFilters, ...filters };
        this.updateUIFromFilters();
        this.updateClearButtonState();
    }

    setAvailableOptions(options) {
        this.availableFilters = { ...this.availableFilters, ...options };
        this.updateFilterOptions();
    }

    getFilterCounts() {
        // This should be set by the parent component with actual trophy data
        return this.filterCounts || {};
    }

    setFilterCounts(counts) {
        this.filterCounts = counts;
        this.updateFilterLabelCounts();
    }

    updateUIFromFilters() {
        const searchInput = this.$('#trophySearch');
        if (searchInput) searchInput.value = this.currentFilters.search;

        const typeFilter = this.$('#typeFilter');
        if (typeFilter) typeFilter.value = this.currentFilters.type;

        const rarityFilter = this.$('#rarityFilter');
        if (rarityFilter) rarityFilter.value = this.currentFilters.rarity;

        const sortFilter = this.$('#sortFilter');
        if (sortFilter) sortFilter.value = this.currentFilters.sort;

        const unlockedFilter = this.$('#unlockedFilter');
        if (unlockedFilter) unlockedFilter.value = this.currentFilters.unlocked;

        this.updateFilterCounts();
    }

    reset() {
        this.clearAllFilters();
    }

    // Event hook for parent component
    onFiltersChange() {
        // Override in parent component
        this.updateClearButtonState();
        this.updateFilterCounts();
        
        // Emit custom event
        this.element.dispatchEvent(new CustomEvent('filtersChanged', {
            detail: { filters: this.getFilters() }
        }));
    }
}