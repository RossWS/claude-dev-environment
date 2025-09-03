// Refactored Main Application - Integrates new component architecture
class RefactoredApp {
    constructor() {
        this.isInitialized = false;
        this.components = new Map();
        this.currentScreen = 'login';
        
        // Initialize core systems
        this.initializeCoreServices();
        
        // Bind methods
        this.handleStateChange = this.handleStateChange.bind(this);
        this.handleScreenChange = this.handleScreenChange.bind(this);
        this.handleError = this.handleError.bind(this);
        
        // Initialize when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    initializeCoreServices() {
        // State management
        if (window.stateManager) {
            window.stateManager.subscribe('ui.currentScreen', this.handleScreenChange);
            window.stateManager.subscribe('*', this.handleStateChange, { deep: true });
        }

        // Event bus subscriptions - check if EVENTS is defined
        if (window.eventBus && window.EVENTS) {
            window.eventBus.on(window.EVENTS.SCREEN_CHANGE, this.handleScreenChange);
            window.eventBus.on(window.EVENTS.USER_LOGIN, this.onUserLogin.bind(this));
            window.eventBus.on(window.EVENTS.USER_LOGOUT, this.onUserLogout.bind(this));
        } else if (window.eventBus) {
            // Use string literals as fallback if EVENTS constants aren't loaded yet
            window.eventBus.on('ui:screen:change', this.handleScreenChange);
            window.eventBus.on('user:login', this.onUserLogin.bind(this));
            window.eventBus.on('user:logout', this.onUserLogout.bind(this));
        }

        // Global error handling
        window.addEventListener('error', this.handleError);
        window.addEventListener('unhandledrejection', this.handleError);
    }

    async init() {
        if (this.isInitialized) {
            console.warn('RefactoredApp already initialized');
            return;
        }

        try {
            console.log('🚀 Initializing Refactored App...');
            
            // Initialize component registry
            if (window.componentRegistry) {
                await window.componentRegistry.initialize();
            }

            // Initialize screen-specific components
            await this.initializeScreenComponents();

            // Setup navigation
            this.setupNavigation();

            // Setup keyboard shortcuts
            this.setupKeyboardShortcuts();

            // Restore state from storage
            this.restoreState();

            // Set initial screen
            const initialScreen = this.determineInitialScreen();
            await this.showScreen(initialScreen);

            this.isInitialized = true;
            console.log('✅ Refactored App initialized');

            // Emit initialization event
            if (window.eventBus) {
                window.eventBus.emit('app:initialized');
            }

        } catch (error) {
            console.error('❌ App initialization failed:', error);
            this.handleError(error);
        }
    }

    async initializeScreenComponents() {
        const registry = window.componentRegistry;
        if (!registry) return;

        // Initialize components based on current screen
        const componentsToInit = this.getScreenComponents();
        
        for (const componentName of componentsToInit) {
            try {
                if (registry.has(componentName)) {
                    const selector = registry.findComponentSelector(componentName);
                    if (selector) {
                        const component = registry.create(componentName, selector);
                        this.components.set(componentName, component);
                    }
                }
            } catch (error) {
                console.error(`Failed to initialize component ${componentName}:`, error);
            }
        }
    }

    getScreenComponents() {
        // Return components needed for current screen
        const screenComponents = {
            login: ['authManager', 'onboardingManager'],
            register: ['authManager', 'onboardingManager'],
            game: ['discoveryboxGame', 'guestSession'],
            profile: ['profileEditor', 'showcaseManager', 'statisticsDisplay'],
            trophy: ['trophyGrid', 'trophyFilters', 'rarityManager', 'exportManager'],
            admin: ['adminDashboard', 'contentManager', 'userManagement', 'systemSettings']
        };

        return screenComponents[this.currentScreen] || [];
    }

    setupNavigation() {
        // Navigation button handlers
        document.querySelectorAll('[data-screen]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const screen = e.target.dataset.screen;
                if (screen) {
                    this.showScreen(screen);
                }
            });
        });

        // Back button handling
        window.addEventListener('popstate', (e) => {
            if (e.state && e.state.screen) {
                this.showScreen(e.state.screen, false);
            }
        });
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Don't interfere with form inputs
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            const shortcuts = {
                'KeyG': () => this.showScreen('game'),         // G - Game
                'KeyP': () => this.showScreen('profile'),      // P - Profile  
                'KeyT': () => this.showScreen('trophy'),       // T - Trophies
                'KeyA': () => this.showScreen('admin'),        // A - Admin (if allowed)
                'KeyL': () => this.logout(),                   // L - Logout
                'Escape': () => this.closeModals()            // Escape - Close modals
            };

            if (e.code in shortcuts && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                shortcuts[e.code]();
            }
        });
    }

    async showScreen(screenName, updateHistory = true) {
        try {
            console.log(`🔄 Switching to screen: ${screenName}`);
            
            // Validate screen access
            if (!this.canAccessScreen(screenName)) {
                console.warn(`Access denied to screen: ${screenName}`);
                return;
            }

            // Hide current screen
            this.hideCurrentScreen();

            // Update state
            this.currentScreen = screenName;
            
            if (window.stateManager) {
                window.stateManager.setState('ui.currentScreen', screenName);
            }

            // Update navigation
            this.updateNavigation(screenName);

            // Load screen-specific components
            await this.loadScreenComponents(screenName);

            // Show new screen
            this.showScreenElement(screenName);

            // Update browser history
            if (updateHistory && window.history) {
                window.history.pushState({ screen: screenName }, '', `#${screenName}`);
            }

            // Emit screen change event
            if (window.eventBus) {
                const eventName = window.EVENTS ? window.EVENTS.SCREEN_CHANGE : 'ui:screen:change';
                window.eventBus.emit(eventName, screenName);
            }

            console.log(`✅ Screen switched to: ${screenName}`);

        } catch (error) {
            console.error(`Failed to show screen ${screenName}:`, error);
            this.handleError(error);
        }
    }

    canAccessScreen(screenName) {
        const isAuthenticated = window.stateManager?.getState('user.isAuthenticated') || false;
        const userRole = window.stateManager?.getState('user.profile.role') || 'guest';

        // Public screens
        if (['login', 'register'].includes(screenName)) {
            return true;
        }

        // Protected screens require authentication
        if (!isAuthenticated && ['profile', 'trophy', 'admin'].includes(screenName)) {
            return false;
        }

        // Admin screen requires admin role
        if (screenName === 'admin' && userRole !== 'admin') {
            return false;
        }

        return true;
    }

    hideCurrentScreen() {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });

        // Pause/cleanup current screen components
        this.components.forEach((component, name) => {
            if (typeof component.pause === 'function') {
                component.pause();
            }
        });
    }

    showScreenElement(screenName) {
        const screenElement = document.getElementById(`${screenName}Screen`);
        
        if (screenElement) {
            screenElement.classList.add('active');
            
            // Focus management
            const firstFocusable = screenElement.querySelector(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            if (firstFocusable) {
                firstFocusable.focus();
            }
        } else {
            console.error(`Screen element not found: ${screenName}Screen`);
        }
    }

    async loadScreenComponents(screenName) {
        const requiredComponents = this.getScreenComponents();
        const registry = window.componentRegistry;
        
        if (!registry) return;

        // Clean up previous screen components
        this.cleanupUnusedComponents(requiredComponents);

        // Load new components
        for (const componentName of requiredComponents) {
            if (!this.components.has(componentName) && registry.has(componentName)) {
                try {
                    const selector = registry.findComponentSelector(componentName);
                    if (selector) {
                        const component = registry.create(componentName, selector);
                        this.components.set(componentName, component);
                        
                        // Initialize component if needed
                        if (typeof component.render === 'function') {
                            await component.render();
                        }
                    }
                } catch (error) {
                    console.error(`Failed to load component ${componentName}:`, error);
                }
            }
        }

        // Resume active components
        requiredComponents.forEach(componentName => {
            const component = this.components.get(componentName);
            if (component && typeof component.resume === 'function') {
                component.resume();
            }
        });
    }

    cleanupUnusedComponents(activeComponents) {
        this.components.forEach((component, name) => {
            if (!activeComponents.includes(name)) {
                if (typeof component.pause === 'function') {
                    component.pause();
                }
            }
        });
    }

    updateNavigation(currentScreen) {
        // Update nav button states
        document.querySelectorAll('.nav-btn[data-screen]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.screen === currentScreen);
        });

        // Show/hide user menu based on auth state
        const isAuthenticated = window.stateManager?.getState('user.isAuthenticated') || false;
        const userMenu = document.getElementById('userMenu');
        const guestButtons = document.querySelectorAll('#loginBtn, #registerBtn');

        if (userMenu) {
            userMenu.classList.toggle('hidden', !isAuthenticated);
        }

        guestButtons.forEach(btn => {
            btn.classList.toggle('hidden', isAuthenticated);
        });

        // Update admin button visibility
        const userRole = window.stateManager?.getState('user.profile.role') || 'guest';
        const adminBtn = document.getElementById('adminBtn');
        if (adminBtn) {
            adminBtn.classList.toggle('hidden', userRole !== 'admin');
        }
    }

    determineInitialScreen() {
        // Check URL hash
        const hash = window.location.hash.substring(1);
        if (hash && this.canAccessScreen(hash)) {
            return hash;
        }

        // Check authentication state
        const isAuthenticated = window.stateManager?.getState('user.isAuthenticated') || false;
        
        if (isAuthenticated) {
            return 'game'; // Default authenticated screen
        } else {
            return 'login'; // Default unauthenticated screen
        }
    }

    restoreState() {
        if (window.stateManager) {
            window.stateManager.restore();
        }
    }

    onUserLogin(userData) {
        console.log('👤 User logged in:', userData);
        
        // Update state
        if (window.stateManager) {
            window.stateManager.dispatch({
                type: 'USER_LOGIN',
                payload: userData
            });
        }

        // Navigate to game screen
        this.showScreen('game');

        // Initialize user-specific components
        this.initializeUserComponents();
    }

    onUserLogout() {
        console.log('👤 User logged out');
        
        // Update state
        if (window.stateManager) {
            window.stateManager.dispatch({
                type: 'USER_LOGOUT'
            });
        }

        // Clean up user-specific components
        this.cleanupUserComponents();

        // Navigate to login screen
        this.showScreen('login');
    }

    async initializeUserComponents() {
        // Load user-specific data and components
        const userComponents = ['profileEditor', 'showcaseManager', 'trophyGrid'];
        
        for (const componentName of userComponents) {
            const component = this.components.get(componentName);
            if (component && typeof component.loadUserData === 'function') {
                try {
                    await component.loadUserData();
                } catch (error) {
                    console.error(`Failed to load user data for ${componentName}:`, error);
                }
            }
        }
    }

    cleanupUserComponents() {
        // Clear user-specific data from components
        this.components.forEach((component, name) => {
            if (typeof component.clearUserData === 'function') {
                component.clearUserData();
            }
        });
    }

    logout() {
        if (window.authManager && typeof window.authManager.logout === 'function') {
            window.authManager.logout();
        }
    }

    closeModals() {
        // Close all open modals
        document.querySelectorAll('.modal.active').forEach(modal => {
            modal.classList.remove('active');
        });

        // Clear modal state
        if (window.stateManager) {
            window.stateManager.setState('ui.modals.open', []);
        }
    }

    // State change handlers
    handleStateChange(value, previousValue, path) {
        // React to state changes
        if (path.startsWith('user.')) {
            this.updateNavigation(this.currentScreen);
        }
    }

    handleScreenChange(newScreen, previousScreen) {
        if (newScreen !== this.currentScreen) {
            this.showScreen(newScreen);
        }
    }

    handleError(error) {
        console.error('Application Error:', error);
        
        // Show user-friendly error message
        if (window.UI && window.UI.showNotification) {
            let message = 'An unexpected error occurred';
            
            if (error.message) {
                message = error.message;
            } else if (typeof error === 'string') {
                message = error;
            }
            
            window.UI.showNotification(message, 'error');
        }

        // Emit error event
        if (window.eventBus) {
            window.eventBus.emit('app:error', error);
        }
    }

    // Public API methods
    getComponent(name) {
        return this.components.get(name);
    }

    getCurrentScreen() {
        return this.currentScreen;
    }

    isScreenActive(screenName) {
        return this.currentScreen === screenName;
    }

    // Debug methods
    getDebugInfo() {
        return {
            initialized: this.isInitialized,
            currentScreen: this.currentScreen,
            components: Array.from(this.components.keys()),
            state: window.stateManager?.debug(),
            events: window.eventBus?.getStats()
        };
    }

    // Cleanup
    destroy() {
        // Remove event listeners
        window.removeEventListener('error', this.handleError);
        window.removeEventListener('unhandledrejection', this.handleError);

        // Destroy all components
        this.components.forEach((component, name) => {
            if (typeof component.destroy === 'function') {
                component.destroy();
            }
        });

        // Clear maps
        this.components.clear();

        this.isInitialized = false;
    }
}

// Initialize app when ready - but only if we want to use the refactored version
// For now, let's not auto-initialize to avoid conflicts with the original app
// window.refactoredApp = new RefactoredApp();

// Instead, make it available for manual initialization
window.RefactoredApp = RefactoredApp;

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RefactoredApp;
}