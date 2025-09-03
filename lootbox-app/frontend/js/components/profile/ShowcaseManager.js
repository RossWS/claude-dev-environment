// Showcase Manager Component - handles user's trophy/card showcase
class ShowcaseManager extends BaseComponent {
    constructor(selector, options = {}) {
        super(selector, options);
        this.showcaseCards = [];
        this.selectedShowcaseCards = [];
        this.availableTrophies = [];
        this.isEditing = false;
        this.maxShowcaseItems = 6;
    }

    getDefaultOptions() {
        return {
            maxItems: 6,
            enableFiltering: true,
            enableDragAndDrop: false,
            animateChanges: true
        };
    }

    setupEventListeners() {
        super.setupEventListeners();
        
        // Edit showcase button
        const editBtn = this.$('#editShowcaseBtn');
        if (editBtn) {
            this.addEventListener(editBtn, 'click', this.startEditing);
        }

        // Save showcase button
        const saveBtn = this.$('#saveShowcaseBtn');
        if (saveBtn) {
            this.addEventListener(saveBtn, 'click', this.saveShowcase);
        }

        // Cancel editing button
        const cancelBtn = this.$('#cancelShowcaseBtn');
        if (cancelBtn) {
            this.addEventListener(cancelBtn, 'click', this.cancelEditing);
        }

        // Showcase filters
        const typeFilter = this.$('#showcaseTypeFilter');
        const rarityFilter = this.$('#showcaseRarityFilter');
        
        if (typeFilter) {
            this.addEventListener(typeFilter, 'change', this.applyFilters);
        }
        
        if (rarityFilter) {
            this.addEventListener(rarityFilter, 'change', this.applyFilters);
        }
    }

    async render() {
        await this.loadShowcaseData();
        this.renderShowcaseGrid();
        this.updateEditingState();
    }

    async loadShowcaseData() {
        try {
            const [showcaseResponse, trophiesResponse] = await Promise.all([
                apiClient.get('/user/showcase'),
                apiClient.get('/user/trophies/available-for-showcase')
            ]);

            if (showcaseResponse.success) {
                this.showcaseCards = showcaseResponse.data.showcase || [];
                this.selectedShowcaseCards = [...this.showcaseCards];
            }

            if (trophiesResponse.success) {
                this.availableTrophies = trophiesResponse.data.trophies || [];
            }
        } catch (error) {
            this.handleError(error, 'loading showcase data');
        }
    }

    renderShowcaseGrid() {
        const container = this.$('#showcaseGrid');
        if (!container) return;

        if (this.showcaseCards.length === 0 && !this.isEditing) {
            container.innerHTML = `
                <div class="empty-showcase">
                    <div class="empty-showcase-icon">🏆</div>
                    <div class="empty-showcase-text">Your showcase is empty</div>
                    <div class="empty-showcase-subtext">
                        Add your favorite trophies and cards to showcase your achievements
                    </div>
                </div>
            `;
            return;
        }

        const showcaseHTML = this.showcaseCards.map((item, index) => 
            this.createShowcaseCard(item, index)
        ).join('');

        // Add empty slots if editing and not full
        let emptySlots = '';
        if (this.isEditing && this.showcaseCards.length < this.maxShowcaseItems) {
            const slotsNeeded = this.maxShowcaseItems - this.showcaseCards.length;
            emptySlots = Array(slotsNeeded).fill(null).map((_, index) => 
                this.createEmptyShowcaseSlot(this.showcaseCards.length + index)
            ).join('');
        }

        container.innerHTML = showcaseHTML + emptySlots;
        this.addShowcaseCardHandlers();
    }

    createShowcaseCard(item, index) {
        const isEditing = this.isEditing ? 'editing' : '';
        const removeBtn = this.isEditing ? 
            `<button class="remove-showcase-item" data-index="${index}">×</button>` : '';

        return `
            <div class="showcase-card ${isEditing}" data-index="${index}">
                ${removeBtn}
                <div class="showcase-card-inner">
                    <div class="showcase-card-image">
                        ${item.poster_url ? 
                            `<img src="${item.poster_url}" alt="${Utils.escapeHtml(item.title)}" loading="lazy">` :
                            '<div class="placeholder-image">🎬</div>'
                        }
                    </div>
                    <div class="showcase-card-overlay">
                        <div class="showcase-card-title">${Utils.escapeHtml(item.title)}</div>
                        <div class="showcase-card-meta">
                            <span class="showcase-rarity rarity-${item.rarity}">${Utils.capitalizeFirst(item.rarity)}</span>
                            <span class="showcase-type">${item.type.toUpperCase()}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    createEmptyShowcaseSlot(index) {
        return `
            <div class="showcase-card empty-slot" data-index="${index}">
                <div class="empty-slot-content">
                    <div class="empty-slot-icon">+</div>
                    <div class="empty-slot-text">Add Item</div>
                </div>
            </div>
        `;
    }

    renderAvailableItems() {
        const container = this.$('#showcaseSelection');
        if (!container || !this.isEditing) return;

        const filteredTrophies = this.getFilteredAvailableTrophies();
        
        if (filteredTrophies.length === 0) {
            container.innerHTML = '<div class="no-available-items">No items available for showcase</div>';
            return;
        }

        const itemsHTML = filteredTrophies.map(item => this.createAvailableItemCard(item)).join('');
        container.innerHTML = itemsHTML;
        
        this.addAvailableItemHandlers();
    }

    createAvailableItemCard(item) {
        const isSelected = this.selectedShowcaseCards.some(card => 
            card.id === item.id && card.type === item.type
        );
        const selectedClass = isSelected ? 'selected' : '';
        const disabledClass = this.selectedShowcaseCards.length >= this.maxShowcaseItems && !isSelected ? 'disabled' : '';

        return `
            <div class="available-item ${selectedClass} ${disabledClass}" 
                 data-id="${item.id}" 
                 data-type="${item.type}">
                <div class="available-item-image">
                    ${item.poster_url ? 
                        `<img src="${item.poster_url}" alt="${Utils.escapeHtml(item.title)}" loading="lazy">` :
                        '<div class="placeholder-image">🎬</div>'
                    }
                </div>
                <div class="available-item-overlay">
                    <div class="available-item-title">${Utils.escapeHtml(item.title)}</div>
                    <div class="available-item-meta">
                        <span class="available-rarity rarity-${item.rarity}">${Utils.capitalizeFirst(item.rarity)}</span>
                        <span class="available-type">${item.type.toUpperCase()}</span>
                    </div>
                    <div class="available-item-action">
                        ${isSelected ? 'Remove' : 'Add'}
                    </div>
                </div>
            </div>
        `;
    }

    addShowcaseCardHandlers() {
        // Remove item buttons
        this.$$('.remove-showcase-item').forEach(btn => {
            this.addEventListener(btn, 'click', (e) => {
                e.stopPropagation();
                const index = parseInt(e.target.dataset.index);
                this.removeFromShowcase(index);
            });
        });

        // Empty slot click handlers
        this.$$('.empty-slot').forEach(slot => {
            this.addEventListener(slot, 'click', () => {
                this.showAvailableItems();
            });
        });

        // Showcase card click (for details)
        this.$$('.showcase-card:not(.empty-slot)').forEach(card => {
            this.addEventListener(card, 'click', (e) => {
                if (!this.isEditing && !e.target.classList.contains('remove-showcase-item')) {
                    const index = parseInt(card.dataset.index);
                    this.showCardDetails(this.showcaseCards[index]);
                }
            });
        });
    }

    addAvailableItemHandlers() {
        this.$$('.available-item:not(.disabled)').forEach(item => {
            this.addEventListener(item, 'click', (e) => {
                const itemId = parseInt(item.dataset.id);
                const itemType = item.dataset.type;
                this.toggleAvailableItem(itemId, itemType);
            });
        });
    }

    startEditing() {
        this.isEditing = true;
        this.selectedShowcaseCards = [...this.showcaseCards];
        this.updateEditingState();
        this.renderShowcaseGrid();
        this.renderAvailableItems();
    }

    cancelEditing() {
        this.isEditing = false;
        this.selectedShowcaseCards = [...this.showcaseCards];
        this.updateEditingState();
        this.renderShowcaseGrid();
        this.hideAvailableItems();
    }

    async saveShowcase() {
        try {
            const showcaseData = {
                items: this.selectedShowcaseCards.map(item => ({
                    id: item.id,
                    type: item.type
                }))
            };

            const response = await apiClient.put('/user/showcase', showcaseData);
            
            if (response.success) {
                this.showcaseCards = [...this.selectedShowcaseCards];
                this.isEditing = false;
                this.updateEditingState();
                this.renderShowcaseGrid();
                this.hideAvailableItems();
                
                Utils.showNotification('Showcase updated successfully', 'success');
            }
        } catch (error) {
            this.handleError(error, 'saving showcase');
        }
    }

    removeFromShowcase(index) {
        if (index >= 0 && index < this.selectedShowcaseCards.length) {
            this.selectedShowcaseCards.splice(index, 1);
            this.renderShowcaseGrid();
            this.renderAvailableItems(); // Refresh to show newly available item
        }
    }

    toggleAvailableItem(itemId, itemType) {
        const existingIndex = this.selectedShowcaseCards.findIndex(item => 
            item.id === itemId && item.type === itemType
        );

        if (existingIndex >= 0) {
            // Remove from selection
            this.selectedShowcaseCards.splice(existingIndex, 1);
        } else {
            // Add to selection if not at max capacity
            if (this.selectedShowcaseCards.length < this.maxShowcaseItems) {
                const availableItem = this.availableTrophies.find(item => 
                    item.id === itemId && item.type === itemType
                );
                if (availableItem) {
                    this.selectedShowcaseCards.push(availableItem);
                }
            }
        }

        this.renderShowcaseGrid();
        this.renderAvailableItems();
    }

    getFilteredAvailableTrophies() {
        const typeFilter = this.$('#showcaseTypeFilter');
        const rarityFilter = this.$('#showcaseRarityFilter');
        
        let filtered = [...this.availableTrophies];

        if (typeFilter && typeFilter.value) {
            filtered = filtered.filter(item => item.type === typeFilter.value);
        }

        if (rarityFilter && rarityFilter.value) {
            filtered = filtered.filter(item => item.rarity === rarityFilter.value);
        }

        return filtered;
    }

    applyFilters() {
        if (this.isEditing) {
            this.renderAvailableItems();
        }
    }

    showAvailableItems() {
        this.renderAvailableItems();
        const selectionContainer = this.$('#showcaseSelection');
        if (selectionContainer) {
            selectionContainer.classList.remove('hidden');
        }
    }

    hideAvailableItems() {
        const selectionContainer = this.$('#showcaseSelection');
        if (selectionContainer) {
            selectionContainer.classList.add('hidden');
        }
    }

    updateEditingState() {
        const editBtn = this.$('#editShowcaseBtn');
        const saveBtn = this.$('#saveShowcaseBtn');
        const cancelBtn = this.$('#cancelShowcaseBtn');
        const editorContainer = this.$('#showcaseEditor');

        if (editBtn) editBtn.style.display = this.isEditing ? 'none' : 'inline-block';
        if (saveBtn) saveBtn.style.display = this.isEditing ? 'inline-block' : 'none';
        if (cancelBtn) cancelBtn.style.display = this.isEditing ? 'inline-block' : 'none';
        
        if (editorContainer) {
            editorContainer.classList.toggle('editing', this.isEditing);
        }

        // Update class on main container
        this.element.classList.toggle('showcase-editing', this.isEditing);
    }

    showCardDetails(item) {
        if (window.UI && window.UI.showCardDetailModal) {
            window.UI.showCardDetailModal(item);
        }
    }

    // Public API methods
    refreshShowcase() {
        return this.render();
    }

    getShowcaseItems() {
        return [...this.showcaseCards];
    }

    isCurrentlyEditing() {
        return this.isEditing;
    }

    onError(error, context) {
        super.onError(error, context);
        Utils.showNotification(`Error ${context}: ${error.message}`, 'error');
    }
}