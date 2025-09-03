// Event Bus - Decoupled component communication system
class EventBus {
    constructor() {
        this.events = new Map();
        this.debugMode = false;
        this.eventHistory = [];
        this.maxHistorySize = 100;
    }

    // Core event methods
    on(eventName, callback, options = {}) {
        const subscriptionOptions = {
            once: false,
            priority: 0,
            namespace: null,
            condition: null,
            ...options
        };

        if (!this.events.has(eventName)) {
            this.events.set(eventName, []);
        }

        const subscription = {
            callback,
            options: subscriptionOptions,
            id: this.generateSubscriptionId(),
            createdAt: Date.now()
        };

        // Insert based on priority (higher priority first)
        const eventListeners = this.events.get(eventName);
        const insertIndex = eventListeners.findIndex(
            listener => listener.options.priority < subscriptionOptions.priority
        );

        if (insertIndex === -1) {
            eventListeners.push(subscription);
        } else {
            eventListeners.splice(insertIndex, 0, subscription);
        }

        this.log(`Event listener added: ${eventName}`, { subscription });

        // Return unsubscribe function
        return () => this.off(eventName, subscription.id);
    }

    once(eventName, callback, options = {}) {
        return this.on(eventName, callback, { ...options, once: true });
    }

    off(eventName, callbackOrId) {
        if (!this.events.has(eventName)) {
            return false;
        }

        const listeners = this.events.get(eventName);
        let removed = false;

        if (typeof callbackOrId === 'string') {
            // Remove by subscription ID
            const index = listeners.findIndex(listener => listener.id === callbackOrId);
            if (index !== -1) {
                listeners.splice(index, 1);
                removed = true;
            }
        } else if (typeof callbackOrId === 'function') {
            // Remove by callback function
            const index = listeners.findIndex(listener => listener.callback === callbackOrId);
            if (index !== -1) {
                listeners.splice(index, 1);
                removed = true;
            }
        }

        // Clean up empty event arrays
        if (listeners.length === 0) {
            this.events.delete(eventName);
        }

        if (removed) {
            this.log(`Event listener removed: ${eventName}`);
        }

        return removed;
    }

    emit(eventName, data = null, options = {}) {
        const emitOptions = {
            async: false,
            stopOnError: false,
            timeout: null,
            ...options
        };

        const eventData = {
            name: eventName,
            data,
            timestamp: Date.now(),
            id: this.generateEventId()
        };

        this.addToHistory(eventData);
        this.log(`Event emitted: ${eventName}`, eventData);

        if (!this.events.has(eventName)) {
            this.log(`No listeners for event: ${eventName}`);
            return Promise.resolve([]);
        }

        const listeners = this.events.get(eventName).slice(); // Create copy to avoid modification during iteration
        const results = [];

        if (emitOptions.async) {
            return this.emitAsync(eventName, eventData, listeners, emitOptions);
        } else {
            return this.emitSync(eventName, eventData, listeners, emitOptions);
        }
    }

    emitSync(eventName, eventData, listeners, options) {
        const results = [];

        for (const listener of listeners) {
            try {
                // Check condition if provided
                if (listener.options.condition && !listener.options.condition(eventData)) {
                    continue;
                }

                const result = listener.callback(eventData.data, eventData);
                results.push({ success: true, result, listener: listener.id });

                // Remove 'once' listeners
                if (listener.options.once) {
                    this.off(eventName, listener.id);
                }

            } catch (error) {
                const errorResult = { success: false, error, listener: listener.id };
                results.push(errorResult);

                this.log(`Error in event listener: ${eventName}`, error);

                if (!options.stopOnError) {
                    continue;
                } else {
                    break;
                }
            }
        }

        return results;
    }

    async emitAsync(eventName, eventData, listeners, options) {
        const results = [];
        const promises = [];

        for (const listener of listeners) {
            const promise = new Promise(async (resolve) => {
                try {
                    // Check condition if provided
                    if (listener.options.condition && !listener.options.condition(eventData)) {
                        resolve({ success: true, result: null, listener: listener.id, skipped: true });
                        return;
                    }

                    let result;
                    
                    if (options.timeout) {
                        // Execute with timeout
                        result = await Promise.race([
                            Promise.resolve(listener.callback(eventData.data, eventData)),
                            new Promise((_, reject) => 
                                setTimeout(() => reject(new Error('Timeout')), options.timeout)
                            )
                        ]);
                    } else {
                        result = await Promise.resolve(listener.callback(eventData.data, eventData));
                    }

                    resolve({ success: true, result, listener: listener.id });

                    // Remove 'once' listeners
                    if (listener.options.once) {
                        this.off(eventName, listener.id);
                    }

                } catch (error) {
                    resolve({ success: false, error, listener: listener.id });
                    this.log(`Error in async event listener: ${eventName}`, error);
                }
            });

            promises.push(promise);
        }

        try {
            const results = await Promise.all(promises);
            return results;
        } catch (error) {
            this.log(`Error in async event emission: ${eventName}`, error);
            throw error;
        }
    }

    // Namespace methods
    namespace(namespaceName) {
        return {
            on: (eventName, callback, options = {}) => 
                this.on(eventName, callback, { ...options, namespace: namespaceName }),
            
            once: (eventName, callback, options = {}) => 
                this.once(eventName, callback, { ...options, namespace: namespaceName }),
            
            emit: (eventName, data, options = {}) => 
                this.emit(`${namespaceName}:${eventName}`, data, options),
            
            off: (eventName, callbackOrId) => 
                this.off(eventName, callbackOrId),
            
            clear: () => this.clearNamespace(namespaceName)
        };
    }

    clearNamespace(namespaceName) {
        let clearedCount = 0;

        this.events.forEach((listeners, eventName) => {
            const filteredListeners = listeners.filter(
                listener => listener.options.namespace !== namespaceName
            );
            
            if (filteredListeners.length !== listeners.length) {
                clearedCount += listeners.length - filteredListeners.length;
                
                if (filteredListeners.length === 0) {
                    this.events.delete(eventName);
                } else {
                    this.events.set(eventName, filteredListeners);
                }
            }
        });

        this.log(`Cleared namespace: ${namespaceName} (${clearedCount} listeners removed)`);
        return clearedCount;
    }

    // Utility methods
    hasListeners(eventName) {
        return this.events.has(eventName) && this.events.get(eventName).length > 0;
    }

    getListenerCount(eventName) {
        return this.events.has(eventName) ? this.events.get(eventName).length : 0;
    }

    getAllEvents() {
        return Array.from(this.events.keys());
    }

    clear() {
        const eventCount = this.events.size;
        this.events.clear();
        this.log(`All events cleared (${eventCount} events)`);
        return eventCount;
    }

    // Event patterns and wildcards
    onPattern(pattern, callback, options = {}) {
        const regex = this.patternToRegex(pattern);
        
        return this.on('*', (data, eventData) => {
            if (regex.test(eventData.name)) {
                return callback(data, eventData);
            }
        }, options);
    }

    patternToRegex(pattern) {
        // Convert simple wildcard pattern to regex
        const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const wildcardPattern = escaped.replace(/\\\*/g, '.*').replace(/\\\?/g, '.');
        return new RegExp(`^${wildcardPattern}$`);
    }

    // Middleware system
    use(middleware) {
        if (!this.middleware) {
            this.middleware = [];
        }
        this.middleware.push(middleware);
    }

    applyMiddleware(eventName, eventData) {
        if (!this.middleware) return eventData;

        let processedData = eventData;
        
        for (const middleware of this.middleware) {
            try {
                const result = middleware(eventName, processedData, this);
                if (result === false) {
                    // Middleware blocked the event
                    return null;
                }
                if (result !== undefined) {
                    processedData = result;
                }
            } catch (error) {
                this.log('Middleware error:', error);
            }
        }

        return processedData;
    }

    // Debug and monitoring
    enableDebug() {
        this.debugMode = true;
    }

    disableDebug() {
        this.debugMode = false;
    }

    log(message, data = null) {
        if (this.debugMode) {
            console.log(`[EventBus] ${message}`, data);
        }
    }

    addToHistory(eventData) {
        this.eventHistory.push(eventData);
        
        if (this.eventHistory.length > this.maxHistorySize) {
            this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
        }
    }

    getHistory() {
        return [...this.eventHistory];
    }

    getStats() {
        const eventCounts = {};
        let totalListeners = 0;

        this.events.forEach((listeners, eventName) => {
            eventCounts[eventName] = listeners.length;
            totalListeners += listeners.length;
        });

        return {
            totalEvents: this.events.size,
            totalListeners,
            eventCounts,
            historySize: this.eventHistory.length,
            debugMode: this.debugMode
        };
    }

    // Private utility methods
    generateSubscriptionId() {
        return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    generateEventId() {
        return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

// Create singleton instance
window.eventBus = window.eventBus || new EventBus();

// Common event names (constants to avoid typos)
window.EVENTS = {
    // User events
    USER_LOGIN: 'user:login',
    USER_LOGOUT: 'user:logout',
    USER_PROFILE_UPDATE: 'user:profile:update',
    
    // UI events
    SCREEN_CHANGE: 'ui:screen:change',
    MODAL_OPEN: 'ui:modal:open',
    MODAL_CLOSE: 'ui:modal:close',
    NOTIFICATION_ADD: 'ui:notification:add',
    NOTIFICATION_REMOVE: 'ui:notification:remove',
    
    // Game events
    GAME_START: 'game:start',
    GAME_END: 'game:end',
    SPIN_START: 'game:spin:start',
    SPIN_END: 'game:spin:end',
    TROPHY_UNLOCK: 'game:trophy:unlock',
    
    // Collection events
    TROPHIES_UPDATE: 'collection:trophies:update',
    SHOWCASE_UPDATE: 'collection:showcase:update',
    FILTERS_CHANGE: 'collection:filters:change',
    
    // Admin events
    ADMIN_USER_UPDATE: 'admin:user:update',
    ADMIN_CONTENT_UPDATE: 'admin:content:update',
    ADMIN_SETTINGS_UPDATE: 'admin:settings:update'
};

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EventBus;
}