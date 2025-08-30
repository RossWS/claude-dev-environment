// Main application initialization
class LootBoxApp {
    constructor() {
        this.isInitialized = false;
        this.components = {};
        
        // Bind event handlers
        this.handleApiError = this.handleApiError.bind(this);
        this.handleApiLoading = this.handleApiLoading.bind(this);
        
        // Initialize when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    async init() {
        if (this.isInitialized) return;
        
        try {
            console.log('🚀 Initializing Loot Box App...');
            
            // Set up global error handling
            this.setupErrorHandling();
            
            // Set up API event listeners
            this.setupApiListeners();
            
            // Initialize core components
            await this.initializeComponents();
            
            // Set up keyboard shortcuts
            this.setupKeyboardShortcuts();
            
            // Set up offline detection
            this.setupOfflineDetection();
            
            // Mark as initialized
            this.isInitialized = true;
            
            console.log('✅ Loot Box App initialized successfully');
            
            // Dispatch app ready event
            document.dispatchEvent(new CustomEvent('appReady', {
                detail: { app: this }
            }));
            
        } catch (error) {
            console.error('❌ Failed to initialize app:', error);
            UI.showNotification('Failed to initialize application', 'error');
        }
    }

    setupErrorHandling() {
        // Global error handler for uncaught errors
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            
            // Don't show UI errors for script loading failures
            if (event.error && !event.filename?.includes('extensions')) {
                UI.showNotification('An unexpected error occurred', 'error');
            }
        });

        // Global handler for unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            
            // Prevent the default behavior (logging to console)
            event.preventDefault();
            
            // Show user-friendly error
            UI.showNotification('An unexpected error occurred', 'error');
        });
    }

    setupApiListeners() {
        // Listen for API loading events
        document.addEventListener('apiLoadingStart', this.handleApiLoading);
        document.addEventListener('apiLoadingEnd', this.handleApiLoading);
        
        // Listen for API errors
        document.addEventListener('apiError', this.handleApiError);
        
        // Listen for successful API calls
        document.addEventListener('apiSuccess', (event) => {
            const { endpoint } = event.detail;
            console.log('API Success:', endpoint);
        });
    }

    handleApiLoading(event) {
        const { count } = event.detail;
        const isLoading = count > 0;
        
        // Show/hide global loading indicator based on active requests
        if (event.type === 'apiLoadingStart' && count === 1) {
            // First request started
            document.body.classList.add('api-loading');
        } else if (event.type === 'apiLoadingEnd' && count === 0) {
            // All requests completed
            document.body.classList.remove('api-loading');
        }
    }

    handleApiError(event) {
        const { error, endpoint } = event.detail;
        console.error(`API Error (${endpoint}):`, error);
        
        // Handle specific error types
        if (error.message?.includes('Session expired') || error.message?.includes('unauthorized')) {
            // Force logout on auth errors
            authManager.logout();
            UI.showNotification('Your session has expired. Please login again.', 'warning');
        } else if (error.message?.includes('Network error')) {
            UI.showNotification('Network connection issue. Please check your internet.', 'error');
        } else {
            // Generic error handling - don't overwhelm user with technical details
            const userMessage = this.getUserFriendlyErrorMessage(error.message);
            UI.showNotification(userMessage, 'error');
        }
    }

    getUserFriendlyErrorMessage(technicalMessage) {
        if (!technicalMessage) return 'Something went wrong. Please try again.';
        
        // Map common technical errors to user-friendly messages
        const errorMappings = {
            'Daily spin limit reached': 'You\'ve used all your spins for today! Come back tomorrow.',
            'User already exists': 'An account with this email already exists.',
            'Invalid email or password': 'Email or password is incorrect.',
            'Validation failed': 'Please check your input and try again.',
            'Content not found': 'Sorry, no content is available right now.',
            'Server error': 'Our servers are having issues. Please try again later.'
        };
        
        // Check if technical message matches any known patterns
        for (const [pattern, friendlyMessage] of Object.entries(errorMappings)) {
            if (technicalMessage.includes(pattern)) {
                return friendlyMessage;
            }
        }
        
        // Return a generic friendly message for unknown errors
        return 'Something went wrong. Please try again.';
    }

    async initializeComponents() {
        console.log('🔧 Initializing components...');
        
        // Initialize auth manager (already done in auth.js)
        this.components.auth = authManager;
        
        // Initialize UI manager (already done in ui.js)
        this.components.ui = UI;
        
        // Initialize lootbox game (will be created when game screen is shown)
        // this.components.lootbox = new LootboxGame(); // Lazy loaded
        
        // Initialize trophy cabinet (already done in trophy.js)
        this.components.trophy = trophyCabinet;
        
        // Wait for auth initialization
        if (authManager.token) {
            await authManager.init();
        }
        
        console.log('✅ Components initialized');
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            // Only handle shortcuts when not typing in an input
            if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
                return;
            }
            
            switch (event.key) {
                case 'Escape':
                    // Close modals or go back
                    if (!UI.modalOverlay?.classList.contains('hidden')) {
                        UI.hideModal();
                    } else if (UI.currentScreen === 'trophy') {
                        trophyCabinet.hideTrophyScreen();
                    }
                    break;
                    
                case '?':
                    // Show help modal
                    if (!event.shiftKey) return; // Only trigger on Shift+?
                    event.preventDefault();
                    UI.showModal();
                    break;
                    
                case 't':
                    // Toggle trophy screen (if authenticated)
                    if (authManager.isAuthenticated) {
                        event.preventDefault();
                        if (UI.currentScreen === 'trophy') {
                            trophyCabinet.hideTrophyScreen();
                        } else {
                            UI.showTrophyScreen();
                        }
                    }
                    break;
            }
        });
    }

    setupOfflineDetection() {
        const updateOnlineStatus = () => {
            if (navigator.onLine) {
                document.body.classList.remove('offline');
                if (this.wasOffline) {
                    UI.showNotification('Connection restored!', 'success');
                    this.wasOffline = false;
                }
            } else {
                document.body.classList.add('offline');
                UI.showNotification('No internet connection', 'warning', 0); // Persistent
                this.wasOffline = true;
            }
        };

        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);
        
        // Initial check
        updateOnlineStatus();
    }

    // Public methods for external use
    getComponent(name) {
        return this.components[name];
    }

    // Utility method to check if user is admin
    isAdmin() {
        return authManager.hasPermission('admin');
    }

    // Method to refresh app state (useful after network reconnection)
    async refresh() {
        try {
            if (authManager.isAuthenticated) {
                // Refresh user data
                await authManager.init();
                
                // Refresh current screen data
                switch (UI.currentScreen) {
                    case 'game':
                        if (window.lootboxGame) {
                            await window.lootboxGame.loadSpinStatus();
                        }
                        break;
                    case 'trophy':
                        await trophyCabinet.loadTrophies(trophyCabinet.currentPage);
                        break;
                }
            }
            
            UI.showNotification('App refreshed successfully', 'success');
        } catch (error) {
            console.error('Refresh failed:', error);
            UI.showNotification('Failed to refresh app data', 'error');
        }
    }

    // Debug methods (only available in development)
    debug = {
        // Get app state
        getState: () => {
            return {
                initialized: this.isInitialized,
                currentScreen: UI.currentScreen,
                authenticated: authManager.isAuthenticated,
                user: authManager.currentUser,
                components: Object.keys(this.components)
            };
        },

        // Simulate API error
        simulateError: (message = 'Test error') => {
            UI.showNotification(message, 'error');
        },

        // Clear all data
        clearData: () => {
            Utils.storage.clear();
            Utils.cookies.remove('authToken');
            window.location.reload();
        },

        // Test notification system
        testNotifications: () => {
            UI.showNotification('Success notification', 'success');
            setTimeout(() => UI.showNotification('Warning notification', 'warning'), 1000);
            setTimeout(() => UI.showNotification('Error notification', 'error'), 2000);
            setTimeout(() => UI.showNotification('Info notification', 'info'), 3000);
        }
    };
}

// Initialize the application
const app = new LootBoxApp();

// Make app available globally for debugging
window.app = app;

// Service worker registration (for future PWA capabilities)
if ('serviceWorker' in navigator && location.protocol === 'https:') {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

// Analytics placeholder (for future integration)
const analytics = {
    track: (event, properties = {}) => {
        console.log('Analytics:', event, properties);
        // In production, this would send to your analytics service
    }
};

// Export for use in other modules
window.LootBoxApp = LootBoxApp;
window.app = app;
window.analytics = analytics;