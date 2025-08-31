// Simple Hash Router for Navigation
class Router {
    constructor() {
        this.routes = new Map();
        this.currentRoute = null;
        this.defaultRoute = '/';
        this.beforeRouteChange = null;
        this.afterRouteChange = null;
        
        // Bind event handlers
        this.handleHashChange = this.handleHashChange.bind(this);
        this.handlePopState = this.handlePopState.bind(this);
        
        // Initialize
        this.init();
    }

    init() {
        console.log('🔗 Router: Initializing...');
        
        // Listen for hash changes
        window.addEventListener('hashchange', this.handleHashChange);
        window.addEventListener('popstate', this.handlePopState);
        
        // Handle initial route
        this.handleInitialRoute();
    }

    // Define routes with their handlers
    addRoute(path, config) {
        console.log('🔗 Router: Adding route:', path);
        
        this.routes.set(path, {
            handler: config.handler,
            requiresAuth: config.requiresAuth || false,
            requiresAdmin: config.requiresAdmin || false,
            title: config.title || 'DiscoveryBox',
            screenId: config.screenId
        });
    }

    // Navigate to a route
    navigate(path, replace = false) {
        console.log('🔗 Router: Navigating to:', path);
        
        // Update URL
        if (replace) {
            window.location.replace(`#${path}`);
        } else {
            window.location.hash = path;
        }
    }

    // Get current route path
    getCurrentPath() {
        return window.location.hash.slice(1) || '/';
    }

    // Handle hash change events
    handleHashChange(event) {
        console.log('🔗 Router: Hash changed');
        this.handleRoute();
    }

    // Handle browser back/forward
    handlePopState(event) {
        console.log('🔗 Router: Pop state');
        this.handleRoute();
    }

    // Handle initial page load
    handleInitialRoute() {
        const path = this.getCurrentPath();
        console.log('🔗 Router: Initial route:', path);
        
        if (path === '/' || path === '') {
            // Determine default route based on auth state
            if (window.authManager?.isAuthenticated) {
                this.navigate('/game', true);
            } else {
                this.navigate('/welcome', true);
            }
        } else {
            this.handleRoute();
        }
    }

    // Main route handling logic
    async handleRoute() {
        const path = this.getCurrentPath();
        console.log('🔗 Router: Handling route:', path);

        // Call before route change hook
        if (this.beforeRouteChange) {
            const shouldContinue = await this.beforeRouteChange(this.currentRoute, path);
            if (!shouldContinue) {
                console.log('🔗 Router: Route change prevented by beforeRouteChange hook');
                return;
            }
        }

        // Find matching route
        const route = this.routes.get(path);
        
        if (!route) {
            console.warn('🔗 Router: Route not found:', path);
            this.navigate('/welcome', true);
            return;
        }

        // Check authentication
        if (route.requiresAuth && !this.isAuthenticated()) {
            console.log('🔗 Router: Route requires auth, redirecting to login');
            this.navigate('/login', true);
            return;
        }

        // Check admin permissions
        if (route.requiresAdmin && !this.isAdmin()) {
            console.log('🔗 Router: Route requires admin, access denied');
            this.showAccessDenied();
            return;
        }

        // Hide all screens first
        this.hideAllScreens();

        // Execute route handler
        try {
            console.log('🔗 Router: Executing route handler for:', path);
            await route.handler();
            
            // Show the screen
            this.showScreen(route.screenId);
            
            // Update document title
            document.title = `${route.title} - DiscoveryBox`;
            
            // Update current route
            this.currentRoute = path;
            
            // Call after route change hook
            if (this.afterRouteChange) {
                this.afterRouteChange(path);
            }
            
            console.log('🔗 Router: Route handled successfully:', path);
            
        } catch (error) {
            console.error('🔗 Router: Route handler error:', error);
            this.navigate('/error', true);
        }
    }

    // Utility methods
    isAuthenticated() {
        return window.authManager?.isAuthenticated || false;
    }

    isAdmin() {
        return window.authManager?.hasPermission('admin') || false;
    }

    showAccessDenied() {
        if (window.UI) {
            window.UI.showNotification('Access denied: Insufficient permissions', 'error');
        }
        this.navigate('/', true);
    }

    // Screen management
    hideAllScreens() {
        console.log('🔗 Router: Hiding all screens');
        const screens = document.querySelectorAll('.screen');
        screens.forEach(screen => {
            screen.classList.add('hidden');
            screen.style.display = '';
        });
    }

    showScreen(screenId) {
        if (!screenId) return;
        
        console.log('🔗 Router: Showing screen:', screenId);
        const screen = document.getElementById(screenId);
        if (screen) {
            screen.classList.remove('hidden');
        } else {
            console.error('🔗 Router: Screen not found:', screenId);
        }
    }

    // Hook methods
    beforeRoute(callback) {
        this.beforeRouteChange = callback;
    }

    afterRoute(callback) {
        this.afterRouteChange = callback;
    }

    // Helper methods for navigation
    goHome() {
        this.navigate('/');
    }

    goBack() {
        window.history.back();
    }

    goForward() {
        window.history.forward();
    }

}

// Route handlers
const RouteHandlers = {
    async login() {
        console.log('📍 Route: Login');
        // Login screen initialization if needed
    },

    async register() {
        console.log('📍 Route: Register');
        // Register screen initialization if needed
    },

    async game() {
        console.log('📍 Route: Game');
        // Initialize game if needed
        if (!window.discoveryboxGame) {
            window.discoveryboxGame = new DiscoveryBoxGame();
        }
        window.discoveryboxGame.createBackgroundParticles();
        window.discoveryboxGame.loadSpinStatus();
    },

    async profile() {
        console.log('📍 Route: Profile');
        // Initialize profile
        if (window.userProfile) {
            await window.userProfile.loadProfileData();
            window.userProfile.switchTab('overview');
        }
    },

    async trophies() {
        console.log('📍 Route: Trophies');
        // Initialize trophy cabinet
        if (window.trophyCabinet) {
            await window.trophyCabinet.loadTrophies(1);
        }
    },

    async admin() {
        console.log('📍 Route: Admin');
        // Initialize admin panel
        if (window.adminPanel) {
            await window.adminPanel.showAdminScreen();
        }
    },

    async notFound() {
        console.log('📍 Route: 404');
        if (window.UI) {
            window.UI.showNotification('Page not found', 'error');
        }
    },

    async error() {
        console.log('📍 Route: Error');
        if (window.UI) {
            window.UI.showNotification('An error occurred', 'error');
        }
    }
};

// Create global router instance
const router = new Router();

// Define routes
router.addRoute('/', {
    handler: RouteHandlers.game,
    title: 'Game',
    screenId: 'gameScreen'
});

router.addRoute('/login', {
    handler: RouteHandlers.login,
    title: 'Login',
    screenId: 'loginScreen'
});

router.addRoute('/register', {
    handler: RouteHandlers.register,
    title: 'Register',
    screenId: 'registerScreen'
});

router.addRoute('/game', {
    handler: RouteHandlers.game,
    requiresAuth: true,
    title: 'Game',
    screenId: 'gameScreen'
});

router.addRoute('/profile', {
    handler: RouteHandlers.profile,
    requiresAuth: true,
    title: 'Profile',
    screenId: 'profileScreen'
});

router.addRoute('/trophies', {
    handler: RouteHandlers.trophies,
    requiresAuth: false, // Allow guest access
    title: 'Trophy Cabinet',
    screenId: 'trophyScreen'
});

router.addRoute('/admin', {
    handler: RouteHandlers.admin,
    requiresAuth: true,
    requiresAdmin: true,
    title: 'Admin Panel',
    screenId: 'adminScreen'
});

router.addRoute('/404', {
    handler: RouteHandlers.notFound,
    title: '404 - Not Found',
    screenId: 'gameScreen'
});

router.addRoute('/error', {
    handler: RouteHandlers.error,
    title: 'Error',
    screenId: 'gameScreen'
});

router.addRoute('/welcome', {
    handler: RouteHandlers.game,
    title: 'Welcome - DiscoveryBox',
    screenId: 'gameScreen'
});

// Export for use in other modules
window.Router = Router;
window.router = router;

console.log('🔗 Router system initialized');