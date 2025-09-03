// Authentication management

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.loginCallbacks = [];
        this.logoutCallbacks = [];
        
        // Initialize from storage
        this.init();
    }

    async init() {
        const token = Utils.storage.get('authToken');
        if (token) {
            try {
                const response = await api.auth.verify();
                if (response.success) {
                    this.setUser(response.user);
                } else {
                    // Token invalid, clear auth state and dispatch event
                    this.clearUser();
                }
            } catch (error) {
                console.warn('Token verification failed:', error);
                this.logout();
            }
        } else {
            // No token, dispatch event to notify router
            document.dispatchEvent(new CustomEvent('authStateChanged', {
                detail: {
                    isAuthenticated: false,
                    user: null
                }
            }));
        }
    }

    // Set current user
    setUser(user) {
        this.currentUser = user;
        this.isAuthenticated = true;
        Utils.storage.set('currentUser', user);
        
        // Dispatch auth state change event
        document.dispatchEvent(new CustomEvent('authStateChanged', {
            detail: {
                isAuthenticated: true,
                user: user
            }
        }));
        
        // Trigger login callbacks
        this.loginCallbacks.forEach(callback => {
            try {
                callback(user);
            } catch (error) {
                console.error('Login callback error:', error);
            }
        });
    }

    // Clear current user
    clearUser() {
        this.currentUser = null;
        this.isAuthenticated = false;
        Utils.storage.remove('currentUser');
        Utils.storage.remove('authToken');
        
        // Dispatch auth state change event
        document.dispatchEvent(new CustomEvent('authStateChanged', {
            detail: {
                isAuthenticated: false,
                user: null
            }
        }));
        
        // Trigger logout callbacks
        this.logoutCallbacks.forEach(callback => {
            try {
                callback();
            } catch (error) {
                console.error('Logout callback error:', error);
            }
        });
    }

    // Register new user
    async register(userData) {
        try {
            const response = await api.auth.register(userData);
            if (response.success && response.user) {
                this.setUser(response.user);
            }
            return response;
        } catch (error) {
            throw Utils.error.handle(error, 'Registration');
        }
    }

    // Login user
    async login(credentials) {
        try {
            const response = await api.auth.login(credentials);
            if (response.success && response.user) {
                this.setUser(response.user);
            }
            return response;
        } catch (error) {
            throw Utils.error.handle(error, 'Login');
        }
    }

    // Logout user
    async logout() {
        try {
            await api.auth.logout();
        } catch (error) {
            console.warn('Logout API call failed:', error);
        } finally {
            this.clearUser();
            api.clearToken();
        }
    }

    // Check if user has permission
    hasPermission(permission) {
        if (!this.isAuthenticated || !this.currentUser) {
            return false;
        }

        switch (permission) {
            case 'admin':
                return this.currentUser.isAdmin;
            case 'user':
                return true; // Any authenticated user
            default:
                return false;
        }
    }

    // Get user display name
    getDisplayName() {
        if (!this.currentUser) return 'Guest';
        return this.currentUser.username || this.currentUser.email || 'User';
    }

    // Get remaining spins
    getRemainingSpins() {
        if (!this.currentUser) return 0;
        const dailyLimit = 3; // This should come from settings
        const used = this.currentUser.dailySpinsUsed || 0;
        const override = this.currentUser.adminOverrideSpins || 0;
        return Math.max(0, dailyLimit - used + override);
    }

    // Update user data
    updateUser(userData) {
        if (this.currentUser) {
            this.currentUser = { ...this.currentUser, ...userData };
            Utils.storage.set('currentUser', this.currentUser);
        }
    }

    // Add callback for login events
    onLogin(callback) {
        this.loginCallbacks.push(callback);
    }

    // Add callback for logout events
    onLogout(callback) {
        this.logoutCallbacks.push(callback);
    }

    // Remove callback
    removeCallback(callback, type = 'login') {
        const callbacks = type === 'login' ? this.loginCallbacks : this.logoutCallbacks;
        const index = callbacks.indexOf(callback);
        if (index > -1) {
            callbacks.splice(index, 1);
        }
    }
}

// Authentication form handler
class AuthForms {
    constructor(authManager) {
        this.authManager = authManager;
        this.initializeForms();
    }

    initializeForms() {
        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', this.handleLogin.bind(this));
        }

        // Register form
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', this.handleRegister.bind(this));
        }

        // Form switching
        const switchToRegister = document.getElementById('switchToRegister');
        const switchToLogin = document.getElementById('switchToLogin');
        
        if (switchToRegister) {
            switchToRegister.addEventListener('click', this.showRegisterForm.bind(this));
        }
        
        if (switchToLogin) {
            switchToLogin.addEventListener('click', this.showLoginForm.bind(this));
        }
    }

    async handleLogin(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const credentials = {
            email: formData.get('email'),
            password: formData.get('password')
        };

        // Validate form
        if (!credentials.email || !credentials.password) {
            UI.showNotification('Please fill in all fields', 'error');
            return;
        }

        if (!Utils.isValidEmail(credentials.email)) {
            UI.showNotification('Please enter a valid email address', 'error');
            return;
        }

        try {
            UI.showLoading(true);
            const response = await this.authManager.login(credentials);
            
            if (response.success) {
                UI.showNotification('Login successful! Welcome back.', 'success');
                event.target.reset();
            } else {
                UI.showNotification(response.message || 'Login failed', 'error');
            }
        } catch (error) {
            UI.showNotification(error.message || 'Login failed', 'error');
        } finally {
            UI.showLoading(false);
        }
    }

    async handleRegister(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const userData = {
            username: formData.get('username'),
            email: formData.get('email'),
            password: formData.get('password')
        };

        // Validate form
        if (!userData.username || !userData.email || !userData.password) {
            UI.showNotification('Please fill in all fields', 'error');
            return;
        }

        if (userData.username.length < 3) {
            UI.showNotification('Username must be at least 3 characters long', 'error');
            return;
        }

        if (!Utils.isValidEmail(userData.email)) {
            UI.showNotification('Please enter a valid email address', 'error');
            return;
        }

        if (userData.password.length < 6) {
            UI.showNotification('Password must be at least 6 characters long', 'error');
            return;
        }

        try {
            UI.showLoading(true);
            const response = await this.authManager.register(userData);
            
            if (response.success) {
                UI.showNotification('Account created successfully! Welcome to Loot Box.', 'success');
                event.target.reset();
            } else {
                UI.showNotification(response.message || 'Registration failed', 'error');
            }
        } catch (error) {
            UI.showNotification(error.message || 'Registration failed', 'error');
        } finally {
            UI.showLoading(false);
        }
    }

    showLoginForm() {
        const loginScreen = document.getElementById('loginScreen');
        const registerScreen = document.getElementById('registerScreen');
        
        if (loginScreen && registerScreen) {
            loginScreen.classList.remove('hidden');
            registerScreen.classList.add('hidden');
        }
    }

    showRegisterForm() {
        const loginScreen = document.getElementById('loginScreen');
        const registerScreen = document.getElementById('registerScreen');
        
        if (loginScreen && registerScreen) {
            loginScreen.classList.add('hidden');
            registerScreen.classList.remove('hidden');
        }
    }
}

// Create global auth manager
const authManager = new AuthManager();

// Initialize forms when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AuthForms(authManager);
});

// Export for use in other modules
window.AuthManager = AuthManager;
window.authManager = authManager;