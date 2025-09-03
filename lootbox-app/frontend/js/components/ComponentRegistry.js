// Component Registry - Manages component lifecycle and dependencies
class ComponentRegistry {
    constructor() {
        this.components = new Map();
        this.instances = new Map();
        this.dependencies = new Map();
        this.loadOrder = [];
        this.isInitialized = false;
    }

    // Register component classes
    register(name, componentClass, dependencies = []) {
        this.components.set(name, {
            class: componentClass,
            dependencies,
            singleton: true, // Default to singleton
            initialized: false
        });

        this.dependencies.set(name, dependencies);
        this.updateLoadOrder();
    }

    // Register multiple components at once
    registerMany(componentMap) {
        Object.entries(componentMap).forEach(([name, config]) => {
            if (typeof config === 'function') {
                this.register(name, config);
            } else {
                this.register(name, config.class, config.dependencies || []);
            }
        });
    }

    // Create component instance
    create(name, selector, options = {}) {
        const componentConfig = this.components.get(name);
        
        if (!componentConfig) {
            throw new Error(`Component '${name}' not registered`);
        }

        // Check if singleton already exists
        if (componentConfig.singleton && this.instances.has(name)) {
            return this.instances.get(name);
        }

        // Resolve dependencies first
        const resolvedDeps = this.resolveDependencies(name);

        // Create instance
        const ComponentClass = componentConfig.class;
        const instance = new ComponentClass(selector, {
            ...options,
            dependencies: resolvedDeps,
            registry: this
        });

        // Store instance if singleton
        if (componentConfig.singleton) {
            this.instances.set(name, instance);
        }

        // Mark as initialized
        componentConfig.initialized = true;

        return instance;
    }

    // Get existing instance
    get(name) {
        return this.instances.get(name);
    }

    // Check if component exists
    has(name) {
        return this.components.has(name);
    }

    // Initialize all registered components
    async initialize() {
        if (this.isInitialized) {
            console.warn('ComponentRegistry already initialized');
            return;
        }

        console.log('🔧 Initializing component registry...');
        
        try {
            // Initialize components in dependency order
            for (const componentName of this.loadOrder) {
                await this.initializeComponent(componentName);
            }

            this.isInitialized = true;
            console.log('✅ Component registry initialized');
            
            // Emit initialization complete event
            if (window.eventBus) {
                window.eventBus.emit('registry:initialized');
            }

        } catch (error) {
            console.error('❌ Component registry initialization failed:', error);
            throw error;
        }
    }

    // Initialize single component
    async initializeComponent(name) {
        const componentConfig = this.components.get(name);
        
        if (!componentConfig || componentConfig.initialized) {
            return;
        }

        console.log(`🔧 Initializing component: ${name}`);

        // Find component selector
        const selector = this.findComponentSelector(name);
        
        if (!selector) {
            console.warn(`⚠️ No element found for component: ${name}`);
            return;
        }

        try {
            // Create component instance
            const instance = this.create(name, selector);
            
            // Auto-render if method exists
            if (typeof instance.render === 'function') {
                await instance.render();
            }

            console.log(`✅ Component initialized: ${name}`);

        } catch (error) {
            console.error(`❌ Failed to initialize component ${name}:`, error);
            throw error;
        }
    }

    // Find DOM element for component
    findComponentSelector(name) {
        // Try various selector strategies
        const strategies = [
            `#${name}Container`,
            `#${name}`,
            `.${name}-container`,
            `.${name}`,
            `[data-component="${name}"]`,
            `[data-${name}]`
        ];

        for (const selector of strategies) {
            try {
                const element = document.querySelector(selector);
                if (element) {
                    return element;
                }
            } catch (error) {
                console.warn(`Error finding element with selector "${selector}":`, error);
            }
        }

        return null;
    }

    // Resolve component dependencies
    resolveDependencies(name) {
        const dependencies = this.dependencies.get(name) || [];
        const resolved = {};

        dependencies.forEach(depName => {
            if (this.instances.has(depName)) {
                resolved[depName] = this.instances.get(depName);
            } else if (this.components.has(depName)) {
                // Try to create dependency if not exists
                const selector = this.findComponentSelector(depName);
                if (selector) {
                    resolved[depName] = this.create(depName, selector);
                }
            } else {
                console.warn(`Dependency '${depName}' not found for component '${name}'`);
            }
        });

        return resolved;
    }

    // Update component load order based on dependencies
    updateLoadOrder() {
        const visited = new Set();
        const visiting = new Set();
        const order = [];

        const visit = (name) => {
            if (visiting.has(name)) {
                throw new Error(`Circular dependency detected involving '${name}'`);
            }

            if (visited.has(name)) {
                return;
            }

            visiting.add(name);

            const deps = this.dependencies.get(name) || [];
            deps.forEach(dep => {
                if (this.components.has(dep)) {
                    visit(dep);
                }
            });

            visiting.delete(name);
            visited.add(name);
            order.push(name);
        };

        // Visit all components
        Array.from(this.components.keys()).forEach(name => {
            if (!visited.has(name)) {
                visit(name);
            }
        });

        this.loadOrder = order;
    }

    // Destroy component instance
    destroy(name) {
        const instance = this.instances.get(name);
        
        if (instance) {
            if (typeof instance.destroy === 'function') {
                instance.destroy();
            }
            
            this.instances.delete(name);
            
            const componentConfig = this.components.get(name);
            if (componentConfig) {
                componentConfig.initialized = false;
            }
        }
    }

    // Destroy all instances
    destroyAll() {
        Array.from(this.instances.keys()).forEach(name => {
            this.destroy(name);
        });
        
        this.isInitialized = false;
    }

    // Get component info
    getInfo(name) {
        const componentConfig = this.components.get(name);
        const instance = this.instances.get(name);
        
        return {
            registered: !!componentConfig,
            initialized: componentConfig?.initialized || false,
            hasInstance: !!instance,
            dependencies: this.dependencies.get(name) || [],
            singleton: componentConfig?.singleton || false
        };
    }

    // Get registry stats
    getStats() {
        return {
            registered: this.components.size,
            initialized: Array.from(this.components.values()).filter(c => c.initialized).length,
            instances: this.instances.size,
            loadOrder: [...this.loadOrder],
            isInitialized: this.isInitialized
        };
    }

    // Debug methods
    listComponents() {
        const list = [];
        
        this.components.forEach((config, name) => {
            list.push({
                name,
                initialized: config.initialized,
                hasInstance: this.instances.has(name),
                dependencies: this.dependencies.get(name) || []
            });
        });

        return list;
    }

    // Auto-discover and register components from global scope
    autoRegister(prefix = '') {
        const discovered = [];
        
        // Look for component classes in global scope
        Object.keys(window).forEach(key => {
            if (key.startsWith(prefix) && typeof window[key] === 'function') {
                const componentName = key.replace(prefix, '').toLowerCase();
                
                if (!this.components.has(componentName)) {
                    this.register(componentName, window[key]);
                    discovered.push(componentName);
                }
            }
        });

        console.log(`Auto-registered ${discovered.length} components:`, discovered);
        return discovered;
    }
}

// Create global instance
window.componentRegistry = window.componentRegistry || new ComponentRegistry();

// Auto-register common components when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Ensure componentRegistry exists before using it
    if (!window.componentRegistry) return;
    
    const registry = window.componentRegistry;
    
    // Register base components
    if (typeof BaseComponent !== 'undefined') {
        registry.register('base', BaseComponent);
    }
    
    if (typeof BaseModal !== 'undefined') {
        registry.register('modal', BaseModal, ['base']);
    }
    
    if (typeof BaseForm !== 'undefined') {
        registry.register('form', BaseForm, ['base']);
    }

    // Register admin components
    if (typeof AdminDashboard !== 'undefined') {
        registry.register('adminDashboard', AdminDashboard, ['base']);
    }
    
    if (typeof ContentManager !== 'undefined') {
        registry.register('contentManager', ContentManager, ['base']);
    }
    
    if (typeof UserManagement !== 'undefined') {
        registry.register('userManagement', UserManagement, ['base']);
    }
    
    if (typeof SystemSettings !== 'undefined') {
        registry.register('systemSettings', SystemSettings, ['base', 'form']);
    }

    // Register profile components
    if (typeof ProfileEditor !== 'undefined') {
        registry.register('profileEditor', ProfileEditor, ['base', 'form']);
    }
    
    if (typeof ShowcaseManager !== 'undefined') {
        registry.register('showcaseManager', ShowcaseManager, ['base']);
    }
    
    if (typeof StatisticsDisplay !== 'undefined') {
        registry.register('statisticsDisplay', StatisticsDisplay, ['base']);
    }

    // Register trophy components
    if (typeof TrophyGrid !== 'undefined') {
        registry.register('trophyGrid', TrophyGrid, ['base']);
    }
    
    if (typeof TrophyFilters !== 'undefined') {
        registry.register('trophyFilters', TrophyFilters, ['base']);
    }
    
    if (typeof RarityManager !== 'undefined') {
        registry.register('rarityManager', RarityManager, ['base']);
    }
    
    if (typeof ExportManager !== 'undefined') {
        registry.register('exportManager', ExportManager, ['base']);
    }

    console.log('📋 Component registry setup complete');
});

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ComponentRegistry;
}