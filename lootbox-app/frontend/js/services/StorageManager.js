// Storage Manager - Unified local/session storage handling
class StorageManager {
    constructor() {
        this.storage = {
            local: this.createStorageAdapter('localStorage'),
            session: this.createStorageAdapter('sessionStorage'),
            memory: this.createMemoryAdapter()
        };
        
        this.defaultExpiration = 24 * 60 * 60 * 1000; // 24 hours
        this.keyPrefix = 'discoverybox_';
        
        this.initializeCleanup();
    }

    // Create storage adapter with error handling
    createStorageAdapter(storageType) {
        const storage = window[storageType];
        
        return {
            get: (key) => {
                try {
                    const item = storage.getItem(this.keyPrefix + key);
                    return item ? JSON.parse(item) : null;
                } catch (error) {
                    console.error(`Error reading from ${storageType}:`, error);
                    return null;
                }
            },
            
            set: (key, value) => {
                try {
                    storage.setItem(this.keyPrefix + key, JSON.stringify(value));
                    return true;
                } catch (error) {
                    console.error(`Error writing to ${storageType}:`, error);
                    return false;
                }
            },
            
            remove: (key) => {
                try {
                    storage.removeItem(this.keyPrefix + key);
                    return true;
                } catch (error) {
                    console.error(`Error removing from ${storageType}:`, error);
                    return false;
                }
            },
            
            clear: () => {
                try {
                    // Only clear keys with our prefix
                    const keysToRemove = [];
                    for (let i = 0; i < storage.length; i++) {
                        const key = storage.key(i);
                        if (key && key.startsWith(this.keyPrefix)) {
                            keysToRemove.push(key);
                        }
                    }
                    keysToRemove.forEach(key => storage.removeItem(key));
                    return true;
                } catch (error) {
                    console.error(`Error clearing ${storageType}:`, error);
                    return false;
                }
            },
            
            keys: () => {
                try {
                    const keys = [];
                    for (let i = 0; i < storage.length; i++) {
                        const key = storage.key(i);
                        if (key && key.startsWith(this.keyPrefix)) {
                            keys.push(key.substring(this.keyPrefix.length));
                        }
                    }
                    return keys;
                } catch (error) {
                    console.error(`Error getting keys from ${storageType}:`, error);
                    return [];
                }
            },
            
            size: () => {
                try {
                    let size = 0;
                    for (let i = 0; i < storage.length; i++) {
                        const key = storage.key(i);
                        if (key && key.startsWith(this.keyPrefix)) {
                            const value = storage.getItem(key);
                            size += key.length + (value ? value.length : 0);
                        }
                    }
                    return size;
                } catch (error) {
                    console.error(`Error calculating ${storageType} size:`, error);
                    return 0;
                }
            }
        };
    }

    // Create in-memory storage adapter (fallback)
    createMemoryAdapter() {
        const memoryStorage = new Map();
        
        return {
            get: (key) => {
                const item = memoryStorage.get(key);
                return item ? JSON.parse(JSON.stringify(item)) : null;
            },
            
            set: (key, value) => {
                memoryStorage.set(key, JSON.parse(JSON.stringify(value)));
                return true;
            },
            
            remove: (key) => {
                return memoryStorage.delete(key);
            },
            
            clear: () => {
                memoryStorage.clear();
                return true;
            },
            
            keys: () => {
                return Array.from(memoryStorage.keys());
            },
            
            size: () => {
                let size = 0;
                memoryStorage.forEach((value, key) => {
                    size += key.length + JSON.stringify(value).length;
                });
                return size;
            }
        };
    }

    // Main API methods
    get(key, storageType = 'local') {
        const adapter = this.storage[storageType];
        if (!adapter) {
            console.error(`Invalid storage type: ${storageType}`);
            return null;
        }

        const item = adapter.get(key);
        
        // Check expiration
        if (item && typeof item === 'object' && item.__expiration) {
            if (Date.now() > item.__expiration) {
                this.remove(key, storageType);
                return null;
            }
            
            // Return the actual value without metadata
            return item.value;
        }
        
        return item;
    }

    set(key, value, options = {}) {
        const {
            storageType = 'local',
            expiration = null,
            encrypt = false
        } = options;

        const adapter = this.storage[storageType];
        if (!adapter) {
            console.error(`Invalid storage type: ${storageType}`);
            return false;
        }

        let dataToStore = value;

        // Add expiration metadata if needed
        if (expiration) {
            const expirationTime = typeof expiration === 'number' 
                ? Date.now() + expiration 
                : new Date(expiration).getTime();
                
            dataToStore = {
                value: value,
                __expiration: expirationTime,
                __timestamp: Date.now()
            };
        }

        // Simple encryption if requested (base64 encoding)
        if (encrypt) {
            dataToStore = {
                __encrypted: true,
                value: btoa(JSON.stringify(dataToStore))
            };
        }

        return adapter.set(key, dataToStore);
    }

    remove(key, storageType = 'local') {
        const adapter = this.storage[storageType];
        if (!adapter) {
            console.error(`Invalid storage type: ${storageType}`);
            return false;
        }

        return adapter.remove(key);
    }

    clear(storageType = 'local') {
        const adapter = this.storage[storageType];
        if (!adapter) {
            console.error(`Invalid storage type: ${storageType}`);
            return false;
        }

        return adapter.clear();
    }

    // Batch operations
    getMany(keys, storageType = 'local') {
        const result = {};
        keys.forEach(key => {
            result[key] = this.get(key, storageType);
        });
        return result;
    }

    setMany(data, options = {}) {
        const results = {};
        Object.entries(data).forEach(([key, value]) => {
            results[key] = this.set(key, value, options);
        });
        return results;
    }

    removeMany(keys, storageType = 'local') {
        const results = {};
        keys.forEach(key => {
            results[key] = this.remove(key, storageType);
        });
        return results;
    }

    // Utility methods
    exists(key, storageType = 'local') {
        return this.get(key, storageType) !== null;
    }

    keys(storageType = 'local') {
        const adapter = this.storage[storageType];
        return adapter ? adapter.keys() : [];
    }

    size(storageType = 'local') {
        const adapter = this.storage[storageType];
        return adapter ? adapter.size() : 0;
    }

    // Expiration management
    setExpiring(key, value, ttl = this.defaultExpiration, storageType = 'local') {
        return this.set(key, value, {
            storageType,
            expiration: ttl
        });
    }

    getExpiration(key, storageType = 'local') {
        const adapter = this.storage[storageType];
        if (!adapter) return null;

        const item = adapter.get(key);
        if (item && typeof item === 'object' && item.__expiration) {
            return new Date(item.__expiration);
        }
        
        return null;
    }

    extendExpiration(key, additionalTime, storageType = 'local') {
        const currentData = this.get(key, storageType);
        if (currentData === null) return false;

        const currentExpiration = this.getExpiration(key, storageType);
        const newExpiration = currentExpiration 
            ? currentExpiration.getTime() + additionalTime
            : Date.now() + additionalTime;

        return this.set(key, currentData, {
            storageType,
            expiration: newExpiration
        });
    }

    // Cache-like methods
    remember(key, factory, ttl = this.defaultExpiration, storageType = 'local') {
        let value = this.get(key, storageType);
        
        if (value === null) {
            value = typeof factory === 'function' ? factory() : factory;
            this.setExpiring(key, value, ttl, storageType);
        }
        
        return value;
    }

    async rememberAsync(key, asyncFactory, ttl = this.defaultExpiration, storageType = 'local') {
        let value = this.get(key, storageType);
        
        if (value === null) {
            value = await asyncFactory();
            this.setExpiring(key, value, ttl, storageType);
        }
        
        return value;
    }

    // Migration and backup
    migrate(fromStorage, toStorage) {
        const fromAdapter = this.storage[fromStorage];
        const toAdapter = this.storage[toStorage];
        
        if (!fromAdapter || !toAdapter) {
            console.error('Invalid storage type for migration');
            return false;
        }

        const keys = fromAdapter.keys();
        let successCount = 0;
        
        keys.forEach(key => {
            const value = fromAdapter.get(key);
            if (value !== null && toAdapter.set(key, value)) {
                successCount++;
            }
        });

        return successCount;
    }

    export(storageType = 'local') {
        const adapter = this.storage[storageType];
        if (!adapter) return null;

        const data = {};
        const keys = adapter.keys();
        
        keys.forEach(key => {
            data[key] = adapter.get(key);
        });

        return {
            timestamp: new Date().toISOString(),
            storageType,
            keyPrefix: this.keyPrefix,
            data
        };
    }

    import(exportData, options = {}) {
        const {
            storageType = exportData.storageType || 'local',
            overwrite = false,
            validate = true
        } = options;

        const adapter = this.storage[storageType];
        if (!adapter) {
            console.error(`Invalid storage type: ${storageType}`);
            return false;
        }

        if (validate && (!exportData.data || typeof exportData.data !== 'object')) {
            console.error('Invalid export data format');
            return false;
        }

        let importCount = 0;
        
        Object.entries(exportData.data).forEach(([key, value]) => {
            if (overwrite || !this.exists(key, storageType)) {
                if (adapter.set(key, value)) {
                    importCount++;
                }
            }
        });

        return importCount;
    }

    // Cleanup and maintenance
    initializeCleanup() {
        // Clean expired items on initialization
        this.cleanupExpired();
        
        // Set up periodic cleanup (every 5 minutes)
        setInterval(() => {
            this.cleanupExpired();
        }, 5 * 60 * 1000);
    }

    cleanupExpired() {
        ['local', 'session'].forEach(storageType => {
            const keys = this.keys(storageType);
            
            keys.forEach(key => {
                const value = this.get(key, storageType); // This will auto-remove expired items
            });
        });
    }

    getStats() {
        const stats = {};
        
        Object.keys(this.storage).forEach(storageType => {
            const adapter = this.storage[storageType];
            stats[storageType] = {
                keys: adapter.keys().length,
                size: adapter.size(),
                sizeFormatted: this.formatSize(adapter.size())
            };
        });

        return stats;
    }

    formatSize(bytes) {
        if (bytes === 0) return '0 B';
        
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
    }

    // Feature detection
    isAvailable(storageType) {
        try {
            const storage = window[storageType];
            const testKey = '__storage_test__';
            storage.setItem(testKey, 'test');
            storage.removeItem(testKey);
            return true;
        } catch (error) {
            return false;
        }
    }

    getAvailableStorageTypes() {
        return Object.keys(this.storage).filter(type => 
            type === 'memory' || this.isAvailable(type + 'Storage')
        );
    }
}

// Create singleton instance
window.storageManager = window.storageManager || new StorageManager();

// Convenience methods on window object (backward compatibility)
window.Storage = {
    get: (key, storageType) => window.storageManager.get(key, storageType),
    set: (key, value, options) => window.storageManager.set(key, value, options),
    remove: (key, storageType) => window.storageManager.remove(key, storageType),
    clear: (storageType) => window.storageManager.clear(storageType)
};

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StorageManager;
}