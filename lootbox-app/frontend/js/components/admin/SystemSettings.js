// System Settings Component - handles application configuration
class SystemSettings extends BaseComponent {
    constructor(selector, options = {}) {
        super(selector, options);
        this.settings = [];
        this.settingsForm = null;
        this.isDirty = false;
    }

    getDefaultOptions() {
        return {
            autoSave: false,
            confirmBeforeLeave: true,
            groupSettings: true
        };
    }

    setupEventListeners() {
        super.setupEventListeners();
        
        // Save settings button
        const saveBtn = this.$('#saveSettingsBtn');
        if (saveBtn) {
            this.addEventListener(saveBtn, 'click', this.saveSettings);
        }

        // Reset settings button
        const resetBtn = this.$('#resetSettingsBtn');
        if (resetBtn) {
            this.addEventListener(resetBtn, 'click', this.resetSettings);
        }

        // Export/Import buttons
        const exportBtn = this.$('#exportSettingsBtn');
        const importBtn = this.$('#importSettingsBtn');
        const importFile = this.$('#importSettingsFile');
        
        if (exportBtn) {
            this.addEventListener(exportBtn, 'click', this.exportSettings);
        }
        
        if (importBtn) {
            this.addEventListener(importBtn, 'click', () => importFile?.click());
        }
        
        if (importFile) {
            this.addEventListener(importFile, 'change', this.importSettings);
        }

        // Track form changes
        this.addEventListener(this.element, 'input', this.onSettingChange);
        this.addEventListener(this.element, 'change', this.onSettingChange);

        // Confirm before leaving if dirty
        if (this.options.confirmBeforeLeave) {
            window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
        }
    }

    async render() {
        await this.loadSettings();
        this.renderSettings();
        this.initializeFormValidation();
    }

    async loadSettings() {
        try {
            const response = await apiClient.get('/admin/settings');
            
            if (response.success) {
                this.settings = response.data.settings || [];
            }
        } catch (error) {
            this.handleError(error, 'loading settings');
        }
    }

    renderSettings() {
        const container = this.$('#adminSettingsForm');
        
        if (!container) return;

        if (this.settings.length === 0) {
            container.innerHTML = '<div class="no-data">No settings available</div>';
            return;
        }

        const groupedSettings = this.groupSettingsByCategory();
        const settingsHTML = Object.entries(groupedSettings)
            .map(([category, settings]) => this.renderSettingsGroup(category, settings))
            .join('');

        container.innerHTML = settingsHTML;
        this.settingsForm = container;
    }

    groupSettingsByCategory() {
        const grouped = {};
        
        this.settings.forEach(setting => {
            const category = setting.category || 'General';
            if (!grouped[category]) {
                grouped[category] = [];
            }
            grouped[category].push(setting);
        });

        return grouped;
    }

    renderSettingsGroup(category, settings) {
        const settingsHTML = settings.map(setting => this.renderSetting(setting)).join('');
        
        return `
            <div class="settings-group">
                <h3 class="settings-group-title">${Utils.escapeHtml(category)}</h3>
                <div class="settings-group-content">
                    ${settingsHTML}
                </div>
            </div>
        `;
    }

    renderSetting(setting) {
        const { key, value, type, label, description, options, required, min, max } = setting;
        
        let inputHTML = '';
        
        switch (type) {
            case 'boolean':
                inputHTML = `
                    <div class="setting-toggle">
                        <input type="checkbox" 
                               id="setting_${key}" 
                               name="${key}" 
                               ${value ? 'checked' : ''}
                               ${required ? 'required' : ''}>
                        <label for="setting_${key}" class="toggle-label"></label>
                    </div>
                `;
                break;
                
            case 'select':
                const optionsHTML = (options || []).map(option => 
                    `<option value="${option.value}" ${option.value === value ? 'selected' : ''}>
                        ${Utils.escapeHtml(option.label)}
                    </option>`
                ).join('');
                
                inputHTML = `
                    <select id="setting_${key}" 
                            name="${key}" 
                            class="setting-select"
                            ${required ? 'required' : ''}>
                        ${optionsHTML}
                    </select>
                `;
                break;
                
            case 'number':
                inputHTML = `
                    <input type="number" 
                           id="setting_${key}" 
                           name="${key}" 
                           value="${value || ''}"
                           class="setting-input"
                           ${required ? 'required' : ''}
                           ${min !== undefined ? `min="${min}"` : ''}
                           ${max !== undefined ? `max="${max}"` : ''}>
                `;
                break;
                
            case 'textarea':
                inputHTML = `
                    <textarea id="setting_${key}" 
                              name="${key}" 
                              class="setting-textarea"
                              rows="4"
                              ${required ? 'required' : ''}>${Utils.escapeHtml(value || '')}</textarea>
                `;
                break;
                
            default: // text
                inputHTML = `
                    <input type="text" 
                           id="setting_${key}" 
                           name="${key}" 
                           value="${Utils.escapeHtml(value || '')}"
                           class="setting-input"
                           ${required ? 'required' : ''}>
                `;
        }

        return `
            <div class="setting-item" data-key="${key}">
                <div class="setting-header">
                    <label for="setting_${key}" class="setting-label">
                        ${Utils.escapeHtml(label)}
                        ${required ? '<span class="required">*</span>' : ''}
                    </label>
                </div>
                
                <div class="setting-input-wrapper">
                    ${inputHTML}
                </div>
                
                ${description ? `
                    <div class="setting-description">
                        ${Utils.escapeHtml(description)}
                    </div>
                ` : ''}
                
                <div class="setting-error hidden"></div>
            </div>
        `;
    }

    initializeFormValidation() {
        if (!this.settingsForm) return;

        // Add validation to required fields
        this.$$('input[required], select[required], textarea[required]').forEach(field => {
            this.addEventListener(field, 'blur', () => this.validateField(field));
        });
    }

    validateField(field) {
        const errorContainer = field.closest('.setting-item')?.querySelector('.setting-error');
        if (!errorContainer) return true;

        let isValid = true;
        let errorMessage = '';

        // Required validation
        if (field.required && !field.value.trim()) {
            isValid = false;
            errorMessage = 'This field is required';
        }
        
        // Number validation
        else if (field.type === 'number') {
            const value = parseFloat(field.value);
            const min = field.min ? parseFloat(field.min) : null;
            const max = field.max ? parseFloat(field.max) : null;
            
            if (field.value && isNaN(value)) {
                isValid = false;
                errorMessage = 'Please enter a valid number';
            } else if (min !== null && value < min) {
                isValid = false;
                errorMessage = `Value must be at least ${min}`;
            } else if (max !== null && value > max) {
                isValid = false;
                errorMessage = `Value must be no more than ${max}`;
            }
        }

        // Update error display
        if (isValid) {
            errorContainer.classList.add('hidden');
            field.classList.remove('error');
        } else {
            errorContainer.textContent = errorMessage;
            errorContainer.classList.remove('hidden');
            field.classList.add('error');
        }

        return isValid;
    }

    validateForm() {
        const fields = this.$$('input, select, textarea');
        let isValid = true;

        fields.forEach(field => {
            if (!this.validateField(field)) {
                isValid = false;
            }
        });

        return isValid;
    }

    onSettingChange() {
        this.isDirty = true;
        this.updateSaveButtonState();
    }

    updateSaveButtonState() {
        const saveBtn = this.$('#saveSettingsBtn');
        if (saveBtn) {
            saveBtn.disabled = !this.isDirty;
            saveBtn.textContent = this.isDirty ? 'Save Changes' : 'No Changes';
        }
    }

    getFormData() {
        if (!this.settingsForm) return {};

        const formData = new FormData(this.settingsForm);
        const data = {};

        // Convert form data to object
        for (const [key, value] of formData.entries()) {
            data[key] = value;
        }

        // Handle checkboxes (unchecked ones don't appear in FormData)
        this.$$('input[type="checkbox"]').forEach(checkbox => {
            data[checkbox.name] = checkbox.checked;
        });

        return data;
    }

    async saveSettings() {
        if (!this.validateForm()) {
            Utils.showNotification('Please fix the validation errors before saving', 'error');
            return;
        }

        try {
            const formData = this.getFormData();
            const response = await apiClient.post('/admin/settings', { settings: formData });
            
            if (response.success) {
                this.isDirty = false;
                this.updateSaveButtonState();
                Utils.showNotification('Settings saved successfully', 'success');
                
                // Update local settings
                Object.entries(formData).forEach(([key, value]) => {
                    const setting = this.settings.find(s => s.key === key);
                    if (setting) {
                        setting.value = value;
                    }
                });
            }
        } catch (error) {
            this.handleError(error, 'saving settings');
        }
    }

    async resetSettings() {
        if (!confirm('Are you sure you want to reset all settings to their default values?')) {
            return;
        }

        try {
            const response = await apiClient.post('/admin/settings/reset');
            
            if (response.success) {
                await this.loadSettings();
                this.renderSettings();
                this.initializeFormValidation();
                
                this.isDirty = false;
                this.updateSaveButtonState();
                
                Utils.showNotification('Settings reset to defaults', 'success');
            }
        } catch (error) {
            this.handleError(error, 'resetting settings');
        }
    }

    exportSettings() {
        const settingsData = {
            settings: this.settings,
            exportDate: new Date().toISOString(),
            version: '1.0'
        };

        const blob = new Blob([JSON.stringify(settingsData, null, 2)], {
            type: 'application/json'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `discoverybox-settings-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    importSettings(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = JSON.parse(event.target.result);
                
                if (!data.settings || !Array.isArray(data.settings)) {
                    throw new Error('Invalid settings file format');
                }

                if (confirm('Import these settings? This will overwrite current values.')) {
                    // Update form with imported values
                    data.settings.forEach(setting => {
                        const field = this.$(`[name="${setting.key}"]`);
                        if (field) {
                            if (field.type === 'checkbox') {
                                field.checked = setting.value;
                            } else {
                                field.value = setting.value;
                            }
                        }
                    });

                    this.isDirty = true;
                    this.updateSaveButtonState();
                    
                    Utils.showNotification('Settings imported. Click Save to apply changes.', 'info');
                }
            } catch (error) {
                Utils.showNotification('Error importing settings: ' + error.message, 'error');
            }
        };
        
        reader.readAsText(file);
        e.target.value = ''; // Clear file input
    }

    handleBeforeUnload(e) {
        if (this.isDirty) {
            e.preventDefault();
            e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
            return e.returnValue;
        }
    }

    onDestroy() {
        window.removeEventListener('beforeunload', this.handleBeforeUnload);
        super.onDestroy();
    }

    onError(error, context) {
        super.onError(error, context);
        Utils.showNotification(`Error ${context}: ${error.message}`, 'error');
    }
}