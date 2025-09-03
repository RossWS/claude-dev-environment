// Base component class with common functionality
class BaseComponent {
    constructor(selector, options = {}) {
        this.selector = selector;
        this.element = typeof selector === 'string' ? document.querySelector(selector) : selector;
        this.options = { ...this.getDefaultOptions(), ...options };
        this.isInitialized = false;
        this.eventListeners = new Map();
        
        if (!this.element) {
            console.warn(`BaseComponent: Element not found for selector "${selector}"`);
            return;
        }
        
        this.init();
    }

    getDefaultOptions() {
        return {};
    }

    init() {
        if (this.isInitialized) return;
        
        this.setupEventListeners();
        this.render();
        this.isInitialized = true;
        this.onInit();
    }

    onInit() {
        // Override in subclasses
    }

    setupEventListeners() {
        // Override in subclasses
    }

    render() {
        // Override in subclasses
    }

    // Event handling utilities
    addEventListener(element, event, handler, options = {}) {
        const boundHandler = handler.bind(this);
        element.addEventListener(event, boundHandler, options);
        
        // Store for cleanup
        const key = `${element.constructor.name}_${event}_${Date.now()}`;
        this.eventListeners.set(key, { element, event, handler: boundHandler });
        
        return key;
    }

    removeEventListener(key) {
        const listener = this.eventListeners.get(key);
        if (listener) {
            listener.element.removeEventListener(listener.event, listener.handler);
            this.eventListeners.delete(key);
        }
    }

    // DOM utilities
    $(selector) {
        return this.element.querySelector(selector);
    }

    $$(selector) {
        return Array.from(this.element.querySelectorAll(selector));
    }

    addClass(className) {
        this.element.classList.add(className);
        return this;
    }

    removeClass(className) {
        this.element.classList.remove(className);
        return this;
    }

    toggleClass(className) {
        this.element.classList.toggle(className);
        return this;
    }

    hasClass(className) {
        return this.element.classList.contains(className);
    }

    show() {
        this.removeClass('hidden');
        return this;
    }

    hide() {
        this.addClass('hidden');
        return this;
    }

    toggle() {
        this.toggleClass('hidden');
        return this;
    }

    // State management
    setState(newState, shouldRender = true) {
        this.state = { ...this.state, ...newState };
        if (shouldRender) {
            this.render();
        }
        this.onStateChange(newState);
    }

    onStateChange(changedState) {
        // Override in subclasses
    }

    // Lifecycle methods
    destroy() {
        // Remove all event listeners
        this.eventListeners.forEach((listener, key) => {
            this.removeEventListener(key);
        });
        
        // Call cleanup hook
        this.onDestroy();
        
        this.isInitialized = false;
    }

    onDestroy() {
        // Override in subclasses
    }

    // Utility methods
    debounce(func, wait) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    throttle(func, limit) {
        let inThrottle;
        return (...args) => {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // Template rendering
    renderTemplate(template, data = {}) {
        const compiled = template.replace(/\{\{(.*?)\}\}/g, (match, key) => {
            const value = key.split('.').reduce((obj, prop) => obj?.[prop], data);
            return value !== undefined ? value : '';
        });
        return compiled;
    }

    // Error handling
    handleError(error, context = '') {
        console.error(`${this.constructor.name} Error ${context}:`, error);
        this.onError(error, context);
    }

    onError(error, context) {
        // Override in subclasses
    }
}