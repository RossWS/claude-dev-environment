// State Manager - Centralized application state management
class StateManager {
    constructor() {
        this.state = {};
        this.listeners = new Map();
        this.middleware = [];
        this.history = [];
        this.maxHistorySize = 50;
        
        this.initializeState();
    }

    initializeState() {
        this.state = {
            // User state
            user: {
                isAuthenticated: false,
                profile: null,
                settings: {},
                stats: {}
            },
            
            // UI state
            ui: {
                currentScreen: 'login',
                isLoading: false,
                modals: {
                    open: [],
                    data: {}
                },
                notifications: []
            },
            
            // Game state
            game: {
                isPlaying: false,
                currentBox: null,
                animations: {
                    spinning: false,
                    revealing: false
                }
            },
            
            // Collection state
            collection: {
                trophies: [],
                showcase: [],
                filters: {
                    type: '',
                    rarity: '',
                    sort: 'unlock_time'
                },
                stats: {
                    total: 0,
                    byRarity: {},
                    byType: {}
                }
            },
            
            // Admin state (if user is admin)
            admin: {
                users: [],
                content: [],
                activities: [],
                settings: [],
                stats: {}
            }
        };
    }

    // Core state management methods
    getState(path = null) {
        if (!path) {
            return { ...this.state };
        }
        
        return this.getNestedValue(this.state, path);
    }

    setState(path, value, silent = false) {
        const previousState = { ...this.state };
        
        // Apply middleware
        const action = { type: 'SET_STATE', path, value, previousState };
        const processedAction = this.applyMiddleware(action);
        
        if (processedAction === null) {
            // Middleware blocked the action
            return false;
        }

        // Update state
        if (typeof path === 'string') {
            this.setNestedValue(this.state, path, processedAction.value);
        } else if (typeof path === 'object') {
            // Batch update
            Object.entries(path).forEach(([key, val]) => {
                this.setNestedValue(this.state, key, val);
            });
        }

        // Add to history
        this.addToHistory(previousState, this.state);

        // Notify listeners
        if (!silent) {
            this.notifyListeners(path, value, previousState);
        }

        return true;
    }

    updateState(path, updater) {
        const currentValue = this.getState(path);
        const newValue = typeof updater === 'function' 
            ? updater(currentValue) 
            : { ...currentValue, ...updater };
        
        return this.setState(path, newValue);
    }

    // Subscription methods
    subscribe(path, callback, options = {}) {
        const subscriptionId = `${path}_${Date.now()}_${Math.random()}`;
        
        if (!this.listeners.has(path)) {
            this.listeners.set(path, new Map());
        }
        
        this.listeners.get(path).set(subscriptionId, {
            callback,
            options: {
                immediate: false,
                deep: true,
                ...options
            }
        });

        // Call immediately if requested
        if (options.immediate) {
            callback(this.getState(path), undefined, path);
        }

        // Return unsubscribe function
        return () => this.unsubscribe(path, subscriptionId);
    }

    unsubscribe(path, subscriptionId) {
        const pathListeners = this.listeners.get(path);
        if (pathListeners) {
            pathListeners.delete(subscriptionId);
            
            if (pathListeners.size === 0) {
                this.listeners.delete(path);
            }
        }
    }

    // Action dispatch methods
    dispatch(action) {
        const processedAction = this.applyMiddleware(action);
        
        if (processedAction === null) {
            return false;
        }

        return this.executeAction(processedAction);
    }

    executeAction(action) {
        const { type, payload } = action;
        
        switch (type) {
            case 'USER_LOGIN':
                return this.handleUserLogin(payload);
            
            case 'USER_LOGOUT':
                return this.handleUserLogout();
            
            case 'SET_LOADING':
                return this.setState('ui.isLoading', payload);
            
            case 'SHOW_MODAL':
                return this.showModal(payload.name, payload.data);
            
            case 'HIDE_MODAL':
                return this.hideModal(payload.name);
            
            case 'ADD_NOTIFICATION':
                return this.addNotification(payload);
            
            case 'REMOVE_NOTIFICATION':
                return this.removeNotification(payload.id);
            
            case 'SET_CURRENT_SCREEN':
                return this.setState('ui.currentScreen', payload);
            
            case 'UPDATE_TROPHIES':
                return this.updateTrophies(payload);
            
            case 'UPDATE_FILTERS':
                return this.setState('collection.filters', payload);
            
            case 'START_SPIN':
                return this.setState('game.animations.spinning', true);
            
            case 'END_SPIN':
                return this.setState('game.animations.spinning', false);
            
            default:
                console.warn(`Unknown action type: ${type}`);
                return false;
        }
    }

    // Specific action handlers
    handleUserLogin(userData) {
        return this.setState({
            'user.isAuthenticated': true,
            'user.profile': userData.profile,
            'user.settings': userData.settings || {},
            'user.stats': userData.stats || {}
        });
    }

    handleUserLogout() {
        // Reset user-specific state but preserve UI state
        return this.setState({
            'user.isAuthenticated': false,
            'user.profile': null,
            'user.settings': {},
            'user.stats': {},
            'collection.trophies': [],
            'collection.showcase': [],
            'admin.users': [],
            'admin.content': [],
            'admin.activities': [],
            'admin.settings': []
        });
    }

    showModal(name, data = {}) {
        const currentModals = this.getState('ui.modals.open');
        const modalData = this.getState('ui.modals.data');
        
        return this.setState({
            'ui.modals.open': [...currentModals, name],
            'ui.modals.data': { ...modalData, [name]: data }
        });
    }

    hideModal(name) {
        const currentModals = this.getState('ui.modals.open');
        const modalData = this.getState('ui.modals.data');
        
        const newModals = currentModals.filter(modal => modal !== name);
        const newModalData = { ...modalData };
        delete newModalData[name];
        
        return this.setState({
            'ui.modals.open': newModals,
            'ui.modals.data': newModalData
        });
    }

    addNotification(notification) {
        const notifications = this.getState('ui.notifications');
        const newNotification = {
            id: Date.now() + Math.random(),
            timestamp: Date.now(),
            ...notification
        };
        
        return this.setState('ui.notifications', [...notifications, newNotification]);
    }

    removeNotification(id) {
        const notifications = this.getState('ui.notifications');
        return this.setState('ui.notifications', notifications.filter(n => n.id !== id));
    }

    updateTrophies(trophies) {
        const stats = this.calculateTrophyStats(trophies);
        
        return this.setState({
            'collection.trophies': trophies,
            'collection.stats': stats
        });
    }

    calculateTrophyStats(trophies) {
        const stats = {
            total: trophies.length,
            byRarity: {},
            byType: {}
        };

        trophies.forEach(trophy => {
            // Rarity stats
            stats.byRarity[trophy.rarity] = (stats.byRarity[trophy.rarity] || 0) + 1;
            
            // Type stats
            stats.byType[trophy.type] = (stats.byType[trophy.type] || 0) + 1;
        });

        return stats;
    }

    // Middleware system
    addMiddleware(middleware) {
        this.middleware.push(middleware);
    }

    removeMiddleware(middleware) {
        const index = this.middleware.indexOf(middleware);
        if (index > -1) {
            this.middleware.splice(index, 1);
        }
    }

    applyMiddleware(action) {
        let processedAction = action;
        
        for (const middleware of this.middleware) {
            processedAction = middleware(processedAction, this.getState.bind(this));
            
            if (processedAction === null) {
                // Middleware blocked the action
                return null;
            }
        }
        
        return processedAction;
    }

    // History management
    addToHistory(previousState, currentState) {
        this.history.push({
            previousState: { ...previousState },
            currentState: { ...currentState },
            timestamp: Date.now()
        });

        // Keep history size manageable
        if (this.history.length > this.maxHistorySize) {
            this.history = this.history.slice(-this.maxHistorySize);
        }
    }

    getHistory() {
        return [...this.history];
    }

    // Persistence methods
    persist(key = 'appState') {
        try {
            const stateToSave = {
                user: this.state.user,
                collection: this.state.collection,
                timestamp: Date.now()
            };
            
            localStorage.setItem(key, JSON.stringify(stateToSave));
            return true;
        } catch (error) {
            console.error('Failed to persist state:', error);
            return false;
        }
    }

    restore(key = 'appState') {
        try {
            const savedState = localStorage.getItem(key);
            
            if (savedState) {
                const parsedState = JSON.parse(savedState);
                
                // Only restore certain parts of state
                this.setState({
                    'user.settings': parsedState.user?.settings || {},
                    'collection.filters': parsedState.collection?.filters || {},
                }, true); // Silent update
                
                return true;
            }
        } catch (error) {
            console.error('Failed to restore state:', error);
        }
        
        return false;
    }

    // Utility methods
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => 
            current && current[key] !== undefined ? current[key] : undefined, obj);
    }

    setNestedValue(obj, path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        
        const target = keys.reduce((current, key) => {
            if (current[key] === undefined) {
                current[key] = {};
            }
            return current[key];
        }, obj);
        
        target[lastKey] = value;
    }

    notifyListeners(path, value, previousState) {
        // Notify specific path listeners
        const pathListeners = this.listeners.get(path);
        if (pathListeners) {
            pathListeners.forEach(({ callback, options }) => {
                try {
                    callback(value, this.getNestedValue(previousState, path), path);
                } catch (error) {
                    console.error('Listener error:', error);
                }
            });
        }

        // Notify wildcard listeners (listening to parent paths)
        this.listeners.forEach((listeners, listenerPath) => {
            if (path.startsWith(listenerPath + '.') || listenerPath === '*') {
                listeners.forEach(({ callback, options }) => {
                    if (options.deep) {
                        try {
                            callback(this.getState(listenerPath), this.getNestedValue(previousState, listenerPath), listenerPath);
                        } catch (error) {
                            console.error('Listener error:', error);
                        }
                    }
                });
            }
        });
    }

    // Debug methods
    debug() {
        return {
            state: this.getState(),
            listeners: Array.from(this.listeners.keys()),
            middleware: this.middleware.length,
            history: this.history.length
        };
    }

    reset() {
        this.state = {};
        this.listeners.clear();
        this.history = [];
        this.initializeState();
    }
}

// Create singleton instance
window.stateManager = window.stateManager || new StateManager();

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StateManager;
}