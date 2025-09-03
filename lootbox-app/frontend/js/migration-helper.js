// Migration Helper - Helps transition from old to new component architecture
class MigrationHelper {
    constructor() {
        this.legacyComponents = new Map();
        this.migrationLog = [];
        this.compatibility = true;
        
        this.setupLegacySupport();
    }

    setupLegacySupport() {
        // Preserve legacy component instances
        this.preserveLegacyInstances();
        
        // Create compatibility bridges
        this.createCompatibilityBridges();
        
        // Set up migration warnings
        this.setupMigrationWarnings();
    }

    preserveLegacyInstances() {
        // Store references to existing components
        const legacyComponents = [
            'AdminPanel',
            'UserProfile', 
            'TrophyCabinet',
            'UIManager',
            'AuthManager',
            'DiscoveryBoxGame'
        ];

        legacyComponents.forEach(componentName => {
            if (window[componentName]) {
                this.legacyComponents.set(componentName, window[componentName]);
                this.log(`Preserved legacy component: ${componentName}`);
            }
        });
    }

    createCompatibilityBridges() {
        // Create bridges between old and new components
        this.bridgeAdminComponents();
        this.bridgeProfileComponents();
        this.bridgeTrophyComponents();
    }

    bridgeAdminComponents() {
        // Bridge old AdminPanel to new components
        if (this.legacyComponents.has('AdminPanel')) {
            const legacyAdmin = this.legacyComponents.get('AdminPanel');
            
            // Create wrapper that delegates to new components
            window.AdminPanel = class AdminPanelBridge {
                constructor() {
                    this.legacy = new legacyAdmin();
                    this.newComponents = {
                        dashboard: null,
                        contentManager: null,
                        userManagement: null,
                        systemSettings: null
                    };
                }

                async showAdminScreen() {
                    // Try new components first, fall back to legacy
                    if (window.componentRegistry) {
                        try {
                            const dashboard = window.componentRegistry.get('adminDashboard');
                            if (dashboard) {
                                return dashboard.render();
                            }
                        } catch (error) {
                            this.log('Failed to use new admin components, falling back to legacy');
                        }
                    }
                    
                    return this.legacy.showAdminScreen();
                }

                switchTab(tabName) {
                    // Delegate to appropriate new component or legacy
                    const componentMap = {
                        'dashboard': 'adminDashboard',
                        'content': 'contentManager', 
                        'users': 'userManagement',
                        'settings': 'systemSettings'
                    };

                    const newComponentName = componentMap[tabName];
                    if (newComponentName && window.componentRegistry) {
                        const component = window.componentRegistry.get(newComponentName);
                        if (component && component.render) {
                            return component.render();
                        }
                    }

                    return this.legacy.switchTab(tabName);
                }
            };
        }
    }

    bridgeProfileComponents() {
        if (this.legacyComponents.has('UserProfile')) {
            const legacyProfile = this.legacyComponents.get('UserProfile');
            
            window.UserProfile = class UserProfileBridge {
                constructor() {
                    this.legacy = new legacyProfile();
                    this.newComponents = {};
                }

                async showProfile() {
                    if (window.componentRegistry) {
                        try {
                            const profileEditor = window.componentRegistry.get('profileEditor');
                            if (profileEditor) {
                                return profileEditor.render();
                            }
                        } catch (error) {
                            this.log('Failed to use new profile components, falling back to legacy');
                        }
                    }
                    
                    return this.legacy.showProfile();
                }

                switchTab(tabName) {
                    const componentMap = {
                        'overview': 'profileEditor',
                        'showcase': 'showcaseManager',
                        'statistics': 'statisticsDisplay'
                    };

                    const newComponentName = componentMap[tabName];
                    if (newComponentName && window.componentRegistry) {
                        const component = window.componentRegistry.get(newComponentName);
                        if (component && component.render) {
                            return component.render();
                        }
                    }

                    return this.legacy.switchTab(tabName);
                }
            };
        }
    }

    bridgeTrophyComponents() {
        if (this.legacyComponents.has('TrophyCabinet')) {
            const legacyTrophy = this.legacyComponents.get('TrophyCabinet');
            
            window.TrophyCabinet = class TrophyCabinetBridge {
                constructor() {
                    this.legacy = new legacyTrophy();
                }

                async showTrophies() {
                    if (window.componentRegistry) {
                        try {
                            const trophyGrid = window.componentRegistry.get('trophyGrid');
                            const trophyFilters = window.componentRegistry.get('trophyFilters');
                            
                            if (trophyGrid && trophyFilters) {
                                await Promise.all([
                                    trophyGrid.render(),
                                    trophyFilters.render()
                                ]);
                                return;
                            }
                        } catch (error) {
                            this.log('Failed to use new trophy components, falling back to legacy');
                        }
                    }
                    
                    return this.legacy.showTrophies();
                }

                applyFilters() {
                    const filters = window.componentRegistry?.get('trophyFilters');
                    const grid = window.componentRegistry?.get('trophyGrid');
                    
                    if (filters && grid) {
                        const filterData = filters.getFilters();
                        const filteredTrophies = filters.applyFilters(grid.getTrophies());
                        grid.setTrophies(filteredTrophies);
                        return;
                    }

                    return this.legacy.applyFilters();
                }
            };
        }
    }

    setupMigrationWarnings() {
        // Warn about deprecated methods
        const deprecatedMethods = [
            'AdminPanel.prototype.loadContent',
            'UserProfile.prototype.loadShowcase', 
            'TrophyCabinet.prototype.loadTrophies'
        ];

        deprecatedMethods.forEach(methodPath => {
            this.wrapDeprecatedMethod(methodPath);
        });
    }

    wrapDeprecatedMethod(methodPath) {
        const [className, , methodName] = methodPath.split('.');
        const ComponentClass = window[className];
        
        if (ComponentClass && ComponentClass.prototype[methodName]) {
            const originalMethod = ComponentClass.prototype[methodName];
            
            ComponentClass.prototype[methodName] = function(...args) {
                console.warn(`⚠️ DEPRECATED: ${methodPath} is deprecated. Please use the new component architecture.`);
                return originalMethod.apply(this, args);
            };
        }
    }

    // Migration utilities
    migrateComponentData(fromComponent, toComponent) {
        try {
            // Transfer common properties
            const commonProperties = ['data', 'state', 'options', 'filters'];
            
            commonProperties.forEach(prop => {
                if (fromComponent[prop] && typeof toComponent.setState === 'function') {
                    toComponent.setState({ [prop]: fromComponent[prop] });
                }
            });

            this.log(`Migrated data from ${fromComponent.constructor.name} to ${toComponent.constructor.name}`);
            return true;
        } catch (error) {
            this.log(`Failed to migrate component data: ${error.message}`);
            return false;
        }
    }

    checkCompatibility() {
        const issues = [];

        // Check if new components are loaded
        const requiredComponents = [
            'BaseComponent',
            'AdminDashboard', 
            'ProfileEditor',
            'TrophyGrid'
        ];

        requiredComponents.forEach(componentName => {
            if (!window[componentName]) {
                issues.push(`Missing new component: ${componentName}`);
            }
        });

        // Check if services are loaded
        const requiredServices = ['stateManager', 'eventBus', 'storageManager'];
        
        requiredServices.forEach(serviceName => {
            if (!window[serviceName]) {
                issues.push(`Missing service: ${serviceName}`);
            }
        });

        if (issues.length > 0) {
            console.error('❌ Compatibility issues found:', issues);
            this.compatibility = false;
        } else {
            console.log('✅ All compatibility checks passed');
            this.compatibility = true;
        }

        return this.compatibility;
    }

    // Progressive migration methods
    enableNewComponents() {
        if (!this.checkCompatibility()) {
            console.warn('Cannot enable new components due to compatibility issues');
            return false;
        }

        // Gradually replace legacy components with new ones
        this.replaceAdminComponents();
        this.replaceProfileComponents();
        this.replaceTrophyComponents();

        this.log('New components enabled successfully');
        return true;
    }

    replaceAdminComponents() {
        if (window.componentRegistry && window.componentRegistry.has('adminDashboard')) {
            // Replace legacy admin with new components
            const adminContainer = document.querySelector('#adminScreen');
            if (adminContainer) {
                // Initialize new admin components
                ['adminDashboard', 'contentManager', 'userManagement', 'systemSettings'].forEach(componentName => {
                    try {
                        window.componentRegistry.create(componentName, adminContainer);
                    } catch (error) {
                        this.log(`Failed to initialize ${componentName}: ${error.message}`);
                    }
                });
            }
        }
    }

    replaceProfileComponents() {
        if (window.componentRegistry && window.componentRegistry.has('profileEditor')) {
            const profileContainer = document.querySelector('#profileScreen');
            if (profileContainer) {
                ['profileEditor', 'showcaseManager', 'statisticsDisplay'].forEach(componentName => {
                    try {
                        window.componentRegistry.create(componentName, profileContainer);
                    } catch (error) {
                        this.log(`Failed to initialize ${componentName}: ${error.message}`);
                    }
                });
            }
        }
    }

    replaceTrophyComponents() {
        if (window.componentRegistry && window.componentRegistry.has('trophyGrid')) {
            const trophyContainer = document.querySelector('#trophyScreen');
            if (trophyContainer) {
                ['trophyGrid', 'trophyFilters', 'rarityManager', 'exportManager'].forEach(componentName => {
                    try {
                        window.componentRegistry.create(componentName, trophyContainer);
                    } catch (error) {
                        this.log(`Failed to initialize ${componentName}: ${error.message}`);
                    }
                });
            }
        }
    }

    // Rollback mechanism
    rollbackToLegacy() {
        console.warn('🔄 Rolling back to legacy components...');
        
        // Restore original components
        this.legacyComponents.forEach((ComponentClass, name) => {
            window[name] = ComponentClass;
        });

        // Disable new component registry
        if (window.componentRegistry) {
            window.componentRegistry.destroyAll();
        }

        this.log('Rolled back to legacy components');
    }

    // Logging
    log(message) {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] ${message}`;
        this.migrationLog.push(logEntry);
        console.log(`[Migration] ${message}`);
    }

    getMigrationLog() {
        return [...this.migrationLog];
    }

    // Public API
    getStatus() {
        return {
            compatibility: this.compatibility,
            legacyComponents: Array.from(this.legacyComponents.keys()),
            migrationLog: this.migrationLog.length,
            newComponentsEnabled: window.componentRegistry?.isInitialized || false
        };
    }
}

// Initialize migration helper
window.migrationHelper = new MigrationHelper();

// Auto-enable new components if compatible
document.addEventListener('DOMContentLoaded', () => {
    try {
        if (window.migrationHelper && window.migrationHelper.checkCompatibility()) {
            setTimeout(() => {
                try {
                    window.migrationHelper.enableNewComponents();
                } catch (error) {
                    console.warn('Failed to enable new components:', error);
                }
            }, 1000); // Give time for all components to load
        }
    } catch (error) {
        console.warn('Migration helper compatibility check failed:', error);
    }
});

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MigrationHelper;
}