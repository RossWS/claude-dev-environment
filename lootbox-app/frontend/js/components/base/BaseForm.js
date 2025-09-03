// Base form component with validation and submission handling
class BaseForm extends BaseComponent {
    constructor(selector, options = {}) {
        super(selector, options);
        this.validators = new Map();
        this.errors = new Map();
        this.isSubmitting = false;
    }

    getDefaultOptions() {
        return {
            validateOnInput: true,
            validateOnBlur: true,
            showInlineErrors: true,
            submitOnEnter: true,
            resetOnSuccess: false,
            preventDefaultSubmit: true
        };
    }

    setupEventListeners() {
        super.setupEventListeners();
        
        // Form submission
        if (this.element.tagName === 'FORM') {
            this.addEventListener(this.element, 'submit', this.handleSubmit);
        }
        
        // Real-time validation
        if (this.options.validateOnInput) {
            this.addEventListener(this.element, 'input', this.handleInput);
        }
        
        if (this.options.validateOnBlur) {
            this.addEventListener(this.element, 'blur', this.handleBlur, true);
        }
        
        // Enter key submission
        if (this.options.submitOnEnter) {
            this.addEventListener(this.element, 'keypress', this.handleKeypress);
        }
    }

    // Validation methods
    addValidator(fieldName, validator) {
        if (!this.validators.has(fieldName)) {
            this.validators.set(fieldName, []);
        }
        this.validators.get(fieldName).push(validator);
    }

    addRequiredValidator(fieldName, message = 'This field is required') {
        this.addValidator(fieldName, {
            validate: (value) => value && value.toString().trim().length > 0,
            message
        });
    }

    addEmailValidator(fieldName, message = 'Please enter a valid email address') {
        this.addValidator(fieldName, {
            validate: (value) => {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                return !value || emailRegex.test(value);
            },
            message
        });
    }

    addMinLengthValidator(fieldName, minLength, message) {
        this.addValidator(fieldName, {
            validate: (value) => !value || value.toString().length >= minLength,
            message: message || `Must be at least ${minLength} characters`
        });
    }

    addCustomValidator(fieldName, validatorFn, message) {
        this.addValidator(fieldName, {
            validate: validatorFn,
            message
        });
    }

    validateField(fieldName, value) {
        const fieldValidators = this.validators.get(fieldName);
        if (!fieldValidators) return true;

        const fieldErrors = [];

        for (const validator of fieldValidators) {
            try {
                const isValid = validator.validate(value);
                if (!isValid) {
                    fieldErrors.push(validator.message);
                }
            } catch (error) {
                console.error(`Validation error for field ${fieldName}:`, error);
                fieldErrors.push('Validation error occurred');
            }
        }

        if (fieldErrors.length > 0) {
            this.errors.set(fieldName, fieldErrors);
            return false;
        } else {
            this.errors.delete(fieldName);
            return true;
        }
    }

    validateForm() {
        const formData = this.getFormData();
        let isValid = true;

        // Clear previous errors
        this.errors.clear();

        // Validate each field
        for (const [fieldName, value] of Object.entries(formData)) {
            if (!this.validateField(fieldName, value)) {
                isValid = false;
            }
        }

        // Update UI
        if (this.options.showInlineErrors) {
            this.updateErrorDisplay();
        }

        return isValid;
    }

    updateErrorDisplay() {
        // Clear existing errors
        this.$$('.error-message').forEach(el => el.remove());
        this.$$('.error, .invalid').forEach(el => {
            el.classList.remove('error', 'invalid');
        });

        // Show new errors
        for (const [fieldName, fieldErrors] of this.errors.entries()) {
            const field = this.$(`[name="${fieldName}"], #${fieldName}`);
            if (!field) continue;

            // Add error class to field
            field.classList.add('error', 'invalid');

            // Create error message
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            errorDiv.textContent = fieldErrors[0]; // Show first error

            // Insert error message
            const parent = field.parentNode;
            const existingError = parent.querySelector('.error-message');
            if (existingError) {
                existingError.remove();
            }
            parent.appendChild(errorDiv);
        }
    }

    // Form data methods
    getFormData() {
        const data = {};
        const formData = new FormData(this.element);
        
        for (const [key, value] of formData.entries()) {
            data[key] = value;
        }
        
        return data;
    }

    setFormData(data) {
        for (const [fieldName, value] of Object.entries(data)) {
            const field = this.$(`[name="${fieldName}"]`);
            if (field) {
                if (field.type === 'checkbox' || field.type === 'radio') {
                    field.checked = value;
                } else {
                    field.value = value;
                }
            }
        }
    }

    reset() {
        if (this.element.tagName === 'FORM') {
            this.element.reset();
        }
        
        this.errors.clear();
        this.updateErrorDisplay();
        this.onReset();
    }

    // Event handlers
    handleSubmit(e) {
        if (this.options.preventDefaultSubmit) {
            e.preventDefault();
        }
        
        this.submit();
    }

    handleInput(e) {
        if (e.target.name) {
            this.validateField(e.target.name, e.target.value);
            if (this.options.showInlineErrors) {
                this.updateErrorDisplay();
            }
        }
    }

    handleBlur(e) {
        if (e.target.name) {
            this.validateField(e.target.name, e.target.value);
            if (this.options.showInlineErrors) {
                this.updateErrorDisplay();
            }
        }
    }

    handleKeypress(e) {
        if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
            this.submit();
        }
    }

    // Submit handling
    async submit() {
        if (this.isSubmitting) return;
        
        try {
            this.isSubmitting = true;
            this.setSubmittingState(true);
            
            // Validate form
            if (!this.validateForm()) {
                this.onValidationError();
                return;
            }
            
            const formData = this.getFormData();
            
            // Call submission hook
            const result = await this.onSubmit(formData);
            
            if (result !== false) {
                this.onSuccess(result);
                
                if (this.options.resetOnSuccess) {
                    this.reset();
                }
            }
            
        } catch (error) {
            this.handleError(error, 'submit');
            this.onError(error);
        } finally {
            this.isSubmitting = false;
            this.setSubmittingState(false);
        }
    }

    setSubmittingState(isSubmitting) {
        const submitButton = this.$('button[type="submit"], .submit-btn');
        if (submitButton) {
            submitButton.disabled = isSubmitting;
            
            if (isSubmitting) {
                this.originalButtonText = submitButton.textContent;
                submitButton.textContent = 'Submitting...';
                submitButton.classList.add('loading');
            } else {
                submitButton.textContent = this.originalButtonText || submitButton.textContent.replace('Submitting...', 'Submit');
                submitButton.classList.remove('loading');
            }
        }
    }

    // Hooks for subclasses
    async onSubmit(formData) {
        // Override in subclasses - return false to prevent success handling
    }

    onSuccess(result) {
        // Override in subclasses
    }

    onValidationError() {
        // Override in subclasses
    }

    onReset() {
        // Override in subclasses
    }

    onError(error) {
        // Override in subclasses
        console.error('Form submission error:', error);
    }
}