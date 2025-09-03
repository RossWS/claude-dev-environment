// UI management and helper functions
class UIManager {
    constructor() {
        this.currentScreen = 'login';
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.notificationContainer = document.getElementById('notificationContainer');
        this.modalOverlay = document.getElementById('modalOverlay');
        this.initializeUI();
    }

    initializeUI() {
        // Initialize navigation
        this.initializeNavigation();
        
        // Initialize modal
        this.initializeModal();
        
        // Initialize screen management
        this.initializeScreens();
        
        // Listen for auth events
        authManager.onLogin(user => this.onUserLogin(user));
        authManager.onLogout(() => this.onUserLogout());
        
        // Set initial screen based on auth state
        this.setInitialScreen();
        
        // Adjust card descriptions on window resize
        window.addEventListener('resize', Utils.debounce(() => {
            this.adjustCardDescriptions();
        }, 250));
        
        // Initialize card detail modal
        this.initializeCardDetailModal();
    }

    initializeNavigation() {
        const loginBtn = document.getElementById('loginBtn');
        const registerBtn = document.getElementById('registerBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        const trophyBtn = document.getElementById('trophyBtn');
        const adminBtn = document.getElementById('adminBtn');

        if (loginBtn) {
            loginBtn.addEventListener('click', () => {
                if (window.router) {
                    window.router.navigate('/login');
                }
            });
        }

        if (registerBtn) {
            registerBtn.addEventListener('click', () => {
                if (window.router) {
                    window.router.navigate('/register');
                }
            });
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }

        const profileBtn = document.getElementById('profileBtn');
        if (profileBtn) {
            profileBtn.addEventListener('click', () => this.showProfileScreen());
        }

        if (trophyBtn) {
            trophyBtn.addEventListener('click', () => this.showTrophyScreen());
        }

        if (adminBtn) {
            adminBtn.addEventListener('click', () => this.showAdminScreen());
        }
    }

    initializeModal() {
        const infoBtn = document.getElementById('infoBtn');
        const closeModal = document.getElementById('closeModal');

        if (infoBtn) {
            infoBtn.addEventListener('click', () => this.showModal());
        }

        if (closeModal) {
            closeModal.addEventListener('click', () => this.hideModal());
        }

        // Close modal on overlay click
        if (this.modalOverlay) {
            this.modalOverlay.addEventListener('click', (e) => {
                if (e.target === this.modalOverlay) {
                    this.hideModal();
                }
            });
        }
    }

    initializeScreens() {
        // Add event listener for trophy screen navigation
        const viewTrophiesBtn = document.getElementById('viewTrophiesBtn');
        if (viewTrophiesBtn) {
            viewTrophiesBtn.addEventListener('click', () => this.showTrophyScreen());
        }
    }

    setInitialScreen() {
        // Let the router handle initial screen - don't do anything here
        console.log('🔧 UI: Router will handle initial screen');
    }

    showScreen(screenName) {
        console.log('🔧 UI: showScreen called with:', screenName);
        
        const screens = document.querySelectorAll('.screen');
        console.log('🔧 UI: Found screens:', screens.length);
        
        // Clean reset of all screens - remove both classes and inline styles
        screens.forEach(screen => {
            screen.classList.add('hidden');
            screen.style.display = ''; // Clear any inline display styles
            console.log('🔧 UI: Hiding screen and clearing inline styles:', screen.id);
        });

        const targetScreen = document.getElementById(`${screenName}Screen`);
        console.log('🔧 UI: Target screen:', targetScreen?.id);
        
        if (targetScreen) {
            targetScreen.classList.remove('hidden');
            targetScreen.style.display = ''; // Clear any conflicting inline styles
            this.currentScreen = screenName;
            console.log('🔧 UI: Showing screen:', targetScreen.id);
            
            // Screen-specific initialization
            this.onScreenShow(screenName);
        } else {
            console.error('🔧 UI: Target screen not found:', `${screenName}Screen`);
        }
    }

    onScreenShow(screenName) {
        console.log('🔧 UI: onScreenShow called with:', screenName);
        
        switch (screenName) {
            case 'game':
                // Initialize discoverybox game if not already done
                if (!window.discoveryboxGame) {
                    window.discoveryboxGame = new DiscoveryBoxGame();
                }
                window.discoveryboxGame.createBackgroundParticles();
                window.discoveryboxGame.loadSpinStatus();
                break;
                
            case 'trophy':
                // Load trophies when trophy screen is shown
                trophyCabinet.loadTrophies(1);
                break;
                
            case 'profile':
                // Load profile data when profile screen is shown
                if (window.userProfile) {
                    window.userProfile.loadProfileData();
                }
                break;
                
            case 'admin':
                // Admin screen initialization handled separately
                console.log('🔧 UI: Admin screen initialized');
                break;
        }
    }

    showTrophyScreen() {
        console.log('🔧 UI: Navigating to trophies via router');
        if (window.router) {
            window.router.navigate('/trophies');
            
            // Ensure guest trophies are loaded after navigation
            setTimeout(() => {
                const isGuest = !Utils.storage.get('authToken');
                if (isGuest && window.trophyCabinet) {
                    window.trophyCabinet.loadGuestTrophies();
                }
            }, 100);
        }
    }

    showProfileScreen() {
        console.log('🔧 UI: Navigating to profile via router');
        if (window.router) {
            window.router.navigate('/profile');
        }
    }

    showAdminScreen() {
        console.log('🔧 UI: Navigating to admin via router');
        if (window.router) {
            window.router.navigate('/admin');
        }
    }

    onUserLogin(user) {
        this.updateNavigation(true);
        this.showNotification(`Welcome back, ${user.username}!`, 'success');
        
        // Navigate to game via router
        if (window.router) {
            window.router.navigate('/game');
        }
    }

    onUserLogout() {
        this.updateNavigation(false);
        this.showNotification('You have been logged out', 'info');
        
        // Navigate to login via router
        if (window.router) {
            window.router.navigate('/login');
        }
    }

    async handleLogout() {
        try {
            await authManager.logout();
        } catch (error) {
            console.error('Logout error:', error);
            this.showNotification('Error during logout', 'error');
        }
    }

    updateNavigation(isAuthenticated) {
        const loginBtn = document.getElementById('loginBtn');
        const registerBtn = document.getElementById('registerBtn');
        const userMenu = document.getElementById('userMenu');
        const navUsername = document.getElementById('navUsername');
        const adminBtn = document.getElementById('adminBtn');

        if (isAuthenticated) {
            if (loginBtn) loginBtn.classList.add('hidden');
            if (registerBtn) registerBtn.classList.add('hidden');
            if (userMenu) userMenu.classList.remove('hidden');
            
            if (navUsername && authManager.currentUser) {
                navUsername.textContent = authManager.getDisplayName();
            }

            // Show/hide admin button based on permissions
            if (adminBtn) {
                if (authManager.hasPermission('admin')) {
                    adminBtn.classList.remove('hidden');
                    document.body.classList.add('is-admin');
                } else {
                    adminBtn.classList.add('hidden');
                    document.body.classList.remove('is-admin');
                }
            }
        } else {
            if (loginBtn) loginBtn.classList.remove('hidden');
            if (registerBtn) registerBtn.classList.remove('hidden');
            if (userMenu) userMenu.classList.add('hidden');
            if (adminBtn) adminBtn.classList.add('hidden');
            document.body.classList.remove('is-admin');
        }
    }

    showLoading(show = true) {
        if (this.loadingOverlay) {
            if (show) {
                this.loadingOverlay.classList.remove('hidden');
            } else {
                this.loadingOverlay.classList.add('hidden');
            }
        }
    }

    showNotification(message, type = 'info', duration = 5000) {
        if (!this.notificationContainer) return;

        const notification = document.createElement('div');
        notification.className = `notification ${type} notification-enter`;
        notification.innerHTML = `
            <div class=\"notification-content\">
                ${this.getNotificationIcon(type)}
                <span>${Utils.sanitizeHtml(message)}</span>
            </div>
            <button class=\"notification-close\" onclick=\"this.parentElement.remove()\">×</button>
        `;

        this.notificationContainer.appendChild(notification);

        // Remove enter animation class after animation completes
        setTimeout(() => {
            notification.classList.remove('notification-enter');
        }, 300);

        // Auto-remove notification
        if (duration > 0) {
            setTimeout(() => {
                this.removeNotification(notification);
            }, duration);
        }

        return notification;
    }

    removeNotification(notification) {
        if (notification && notification.parentElement) {
            notification.classList.add('notification-exit');
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.parentElement.removeChild(notification);
                }
            }, 300);
        }
    }

    getNotificationIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        return icons[type] || icons.info;
    }

    showModal() {
        if (this.modalOverlay) {
            this.modalOverlay.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }
    }

    hideModal() {
        if (this.modalOverlay) {
            this.modalOverlay.classList.add('hidden');
            document.body.style.overflow = '';
        }
    }

    // Utility methods for form handling
    getFormData(formElement) {
        const formData = new FormData(formElement);
        const data = {};
        
        for (const [key, value] of formData.entries()) {
            data[key] = value;
        }
        
        return data;
    }

    clearForm(formElement) {
        if (formElement) {
            formElement.reset();
            
            // Clear any error states
            const errorElements = formElement.querySelectorAll('.error');
            errorElements.forEach(el => el.classList.remove('error'));
        }
    }

    setFieldError(fieldElement, message) {
        if (!fieldElement) return;
        
        fieldElement.classList.add('error');
        
        // Remove existing error message
        const existingError = fieldElement.parentElement.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }
        
        // Add new error message
        if (message) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'field-error';
            errorDiv.textContent = message;
            fieldElement.parentElement.appendChild(errorDiv);
        }
    }

    clearFieldError(fieldElement) {
        if (!fieldElement) return;
        
        fieldElement.classList.remove('error');
        
        const errorElement = fieldElement.parentElement.querySelector('.field-error');
        if (errorElement) {
            errorElement.remove();
        }
    }

    // Responsive utilities
    isMobile() {
        return window.innerWidth <= 768;
    }

    isTablet() {
        return window.innerWidth > 768 && window.innerWidth <= 1024;
    }

    isDesktop() {
        return window.innerWidth > 1024;
    }

    // Animation helpers
    fadeIn(element, duration = 300) {
        if (!element) return Promise.resolve();
        
        return new Promise(resolve => {
            element.style.opacity = '0';
            element.style.display = 'block';
            
            let start = null;
            function animate(timestamp) {
                if (!start) start = timestamp;
                const progress = timestamp - start;
                const opacity = Math.min(progress / duration, 1);
                
                element.style.opacity = opacity;
                
                if (progress < duration) {
                    requestAnimationFrame(animate);
                } else {
                    resolve();
                }
            }
            
            requestAnimationFrame(animate);
        });
    }

    fadeOut(element, duration = 300) {
        if (!element) return Promise.resolve();
        
        return new Promise(resolve => {
            const startOpacity = parseFloat(element.style.opacity) || 1;
            
            let start = null;
            function animate(timestamp) {
                if (!start) start = timestamp;
                const progress = timestamp - start;
                const opacity = Math.max(startOpacity - (progress / duration), 0);
                
                element.style.opacity = opacity;
                
                if (progress < duration) {
                    requestAnimationFrame(animate);
                } else {
                    element.style.display = 'none';
                    resolve();
                }
            }
            
            requestAnimationFrame(animate);
        });
    }

    // Dynamic card description adjustment
    adjustCardDescriptions() {
        const cards = document.querySelectorAll('.collectible-card');
        
        cards.forEach(card => {
            const description = card.querySelector('.collectible-description-text');
            if (!description) return;
            
            const descriptionContainer = card.querySelector('.collectible-card-description');
            if (!descriptionContainer) return;
            
            // Reset any previous adjustments
            description.style.webkitLineClamp = 'unset';
            description.style.maxHeight = 'none';
            
            // Calculate available space
            const containerHeight = descriptionContainer.offsetHeight;
            const containerPadding = parseInt(getComputedStyle(descriptionContainer).paddingTop) + 
                                   parseInt(getComputedStyle(descriptionContainer).paddingBottom);
            const availableHeight = containerHeight - containerPadding;
            
            // Get line height
            const computedStyle = getComputedStyle(description);
            const lineHeight = parseFloat(computedStyle.lineHeight);
            
            if (isNaN(lineHeight)) return;
            
            // Calculate maximum lines that fit
            const maxLines = Math.floor(availableHeight / lineHeight);
            const minLines = card.classList.contains('mini') ? 2 : card.classList.contains('small') ? 3 : 4;
            
            // Apply dynamic line clamp
            const lines = Math.max(minLines, Math.min(maxLines, 8)); // Cap at 8 lines max
            description.style.webkitLineClamp = lines.toString();
            description.style.display = '-webkit-box';
            description.style.webkitBoxOrient = 'vertical';
            description.style.overflow = 'hidden';
        });
    }

    // Card Detail Modal System
    initializeCardDetailModal() {
        this.cardDetailModal = document.getElementById('cardDetailModal');
        this.closeCardModalBtn = document.getElementById('closeCardModal');
        
        if (this.closeCardModalBtn) {
            this.closeCardModalBtn.addEventListener('click', () => {
                this.hideCardDetailModal();
            });
        }
        
        if (this.cardDetailModal) {
            this.cardDetailModal.addEventListener('click', (e) => {
                if (e.target === this.cardDetailModal) {
                    this.hideCardDetailModal();
                }
            });
        }
        
        // Add keyboard listener for escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.cardDetailModal.classList.contains('hidden')) {
                this.hideCardDetailModal();
            }
        });
    }
    
    showCardDetailModal(cardData) {
        if (!this.cardDetailModal) return;
        
        this.populateModalCard(cardData);
        this.cardDetailModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; // Prevent background scroll
    }
    
    hideCardDetailModal() {
        if (!this.cardDetailModal) return;
        
        this.cardDetailModal.classList.add('hidden');
        document.body.style.overflow = 'auto'; // Restore scroll
    }
    
    populateModalCard(cardData) {
        const modalCard = document.getElementById('modalCard');
        const rarity = Utils.getRarityTier(cardData.quality_score);
        const contentEmoji = cardData.emoji || (cardData.type === 'series' ? '📺' : '🎬');
        const contentType = cardData.type === 'series' ? '📺 Series' : '🎬 Movie';
        const durationLabel = cardData.type === 'series' ? 'Seasons' : 'Runtime';
        const durationValue = cardData.type === 'series' ? (cardData.seasons || 'N/A') : cardData.duration;
        
        // Format year for series
        let yearDisplay = cardData.year;
        if (cardData.type === 'series' && cardData.end_year && cardData.end_year !== cardData.year) {
            yearDisplay = `${cardData.year}-${cardData.end_year}`;
        }
        
        // Clear previous classes and add new rarity
        modalCard.className = 'collectible-card';
        modalCard.classList.add(cardData.rarity_tier || rarity.tier);
        modalCard.setAttribute('data-type', cardData.type);
        
        // Populate card elements
        document.getElementById('modalCardTitle').textContent = cardData.title;
        document.getElementById('modalCardCost').textContent = cardData.quality_score;
        document.getElementById('modalCardType').textContent = contentType;
        document.getElementById('modalRarityGem').textContent = rarity.icon;
        document.getElementById('modalCardIcon').textContent = contentEmoji;
        
        // Stats
        document.getElementById('modalQualityScore').textContent = cardData.quality_score;
        document.getElementById('modalCriticsScore').textContent = `${cardData.critics_score || 'N/A'}%`;
        document.getElementById('modalAudienceScore').textContent = `${cardData.audience_score || 'N/A'}%`;
        document.getElementById('modalDurationLabel').textContent = durationLabel;
        document.getElementById('modalDuration').textContent = durationValue;
        
        // Description (full text, no truncation)
        document.getElementById('modalDescription').textContent = cardData.description;
        
        // Footer
        document.getElementById('modalCardYear').textContent = yearDisplay;
        document.getElementById('modalCardRarity').textContent = (cardData.rarity_tier || rarity.tier).charAt(0).toUpperCase() + (cardData.rarity_tier || rarity.tier).slice(1);
        
        // Show unlock time for trophy cards
        const unlockTimeElement = document.getElementById('modalUnlockTime');
        if (cardData.unlocked_at) {
            const unlockedDate = Utils.formatRelativeTime(cardData.unlocked_at);
            document.getElementById('modalUnlockText').textContent = unlockedDate;
            unlockTimeElement.classList.remove('hidden');
        } else {
            unlockTimeElement.classList.add('hidden');
        }
    }
}

// Create global UI manager instance
const UI = new UIManager();

// Export for use in other modules
window.UIManager = UIManager;
window.UI = UI;