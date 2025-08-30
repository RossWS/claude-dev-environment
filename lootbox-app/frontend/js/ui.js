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
    }

    initializeNavigation() {
        const loginBtn = document.getElementById('loginBtn');
        const registerBtn = document.getElementById('registerBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        const trophyBtn = document.getElementById('trophyBtn');
        const adminBtn = document.getElementById('adminBtn');

        if (loginBtn) {
            loginBtn.addEventListener('click', () => this.showScreen('login'));
        }

        if (registerBtn) {
            registerBtn.addEventListener('click', () => this.showScreen('register'));
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
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
        if (authManager.isAuthenticated) {
            this.showScreen('game');
            this.updateNavigation(true);
        } else {
            this.showScreen('login');
            this.updateNavigation(false);
        }
    }

    showScreen(screenName) {
        const screens = document.querySelectorAll('.screen');
        
        screens.forEach(screen => {
            screen.classList.add('hidden');
        });

        const targetScreen = document.getElementById(`${screenName}Screen`);
        if (targetScreen) {
            targetScreen.classList.remove('hidden');
            this.currentScreen = screenName;
            
            // Screen-specific initialization
            this.onScreenShow(screenName);
        }
    }

    onScreenShow(screenName) {
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
        }
    }

    showTrophyScreen() {
        if (!authManager.isAuthenticated) {
            this.showNotification('Please login to view your trophies', 'warning');
            return;
        }
        
        this.showScreen('trophy');
    }

    showAdminScreen() {
        if (!authManager.isAuthenticated) {
            this.showNotification('Please login to access admin panel', 'warning');
            return;
        }
        
        if (!authManager.hasPermission('admin')) {
            this.showNotification('Access denied: Admin permissions required', 'error');
            return;
        }
        
        // Call the admin panel's show method
        if (window.adminPanel) {
            window.adminPanel.showAdminScreen();
        }
    }

    onUserLogin(user) {
        this.updateNavigation(true);
        this.showScreen('game');
        this.showNotification(`Welcome back, ${user.username}!`, 'success');
    }

    onUserLogout() {
        this.updateNavigation(false);
        this.showScreen('login');
        this.showNotification('You have been logged out', 'info');
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
}

// Create global UI manager instance
const UI = new UIManager();

// Export for use in other modules
window.UIManager = UIManager;
window.UI = UI;