// Base modal component with standardized behavior
class BaseModal extends BaseComponent {
    constructor(selector, options = {}) {
        super(selector, options);
        this.isOpen = false;
        this.backdrop = null;
    }

    getDefaultOptions() {
        return {
            closeOnBackdrop: true,
            closeOnEscape: true,
            showCloseButton: true,
            backdrop: true,
            animation: 'fade',
            zIndex: 1000
        };
    }

    init() {
        super.init();
        this.createBackdrop();
        this.setupKeyboardHandling();
    }

    createBackdrop() {
        if (!this.options.backdrop) return;
        
        this.backdrop = document.createElement('div');
        this.backdrop.className = 'modal-backdrop';
        this.backdrop.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: ${this.options.zIndex - 1};
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.3s ease, visibility 0.3s ease;
        `;
        
        if (this.options.closeOnBackdrop) {
            this.addEventListener(this.backdrop, 'click', this.close);
        }
        
        document.body.appendChild(this.backdrop);
    }

    setupKeyboardHandling() {
        if (this.options.closeOnEscape) {
            this.keyHandler = (e) => {
                if (e.key === 'Escape' && this.isOpen) {
                    this.close();
                }
            };
            document.addEventListener('keydown', this.keyHandler);
        }
    }

    setupEventListeners() {
        super.setupEventListeners();
        
        // Close button
        if (this.options.showCloseButton) {
            const closeBtn = this.$('.modal-close, .close-modal, [data-close-modal]');
            if (closeBtn) {
                this.addEventListener(closeBtn, 'click', this.close);
            }
        }
    }

    open() {
        if (this.isOpen) return Promise.resolve();
        
        return new Promise((resolve) => {
            this.isOpen = true;
            
            // Show modal
            this.element.style.zIndex = this.options.zIndex;
            this.show();
            
            // Show backdrop
            if (this.backdrop) {
                this.backdrop.style.visibility = 'visible';
                this.backdrop.style.opacity = '1';
            }
            
            // Add animation classes
            if (this.options.animation === 'fade') {
                this.addClass('modal-fade-in');
            } else if (this.options.animation === 'scale') {
                this.addClass('modal-scale-in');
            }
            
            // Prevent body scroll
            document.body.style.overflow = 'hidden';
            
            // Focus management
            this.trapFocus();
            
            // Callback
            this.onOpen();
            
            // Resolve after animation
            setTimeout(resolve, 300);
        });
    }

    close() {
        if (!this.isOpen) return Promise.resolve();
        
        return new Promise((resolve) => {
            this.isOpen = false;
            
            // Add closing animation
            if (this.options.animation === 'fade') {
                this.addClass('modal-fade-out');
                this.removeClass('modal-fade-in');
            } else if (this.options.animation === 'scale') {
                this.addClass('modal-scale-out');
                this.removeClass('modal-scale-in');
            }
            
            // Hide backdrop
            if (this.backdrop) {
                this.backdrop.style.opacity = '0';
                this.backdrop.style.visibility = 'hidden';
            }
            
            setTimeout(() => {
                // Hide modal
                this.hide();
                
                // Remove animation classes
                this.removeClass('modal-fade-out', 'modal-scale-out');
                
                // Restore body scroll
                document.body.style.overflow = '';
                
                // Restore focus
                this.restoreFocus();
                
                // Callback
                this.onClose();
                
                resolve();
            }, 300);
        });
    }

    toggle() {
        return this.isOpen ? this.close() : this.open();
    }

    trapFocus() {
        this.previousActiveElement = document.activeElement;
        
        const focusableElements = this.$$('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        
        if (focusableElements.length === 0) return;
        
        this.firstFocusable = focusableElements[0];
        this.lastFocusable = focusableElements[focusableElements.length - 1];
        
        // Focus first element
        this.firstFocusable.focus();
        
        // Tab trap
        this.tabTrapHandler = (e) => {
            if (e.key !== 'Tab') return;
            
            if (e.shiftKey) {
                if (document.activeElement === this.firstFocusable) {
                    e.preventDefault();
                    this.lastFocusable.focus();
                }
            } else {
                if (document.activeElement === this.lastFocusable) {
                    e.preventDefault();
                    this.firstFocusable.focus();
                }
            }
        };
        
        this.element.addEventListener('keydown', this.tabTrapHandler);
    }

    restoreFocus() {
        if (this.tabTrapHandler) {
            this.element.removeEventListener('keydown', this.tabTrapHandler);
        }
        
        if (this.previousActiveElement) {
            this.previousActiveElement.focus();
        }
    }

    setContent(content) {
        const contentArea = this.$('.modal-content, .modal-body');
        if (contentArea) {
            contentArea.innerHTML = content;
        }
    }

    setTitle(title) {
        const titleArea = this.$('.modal-title, .modal-header h2, .modal-header h3');
        if (titleArea) {
            titleArea.textContent = title;
        }
    }

    // Lifecycle hooks
    onOpen() {
        // Override in subclasses
    }

    onClose() {
        // Override in subclasses
    }

    destroy() {
        super.destroy();
        
        // Remove backdrop
        if (this.backdrop && this.backdrop.parentNode) {
            this.backdrop.parentNode.removeChild(this.backdrop);
        }
        
        // Remove keyboard handler
        if (this.keyHandler) {
            document.removeEventListener('keydown', this.keyHandler);
        }
        
        // Restore body scroll
        document.body.style.overflow = '';
    }
}