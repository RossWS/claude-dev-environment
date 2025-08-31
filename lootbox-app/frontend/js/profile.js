// User Profile Management System
class UserProfile {
    constructor() {
        this.currentTab = 'overview';
        this.showcaseCards = [];
        this.selectedShowcaseCards = [];
        this.availableTrophies = [];
        this.profileData = null;
        this.initializeElements();
        this.attachEventListeners();
    }

    initializeElements() {
        // Profile navigation elements
        this.profileNavBtns = document.querySelectorAll('.profile-nav-btn');
        this.profileTabs = document.querySelectorAll('.profile-tab');
        
        // Profile overview elements
        this.avatarInitials = document.getElementById('avatarInitials');
        this.profileUsername = document.getElementById('profileUsername');
        this.profileMemberSince = document.getElementById('profileMemberSince');
        this.totalTrophiesCount = document.getElementById('totalTrophiesCount');
        this.totalSpinsCount = document.getElementById('totalSpinsCount');
        this.rareItemsCount = document.getElementById('rareItemsCount');
        this.collectionRate = document.getElementById('collectionRate');
        this.recentActivity = document.getElementById('recentActivity');

        // Showcase elements
        this.showcaseGrid = document.getElementById('showcaseGrid');
        this.editShowcaseBtn = document.getElementById('editShowcaseBtn');
        this.showcaseEditor = document.getElementById('showcaseEditor');
        this.saveShowcaseBtn = document.getElementById('saveShowcaseBtn');
        this.cancelShowcaseBtn = document.getElementById('cancelShowcaseBtn');
        this.showcaseSelection = document.getElementById('showcaseSelection');
        this.showcaseTypeFilter = document.getElementById('showcaseTypeFilter');
        this.showcaseRarityFilter = document.getElementById('showcaseRarityFilter');

        // Settings elements
        this.accountSettingsForm = document.getElementById('accountSettingsForm');
        this.passwordChangeForm = document.getElementById('passwordChangeForm');
        this.settingsUsername = document.getElementById('settingsUsername');
        this.settingsEmail = document.getElementById('settingsEmail');
        this.profilePublic = document.getElementById('profilePublic');
        this.showStats = document.getElementById('showStats');
        this.showActivity = document.getElementById('showActivity');
        this.deleteAccountBtn = document.getElementById('deleteAccountBtn');
    }

    attachEventListeners() {
        // Tab navigation
        this.profileNavBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.dataset.tab;
                if (tab) {
                    this.switchTab(tab);
                }
            });
        });

        // Back button
        const backBtn = document.getElementById('backToGameFromProfile');
        if (backBtn) {
            backBtn.addEventListener('click', () => this.hideProfileScreen());
        }

        // Showcase functionality
        if (this.editShowcaseBtn) {
            this.editShowcaseBtn.addEventListener('click', () => this.enterShowcaseEditMode());
        }
        
        if (this.saveShowcaseBtn) {
            this.saveShowcaseBtn.addEventListener('click', () => this.saveShowcase());
        }
        
        if (this.cancelShowcaseBtn) {
            this.cancelShowcaseBtn.addEventListener('click', () => this.exitShowcaseEditMode());
        }

        // Showcase filters
        if (this.showcaseTypeFilter) {
            this.showcaseTypeFilter.addEventListener('change', () => this.filterShowcaseOptions());
        }
        
        if (this.showcaseRarityFilter) {
            this.showcaseRarityFilter.addEventListener('change', () => this.filterShowcaseOptions());
        }

        // Settings forms
        if (this.accountSettingsForm) {
            this.accountSettingsForm.addEventListener('submit', (e) => this.handleAccountUpdate(e));
        }
        
        if (this.passwordChangeForm) {
            this.passwordChangeForm.addEventListener('submit', (e) => this.handlePasswordChange(e));
        }

        // Privacy settings (listen for changes on individual checkboxes)
        if (this.profilePublic) {
            this.profilePublic.addEventListener('change', () => this.handlePrivacyUpdate());
        }
        if (this.showStats) {
            this.showStats.addEventListener('change', () => this.handlePrivacyUpdate());
        }
        if (this.showActivity) {
            this.showActivity.addEventListener('change', () => this.handlePrivacyUpdate());
        }

        // Delete account button
        if (this.deleteAccountBtn) {
            this.deleteAccountBtn.addEventListener('click', () => this.handleDeleteAccount());
        }
    }

    async showProfileScreen() {
        const gameScreen = document.getElementById('gameScreen');
        const profileScreen = document.getElementById('profileScreen');
        
        if (gameScreen && profileScreen) {
            gameScreen.classList.add('hidden');
            profileScreen.classList.remove('hidden');
            
            // Load profile data when screen is shown
            await this.loadProfileData();
            this.switchTab('overview');
        }
    }

    hideProfileScreen() {
        console.log('🔧 Profile: Returning to game via router...');
        
        // Use router navigation
        if (window.router) {
            window.router.navigate('/game');
        } else {
            console.error('🔧 Profile: Router not available');
        }
    }

    switchTab(tabName) {
        this.currentTab = tabName;
        
        // Update navigation buttons
        this.profileNavBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Update tab content
        this.profileTabs.forEach(tab => {
            tab.classList.toggle('active', tab.id === `${tabName}Tab`);
        });

        // Load tab-specific data
        switch (tabName) {
            case 'overview':
                this.loadOverviewData();
                break;
            case 'showcase':
                this.loadShowcaseData();
                break;
            case 'settings':
                this.loadSettingsData();
                break;
        }
    }

    async loadProfileData() {
        try {
            UI.showLoading(true);
            
            const response = await api.user.getProfile();
            if (response.success) {
                this.profileData = response.profile;
                this.updateProfileHeader();
                // Load overview data immediately after profile data is loaded
                if (this.currentTab === 'overview') {
                    this.loadOverviewData();
                }
            } else {
                UI.showNotification(response.message || 'Failed to load profile', 'error');
            }
        } catch (error) {
            console.error('Profile loading error:', error);
            UI.showNotification('Failed to load profile data', 'error');
        } finally {
            UI.showLoading(false);
        }
    }

    updateProfileHeader() {
        if (!this.profileData) return;

        // Update avatar initials
        const initials = this.profileData.username.substring(0, 2).toUpperCase();
        if (this.avatarInitials) {
            this.avatarInitials.textContent = initials;
        }

        // Update username
        if (this.profileUsername) {
            this.profileUsername.textContent = this.profileData.username;
        }

        // Update member since date
        if (this.profileMemberSince) {
            const memberSince = new Date(this.profileData.memberSince).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            this.profileMemberSince.textContent = memberSince;
        }
    }

    loadOverviewData() {
        if (!this.profileData) return;

        const stats = this.profileData.stats;
        
        // Update stat counters with animations
        this.animateCounter(this.totalTrophiesCount, stats.totalUnlocks || 0);
        this.animateCounter(this.totalSpinsCount, stats.totalSpins || 0);
        
        // Calculate rare items count (epic, legendary, mythic)
        const rareCount = this.calculateRareItemsCount(stats.rarityBreakdown || []);
        this.animateCounter(this.rareItemsCount, rareCount);
        
        // Calculate collection rate
        const collectionRate = stats.totalSpins > 0 ? 
            Math.round((stats.totalUnlocks / stats.totalSpins) * 100) : 0;
        this.animateCounter(this.collectionRate, collectionRate, '%');

        this.loadRecentActivity();
    }

    calculateRareItemsCount(rarityBreakdown) {
        const rareRarities = ['epic', 'legendary', 'mythic'];
        return rarityBreakdown
            .filter(item => rareRarities.includes(item.rarity_tier))
            .reduce((sum, item) => sum + item.count, 0);
    }

    animateCounter(element, targetValue, suffix = '') {
        if (!element) return;
        
        const duration = 1000;
        const startValue = 0;
        const increment = targetValue / (duration / 16);
        let currentValue = startValue;

        const animate = () => {
            currentValue += increment;
            if (currentValue >= targetValue) {
                element.textContent = targetValue + suffix;
                return;
            }
            element.textContent = Math.floor(currentValue) + suffix;
            requestAnimationFrame(animate);
        };

        animate();
    }

    async loadRecentActivity() {
        try {
            // Load recent trophy unlocks for activity feed
            const response = await api.user.getTrophies({
                limit: 5,
                sort: 'unlock_time'
            });

            if (response.success && this.recentActivity) {
                this.renderRecentActivity(response.trophies);
            }
        } catch (error) {
            console.warn('Failed to load recent activity:', error);
        }
    }

    renderRecentActivity(activities) {
        if (!this.recentActivity || !activities.length) {
            this.recentActivity.innerHTML = `
                <div class="activity-item empty">
                    <span class="activity-icon">🎯</span>
                    <div class="activity-content">
                        <span class="activity-text">No recent activity</span>
                        <span class="activity-time">Start opening loot boxes!</span>
                    </div>
                </div>
            `;
            return;
        }

        this.recentActivity.innerHTML = activities.map(activity => `
            <div class="activity-item">
                <span class="activity-icon">${this.getRarityIcon(activity.rarity_tier)}</span>
                <div class="activity-content">
                    <span class="activity-text">Unlocked "${activity.title}"</span>
                    <span class="activity-time">${Utils.formatRelativeTime(activity.unlocked_at)}</span>
                </div>
            </div>
        `).join('');
    }

    getRarityIcon(rarity) {
        const icons = {
            mythic: '🌟',
            legendary: '👑',
            epic: '💎',
            rare: '⭐',
            uncommon: '🔹',
            common: '⚪'
        };
        return icons[rarity] || '🎁';
    }

    async loadShowcaseData() {
        try {
            // Load user's showcase if it exists
            const showcaseResponse = await this.getShowcaseCards();
            if (showcaseResponse.success) {
                this.showcaseCards = showcaseResponse.showcase || [];
                this.renderShowcase();
            }
        } catch (error) {
            console.warn('Failed to load showcase data:', error);
            this.renderEmptyShowcase();
        }
    }

    renderShowcase() {
        if (!this.showcaseGrid) return;

        if (this.showcaseCards.length === 0) {
            this.renderEmptyShowcase();
            return;
        }

        this.showcaseGrid.innerHTML = this.showcaseCards.map((card, index) => {
            const rarity = Utils.getRarityTier(card.quality_score);
            const contentEmoji = card.emoji || (card.type === 'series' ? '📺' : '🎬');
            const contentType = card.type === 'series' ? '📺 Series' : '🎬 Movie';
            
            // Format year for series
            let yearDisplay = card.year;
            if (card.type === 'series' && card.end_year && card.end_year !== card.year) {
                yearDisplay = `${card.year}-${card.end_year}`;
            }
            
            return `
                <div class="showcase-item">
                    <!-- Position Badge Above Card -->
                    <div class="showcase-position-badge">
                        #${index + 1}
                    </div>
                    
                    <!-- Collectible Card -->
                    <div class="collectible-card small subtle ${card.rarity_tier}" data-type="${card.spin_type}" data-card='${JSON.stringify(card).replace(/'/g, "&apos;")}'>
                        <div class="collectible-card-inner">
                            <div class="collectible-card-header">
                                <div class="collectible-card-title">${Utils.sanitizeHtml(card.title)}</div>
                                <div class="collectible-card-cost">${card.quality_score}</div>
                            </div>
                            
                            <div class="collectible-card-art">
                                <div class="collectible-card-type">${contentType}</div>
                                <div class="collectible-rarity-gem">${rarity.icon}</div>
                                ${contentEmoji}
                            </div>
                            
                            <div class="collectible-card-stats">
                                <div class="collectible-stats-row">
                                    <span class="collectible-stat-label">Quality</span>
                                    <span class="collectible-stat-value collectible-quality-score">${card.quality_score}</span>
                                </div>
                                <div class="collectible-stats-row">
                                    <span class="collectible-stat-label">Critics</span>
                                    <span class="collectible-stat-value">${card.critics_score || 'N/A'}%</span>
                                </div>
                                <div class="collectible-stats-row">
                                    <span class="collectible-stat-label">Audience</span>
                                    <span class="collectible-stat-value">${card.audience_score || 'N/A'}%</span>
                                </div>
                            </div>
                            
                            <div class="collectible-card-description">
                                <div class="collectible-description-text">${Utils.sanitizeHtml(card.description)}</div>
                            </div>
                            
                            <div class="collectible-card-footer">
                                <div class="collectible-card-year">${yearDisplay}</div>
                                <div class="collectible-card-rarity">${card.rarity_tier.charAt(0).toUpperCase() + card.rarity_tier.slice(1)}</div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        // Adjust card descriptions after rendering
        setTimeout(() => {
            if (UI && UI.adjustCardDescriptions) {
                UI.adjustCardDescriptions();
            }
            // Add click handlers for card detail modal
            this.addShowcaseCardClickHandlers();
        }, 100);
    }

    renderEmptyShowcase() {
        if (!this.showcaseGrid) return;
        
        this.showcaseGrid.innerHTML = Array.from({length: 5}, (_, i) => `
            <div class="showcase-card-placeholder">
                <div class="showcase-placeholder-icon">🎁</div>
                <div class="showcase-placeholder-text">${i + 1}</div>
                <div class="showcase-placeholder-label">Empty Slot</div>
            </div>
        `).join('');
    }

    addShowcaseCardClickHandlers() {
        const cards = this.showcaseGrid.querySelectorAll('.collectible-card.small[data-card]');
        cards.forEach(card => {
            card.style.cursor = 'pointer';
            card.addEventListener('click', () => {
                try {
                    const cardData = JSON.parse(card.getAttribute('data-card').replace(/&apos;/g, "'"));
                    if (cardData && UI && UI.showCardDetailModal) {
                        UI.showCardDetailModal(cardData);
                    }
                } catch (error) {
                    console.error('Error parsing card data:', error);
                }
            });
        });
    }

    async loadSettingsData() {
        if (!this.profileData) return;

        // Populate settings forms with current data
        if (this.settingsUsername) {
            this.settingsUsername.value = this.profileData.username;
        }
        
        if (this.settingsEmail) {
            this.settingsEmail.value = this.profileData.email;
        }

        // Load privacy settings
        try {
            const response = await api.request('/user/privacy-settings', { method: 'GET' });
            if (response.success) {
                const settings = response.settings;
                if (this.profilePublic) this.profilePublic.checked = settings.profilePublic;
                if (this.showStats) this.showStats.checked = settings.showStats;
                if (this.showActivity) this.showActivity.checked = settings.showActivity;
            }
        } catch (error) {
            console.warn('Failed to load privacy settings:', error);
        }
    }

    // Showcase functionality
    async enterShowcaseEditMode() {
        if (!this.showcaseEditor) return;
        
        try {
            UI.showLoading(true);
            
            // Load user's trophies for selection
            const response = await api.user.getTrophies({
                limit: 100,
                sort: 'quality_score'
            });

            if (response.success) {
                this.availableTrophies = response.trophies || [];
                this.selectedShowcaseCards = [...this.showcaseCards];
                
                // Show editor even if no trophies are available
                this.showcaseEditor.classList.remove('hidden');
                this.renderShowcaseOptions();
                
                // Show helpful message if no trophies
                if (this.availableTrophies.length === 0) {
                    UI.showNotification('You need to unlock some trophies first! Try spinning to get content for your showcase.', 'info');
                }
            } else {
                UI.showNotification(response.message || 'Failed to load trophy options', 'error');
            }
        } catch (error) {
            console.error('Failed to load trophies for showcase:', error);
            UI.showNotification('Failed to load trophy options. Please try again.', 'error');
        } finally {
            UI.showLoading(false);
        }
    }

    exitShowcaseEditMode() {
        if (this.showcaseEditor) {
            this.showcaseEditor.classList.add('hidden');
        }
        this.selectedShowcaseCards = [];
    }

    renderShowcaseOptions() {
        if (!this.showcaseSelection) return;

        const filteredTrophies = this.getFilteredShowcaseTrophies();
        
        this.showcaseSelection.innerHTML = `
            <div class="showcase-selected">
                <h5>Selected Showcase (${this.selectedShowcaseCards.length}/5)</h5>
                <div class="selected-cards" id="selectedCardsContainer">
                    ${this.selectedShowcaseCards.map((card, index) => `
                        <div class="selected-card ${card.rarity_tier}" 
                             draggable="true" 
                             data-card-id="${card.id}" 
                             data-position="${index}">
                            <span class="drag-handle">⋮⋮</span>
                            <span class="selected-position">${index + 1}</span>
                            <span class="selected-title">${Utils.sanitizeHtml(card.title)}</span>
                            <button class="remove-card-btn" onclick="userProfile.removeFromShowcase(${card.id})">×</button>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="showcase-available">
                <h5>Available Trophies</h5>
                <div class="available-cards">
                    ${filteredTrophies.length === 0 ? `
                        <div class="no-trophies-message">
                            <p>🏆 No trophies available yet!</p>
                            <p>Go spin some loot boxes to unlock content for your showcase.</p>
                        </div>
                    ` : filteredTrophies.map(trophy => `
                        <div class="available-card ${trophy.rarity_tier} ${this.selectedShowcaseCards.some(s => s.id === trophy.id) ? 'selected' : ''}"
                             onclick="userProfile.toggleShowcaseCard(${trophy.id})">
                            <div class="card-rarity ${trophy.rarity_tier}">
                                ${this.getRarityIcon(trophy.rarity_tier)}
                            </div>
                            <div class="card-title">${Utils.sanitizeHtml(trophy.title)}</div>
                            <div class="card-score">Score: ${trophy.quality_score}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        // Setup drag and drop functionality for selected cards
        this.setupDragAndDrop();
    }

    getFilteredShowcaseTrophies() {
        let filtered = this.availableTrophies;

        const typeFilter = this.showcaseTypeFilter?.value;
        const rarityFilter = this.showcaseRarityFilter?.value;

        if (typeFilter) {
            filtered = filtered.filter(trophy => trophy.spin_type === typeFilter);
        }

        if (rarityFilter) {
            filtered = filtered.filter(trophy => trophy.rarity_tier === rarityFilter);
        }

        return filtered;
    }

    filterShowcaseOptions() {
        this.renderShowcaseOptions();
    }

    toggleShowcaseCard(cardId) {
        const existingIndex = this.selectedShowcaseCards.findIndex(card => card.id === cardId);
        
        if (existingIndex >= 0) {
            // Remove from showcase
            this.selectedShowcaseCards.splice(existingIndex, 1);
        } else if (this.selectedShowcaseCards.length < 5) {
            // Add to showcase (max 5 cards)
            const trophy = this.availableTrophies.find(t => t.id === cardId);
            if (trophy) {
                this.selectedShowcaseCards.push(trophy);
            }
        } else {
            UI.showNotification('You can only showcase 5 trophies maximum', 'warning');
            return;
        }

        this.renderShowcaseOptions();
    }

    removeFromShowcase(cardId) {
        this.selectedShowcaseCards = this.selectedShowcaseCards.filter(card => card.id !== cardId);
        this.renderShowcaseOptions();
    }

    setupDragAndDrop() {
        const container = document.getElementById('selectedCardsContainer');
        if (!container) return;

        const selectedCards = container.querySelectorAll('.selected-card[draggable="true"]');
        let draggedElement = null;
        let draggedIndex = null;

        selectedCards.forEach((card, index) => {
            // Drag start
            card.addEventListener('dragstart', (e) => {
                draggedElement = card;
                draggedIndex = index;
                card.classList.add('dragging');
                
                // Set drag effect
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/html', card.outerHTML);
                
                // Add visual feedback to other cards
                selectedCards.forEach(otherCard => {
                    if (otherCard !== card) {
                        otherCard.classList.add('drag-target');
                    }
                });
            });

            // Drag end
            card.addEventListener('dragend', (e) => {
                card.classList.remove('dragging');
                selectedCards.forEach(otherCard => {
                    otherCard.classList.remove('drag-target', 'drag-over');
                });
                draggedElement = null;
                draggedIndex = null;
            });

            // Drag over
            card.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                
                if (card !== draggedElement) {
                    card.classList.add('drag-over');
                }
            });

            // Drag leave
            card.addEventListener('dragleave', (e) => {
                card.classList.remove('drag-over');
            });

            // Drop
            card.addEventListener('drop', (e) => {
                e.preventDefault();
                card.classList.remove('drag-over');
                
                if (draggedElement && card !== draggedElement) {
                    const targetIndex = Array.from(selectedCards).indexOf(card);
                    this.reorderShowcaseCards(draggedIndex, targetIndex);
                }
            });
        });
    }

    reorderShowcaseCards(fromIndex, toIndex) {
        // Create a copy of the array to avoid mutations
        const cards = [...this.selectedShowcaseCards];
        
        // Remove the dragged card from its original position
        const [draggedCard] = cards.splice(fromIndex, 1);
        
        // Insert it at the new position
        cards.splice(toIndex, 0, draggedCard);
        
        // Update the selectedShowcaseCards array
        this.selectedShowcaseCards = cards;
        
        // Re-render with new order
        this.renderShowcaseOptions();
        
        console.log(`Moved card from position ${fromIndex + 1} to position ${toIndex + 1}`);
    }

    async saveShowcase() {
        try {
            UI.showLoading(true);
            
            // Get unlock IDs for selected showcase cards
            const unlockIds = this.selectedShowcaseCards.map(card => card.unlock_id || card.id);
            console.log('Saving showcase with unlock IDs:', unlockIds);
            
            const response = await this.updateShowcase(unlockIds);
            console.log('Showcase save response:', response);

            if (response.success) {
                this.showcaseCards = [...this.selectedShowcaseCards];
                this.exitShowcaseEditMode();
                this.renderShowcase();
                UI.showNotification(unlockIds.length === 0 ? 'Showcase cleared successfully!' : 'Showcase updated successfully!', 'success');
            } else {
                console.error('Showcase save failed:', response);
                UI.showNotification(response.message || response.error || 'Failed to update showcase', 'error');
            }
        } catch (error) {
            console.error('Failed to save showcase:', error);
            UI.showNotification(`Failed to save showcase: ${error.message}`, 'error');
        } finally {
            UI.showLoading(false);
        }
    }

    // Settings functionality
    async handleAccountUpdate(e) {
        e.preventDefault();
        
        try {
            const formData = new FormData(e.target);
            const updateData = {
                username: formData.get('username'),
                email: formData.get('email')
            };

            const response = await this.updateAccountInfo(updateData);
            
            if (response.success) {
                this.profileData.username = updateData.username;
                this.profileData.email = updateData.email;
                this.updateProfileHeader();
                UI.showNotification('Account information updated successfully!', 'success');
            } else {
                UI.showNotification(response.message || 'Failed to update account', 'error');
            }
        } catch (error) {
            console.error('Account update error:', error);
            UI.showNotification('Failed to update account information', 'error');
        }
    }

    async handlePasswordChange(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const newPassword = formData.get('newPassword');
        const confirmPassword = formData.get('confirmPassword');

        if (newPassword !== confirmPassword) {
            UI.showNotification('New passwords do not match', 'error');
            return;
        }

        try {
            const response = await this.changePassword({
                currentPassword: formData.get('currentPassword'),
                newPassword: newPassword
            });

            if (response.success) {
                e.target.reset();
                UI.showNotification('Password changed successfully!', 'success');
            } else {
                UI.showNotification(response.message || 'Failed to change password', 'error');
            }
        } catch (error) {
            console.error('Password change error:', error);
            UI.showNotification('Failed to change password', 'error');
        }
    }

    async handlePrivacyUpdate() {
        try {
            const privacyData = {
                profilePublic: this.profilePublic?.checked || false,
                showStats: this.showStats?.checked !== false, // Default to true
                showActivity: this.showActivity?.checked !== false // Default to true
            };

            const response = await this.updatePrivacySettings(privacyData);
            
            if (response.success) {
                UI.showNotification('Privacy settings updated', 'success');
            } else {
                UI.showNotification(response.message || 'Failed to update privacy settings', 'error');
            }
        } catch (error) {
            console.error('Privacy update error:', error);
            UI.showNotification('Failed to update privacy settings', 'error');
        }
    }

    async handleDeleteAccount() {
        const confirmation = prompt('Type "DELETE" to confirm account deletion:');
        
        if (confirmation !== 'DELETE') {
            UI.showNotification('Account deletion cancelled', 'info');
            return;
        }

        const password = prompt('Enter your password to confirm:');
        
        if (!password) {
            UI.showNotification('Account deletion cancelled', 'info');
            return;
        }

        const finalConfirmation = confirm('Are you absolutely sure? This action cannot be undone.');
        
        if (!finalConfirmation) {
            return;
        }

        try {
            const response = await this.deleteAccount(password);
            
            if (response.success) {
                UI.showNotification('Account deleted successfully', 'success');
                // Clear authentication and redirect
                authManager.logout();
                window.location.reload();
            } else {
                UI.showNotification(response.message || 'Failed to delete account', 'error');
            }
        } catch (error) {
            console.error('Account deletion error:', error);
            UI.showNotification('Failed to delete account', 'error');
        }
    }

    // API methods
    async getShowcaseCards() {
        try {
            const response = await api.request('/user/showcase', { method: 'GET' });
            return response;
        } catch (error) {
            console.error('Get showcase error:', error);
            return { success: false, error: error.message };
        }
    }

    async updateShowcase(cardIds) {
        try {
            const response = await api.request('/user/showcase', { 
                method: 'POST',
                body: JSON.stringify({
                    unlockIds: cardIds
                })
            });
            return response;
        } catch (error) {
            console.error('Update showcase error:', error);
            return { success: false, error: error.message };
        }
    }

    async updateAccountInfo(data) {
        try {
            const response = await api.request('/user/profile', { 
                method: 'PUT',
                body: JSON.stringify(data)
            });
            return response;
        } catch (error) {
            console.error('Update profile error:', error);
            return { success: false, error: error.message };
        }
    }

    async changePassword(data) {
        try {
            const response = await api.request('/user/change-password', { 
                method: 'POST',
                body: JSON.stringify(data)
            });
            return response;
        } catch (error) {
            console.error('Change password error:', error);
            return { success: false, error: error.message };
        }
    }

    async updatePrivacySettings(data) {
        try {
            const response = await api.request('/user/privacy-settings', { 
                method: 'PUT',
                body: JSON.stringify(data)
            });
            return response;
        } catch (error) {
            console.error('Update privacy settings error:', error);
            return { success: false, error: error.message };
        }
    }

    async deleteAccount(password) {
        try {
            const response = await api.request('/user/account', { 
                method: 'DELETE',
                body: JSON.stringify({ password })
            });
            return response;
        } catch (error) {
            console.error('Delete account error:', error);
            return { success: false, error: error.message };
        }
    }
}

// Create global profile instance
const userProfile = new UserProfile();

// Export for use in other modules
window.UserProfile = UserProfile;
window.userProfile = userProfile;