// Profile Editor Component - handles profile information display and editing
class ProfileEditor extends BaseComponent {
    constructor(selector, options = {}) {
        super(selector, options);
        this.profileData = null;
        this.isDirty = false;
        this.currentTab = 'overview';
    }

    getDefaultOptions() {
        return {
            enableTabNavigation: true,
            autoSave: false,
            confirmBeforeLeave: true
        };
    }

    setupEventListeners() {
        super.setupEventListeners();
        
        // Tab navigation
        if (this.options.enableTabNavigation) {
            this.$$('.profile-nav-btn').forEach(btn => {
                this.addEventListener(btn, 'click', (e) => {
                    const tabName = e.target.dataset.tab;
                    this.switchTab(tabName);
                });
            });
        }

        // Account settings form
        const accountForm = this.$('#accountSettingsForm');
        if (accountForm) {
            this.addEventListener(accountForm, 'submit', this.saveAccountSettings);
            this.addEventListener(accountForm, 'input', this.onFormChange);
        }

        // Password change form
        const passwordForm = this.$('#passwordChangeForm');
        if (passwordForm) {
            this.addEventListener(passwordForm, 'submit', this.changePassword);
        }

        // Delete account button
        const deleteBtn = this.$('#deleteAccountBtn');
        if (deleteBtn) {
            this.addEventListener(deleteBtn, 'click', this.deleteAccount);
        }

        // Privacy settings
        this.$$('.privacy-setting').forEach(checkbox => {
            this.addEventListener(checkbox, 'change', this.updatePrivacySetting);
        });
    }

    async render() {
        await this.loadProfileData();
        this.renderProfileOverview();
        this.renderAccountSettings();
        this.switchTab(this.currentTab);
    }

    async loadProfileData() {
        try {
            const response = await apiClient.get('/user/profile');
            
            if (response.success) {
                this.profileData = response.data;
            }
        } catch (error) {
            this.handleError(error, 'loading profile data');
        }
    }

    renderProfileOverview() {
        if (!this.profileData) return;

        const elements = {
            avatarInitials: this.$('#avatarInitials'),
            profileUsername: this.$('#profileUsername'),
            profileMemberSince: this.$('#profileMemberSince'),
            totalTrophiesCount: this.$('#totalTrophiesCount'),
            totalSpinsCount: this.$('#totalSpinsCount'),
            rareItemsCount: this.$('#rareItemsCount'),
            collectionRate: this.$('#collectionRate')
        };

        // Update avatar
        if (elements.avatarInitials) {
            elements.avatarInitials.textContent = this.profileData.username.charAt(0).toUpperCase();
        }

        // Update username
        if (elements.profileUsername) {
            elements.profileUsername.textContent = this.profileData.username;
        }

        // Update member since
        if (elements.profileMemberSince && this.profileData.created_at) {
            const memberSince = Utils.formatDate(this.profileData.created_at);
            elements.profileMemberSince.textContent = `Member since ${memberSince}`;
        }

        // Update stats
        if (elements.totalTrophiesCount) {
            elements.totalTrophiesCount.textContent = this.profileData.stats?.total_trophies || 0;
        }

        if (elements.totalSpinsCount) {
            elements.totalSpinsCount.textContent = this.profileData.stats?.total_spins || 0;
        }

        if (elements.rareItemsCount) {
            elements.rareItemsCount.textContent = this.profileData.stats?.rare_items || 0;
        }

        if (elements.collectionRate) {
            const rate = this.profileData.stats?.collection_rate || 0;
            elements.collectionRate.textContent = `${rate}%`;
        }

        // Render recent activity
        this.renderRecentActivity();
    }

    renderRecentActivity() {
        const container = this.$('#recentActivity');
        if (!container) return;

        const activities = this.profileData.recent_activity || [];
        
        if (activities.length === 0) {
            container.innerHTML = '<div class="no-activity">No recent activity</div>';
            return;
        }

        const activitiesHTML = activities.map(activity => {
            const timeAgo = Utils.formatTimeAgo(new Date(activity.created_at));
            const icon = this.getActivityIcon(activity.type);
            
            return `
                <div class="activity-item">
                    <div class="activity-icon">${icon}</div>
                    <div class="activity-content">
                        <div class="activity-text">${Utils.escapeHtml(activity.description)}</div>
                        <div class="activity-time">${timeAgo}</div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = activitiesHTML;
    }

    renderAccountSettings() {
        if (!this.profileData) return;

        // Update form fields
        const usernameField = this.$('#settingsUsername');
        const emailField = this.$('#settingsEmail');
        const timezoneField = this.$('#settingsTimezone');
        
        if (usernameField) {
            usernameField.value = this.profileData.username || '';
        }
        
        if (emailField) {
            emailField.value = this.profileData.email || '';
        }

        // Populate timezone select
        if (timezoneField) {
            this.populateTimezoneSelect(timezoneField);
            timezoneField.value = this.profileData.timezone || '';
        }

        // Update privacy settings
        const privacySettings = {
            profilePublic: this.profileData.settings?.profile_public ?? true,
            showStats: this.profileData.settings?.show_stats ?? true,
            showActivity: this.profileData.settings?.show_activity ?? true
        };

        Object.entries(privacySettings).forEach(([key, value]) => {
            const checkbox = this.$(`#${key}`);
            if (checkbox) {
                checkbox.checked = value;
            }
        });
    }

    populateTimezoneSelect(selectElement) {
        if (!selectElement) return;

        // Clear existing options except the first one (Auto-detect)
        const firstOption = selectElement.firstElementChild;
        selectElement.innerHTML = '';
        selectElement.appendChild(firstOption);

        // Add common timezones
        const timezones = Utils.getCommonTimezones();
        const currentTimezone = Utils.getTimezone();
        
        // Add current detected timezone if not in common list
        if (!timezones.find(tz => tz.value === currentTimezone)) {
            const option = document.createElement('option');
            option.value = currentTimezone;
            option.textContent = `${currentTimezone} (Current Detected)`;
            selectElement.appendChild(option);
        }

        // Add all common timezones
        timezones.forEach(timezone => {
            const option = document.createElement('option');
            option.value = timezone.value;
            option.textContent = timezone.label;
            selectElement.appendChild(option);
        });
    }

    switchTab(tabName) {
        this.currentTab = tabName;
        
        // Update navigation buttons
        this.$$('.profile-nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Update tab content
        this.$$('.profile-tab').forEach(tab => {
            tab.classList.toggle('active', tab.id === `profile${Utils.capitalizeFirst(tabName)}Tab`);
        });

        // Load tab-specific content
        this.onTabSwitch(tabName);
    }

    onTabSwitch(tabName) {
        // Override in subclasses or handle specific tab logic
        switch (tabName) {
            case 'overview':
                this.renderProfileOverview();
                break;
            case 'settings':
                this.renderAccountSettings();
                break;
        }
    }

    onFormChange() {
        this.isDirty = true;
        this.updateSaveButtonState();
    }

    updateSaveButtonState() {
        const saveBtn = this.$('#saveAccountBtn');
        if (saveBtn) {
            saveBtn.disabled = !this.isDirty;
            saveBtn.textContent = this.isDirty ? 'Save Changes' : 'No Changes';
        }
    }

    async saveAccountSettings(e) {
        e.preventDefault();
        
        try {
            const formData = new FormData(e.target);
            const accountData = {
                username: formData.get('username'),
                email: formData.get('email'),
                timezone: formData.get('timezone') || null
            };

            const response = await apiClient.put('/user/profile', accountData);
            
            if (response.success) {
                this.profileData = { ...this.profileData, ...accountData };
                this.isDirty = false;
                this.updateSaveButtonState();
                this.renderProfileOverview(); // Update displayed username
                
                // Update user's timezone preference in local storage
                if (accountData.timezone) {
                    Utils.setUserTimezone(accountData.timezone);
                } else {
                    // Clear saved timezone to use auto-detection
                    Utils.storage.remove('userTimezone');
                }
                
                // Trigger timezone change event to refresh all time displays
                window.dispatchEvent(new CustomEvent('timezoneChanged'));
                
                Utils.showNotification('Account settings saved successfully', 'success');
            }
        } catch (error) {
            this.handleError(error, 'saving account settings');
        }
    }

    async changePassword(e) {
        e.preventDefault();
        
        try {
            const formData = new FormData(e.target);
            const currentPassword = formData.get('currentPassword');
            const newPassword = formData.get('newPassword');
            const confirmPassword = formData.get('confirmPassword');

            // Validate passwords match
            if (newPassword !== confirmPassword) {
                Utils.showNotification('New passwords do not match', 'error');
                return;
            }

            // Validate password strength
            if (newPassword.length < 8) {
                Utils.showNotification('Password must be at least 8 characters long', 'error');
                return;
            }

            const response = await apiClient.put('/user/password', {
                currentPassword,
                newPassword
            });
            
            if (response.success) {
                e.target.reset();
                Utils.showNotification('Password changed successfully', 'success');
            }
        } catch (error) {
            this.handleError(error, 'changing password');
        }
    }

    async updatePrivacySetting(e) {
        const setting = e.target.name;
        const value = e.target.checked;
        
        try {
            const response = await apiClient.put('/user/settings', {
                [setting]: value
            });
            
            if (response.success) {
                // Update local data
                if (!this.profileData.settings) {
                    this.profileData.settings = {};
                }
                this.profileData.settings[setting] = value;
                
                Utils.showNotification('Privacy setting updated', 'success');
            }
        } catch (error) {
            this.handleError(error, 'updating privacy setting');
            // Revert checkbox state
            e.target.checked = !value;
        }
    }

    async deleteAccount() {
        const confirmation = prompt(
            'Type "DELETE" to confirm account deletion. This action cannot be undone.'
        );
        
        if (confirmation !== 'DELETE') {
            Utils.showNotification('Account deletion cancelled', 'info');
            return;
        }

        try {
            const response = await apiClient.delete('/user/account');
            
            if (response.success) {
                Utils.showNotification('Account deleted successfully', 'success');
                
                // Redirect to login or home page
                setTimeout(() => {
                    if (window.authManager) {
                        window.authManager.logout();
                    }
                    if (window.router) {
                        window.router.navigate('/');
                    }
                }, 2000);
            }
        } catch (error) {
            this.handleError(error, 'deleting account');
        }
    }

    getActivityIcon(type) {
        const icons = {
            'spin': '🎰',
            'trophy': '🏆',
            'achievement': '⭐',
            'collection': '📦',
            'login': '🚪',
            'profile_update': '👤'
        };
        return icons[type] || '📝';
    }

    // Public API methods
    refreshProfile() {
        return this.render();
    }

    getCurrentTab() {
        return this.currentTab;
    }

    updateProfileData(newData) {
        this.profileData = { ...this.profileData, ...newData };
        this.renderProfileOverview();
        this.renderAccountSettings();
    }

    onError(error, context) {
        super.onError(error, context);
        Utils.showNotification(`Error ${context}: ${error.message}`, 'error');
    }
}