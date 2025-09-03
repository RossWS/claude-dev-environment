// Export Manager Component - handles trophy collection exports
class ExportManager extends BaseComponent {
    constructor(selector, options = {}) {
        super(selector, options);
        this.exportFormats = ['json', 'csv', 'txt', 'pdf'];
        this.exportOptions = {
            includeImages: false,
            includeMetadata: true,
            includeStats: true,
            filterByRarity: '',
            filterByType: '',
            sortBy: 'title'
        };
    }

    getDefaultOptions() {
        return {
            showPreview: true,
            maxPreviewItems: 10,
            enableCustomization: true,
            enableScheduledExports: false
        };
    }

    setupEventListeners() {
        super.setupEventListeners();
        
        // Export format selection
        this.$$('.export-format-btn').forEach(btn => {
            this.addEventListener(btn, 'click', (e) => {
                const format = e.target.dataset.format;
                this.selectExportFormat(format);
            });
        });

        // Export options
        this.addEventListener(this.element, 'change', (e) => {
            if (e.target.classList.contains('export-option')) {
                const option = e.target.name;
                const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
                this.updateExportOption(option, value);
            }
        });

        // Export button
        const exportBtn = this.$('#startExportBtn');
        if (exportBtn) {
            this.addEventListener(exportBtn, 'click', this.startExport);
        }

        // Preview button
        const previewBtn = this.$('#previewExportBtn');
        if (previewBtn) {
            this.addEventListener(previewBtn, 'click', this.showPreview);
        }

        // Download template button
        const templateBtn = this.$('#downloadTemplateBtn');
        if (templateBtn) {
            this.addEventListener(templateBtn, 'click', this.downloadTemplate);
        }
    }

    render() {
        this.renderFormatSelector();
        this.renderExportOptions();
        this.renderExportStats();
        
        if (this.options.showPreview) {
            this.renderPreview();
        }
    }

    renderFormatSelector() {
        const container = this.$('#exportFormatSelector');
        if (!container) return;

        const formatsHTML = this.exportFormats.map(format => `
            <button class="export-format-btn ${format === 'json' ? 'active' : ''}" 
                    data-format="${format}">
                <div class="format-icon">${this.getFormatIcon(format)}</div>
                <div class="format-info">
                    <div class="format-name">${format.toUpperCase()}</div>
                    <div class="format-description">${this.getFormatDescription(format)}</div>
                </div>
            </button>
        `).join('');

        container.innerHTML = `
            <div class="format-selector-grid">
                ${formatsHTML}
            </div>
        `;
    }

    renderExportOptions() {
        const container = this.$('#exportOptions');
        if (!container || !this.options.enableCustomization) return;

        container.innerHTML = `
            <div class="export-options-group">
                <h3>Content Options</h3>
                <div class="option-row">
                    <label class="option-label">
                        <input type="checkbox" class="export-option" name="includeImages" 
                               ${this.exportOptions.includeImages ? 'checked' : ''}>
                        <span>Include poster images</span>
                    </label>
                </div>
                <div class="option-row">
                    <label class="option-label">
                        <input type="checkbox" class="export-option" name="includeMetadata" 
                               ${this.exportOptions.includeMetadata ? 'checked' : ''}>
                        <span>Include metadata (platforms, ratings, etc.)</span>
                    </label>
                </div>
                <div class="option-row">
                    <label class="option-label">
                        <input type="checkbox" class="export-option" name="includeStats" 
                               ${this.exportOptions.includeStats ? 'checked' : ''}>
                        <span>Include collection statistics</span>
                    </label>
                </div>
            </div>

            <div class="export-options-group">
                <h3>Filter Options</h3>
                <div class="option-row">
                    <label class="option-label">
                        <span>Rarity Filter:</span>
                        <select class="export-option" name="filterByRarity">
                            <option value="">All Rarities</option>
                            <option value="legendary" ${this.exportOptions.filterByRarity === 'legendary' ? 'selected' : ''}>Legendary Only</option>
                            <option value="epic" ${this.exportOptions.filterByRarity === 'epic' ? 'selected' : ''}>Epic Only</option>
                            <option value="rare" ${this.exportOptions.filterByRarity === 'rare' ? 'selected' : ''}>Rare Only</option>
                            <option value="uncommon" ${this.exportOptions.filterByRarity === 'uncommon' ? 'selected' : ''}>Uncommon Only</option>
                            <option value="common" ${this.exportOptions.filterByRarity === 'common' ? 'selected' : ''}>Common Only</option>
                        </select>
                    </label>
                </div>
                <div class="option-row">
                    <label class="option-label">
                        <span>Type Filter:</span>
                        <select class="export-option" name="filterByType">
                            <option value="">All Types</option>
                            <option value="movie" ${this.exportOptions.filterByType === 'movie' ? 'selected' : ''}>Movies Only</option>
                            <option value="series" ${this.exportOptions.filterByType === 'series' ? 'selected' : ''}>Series Only</option>
                        </select>
                    </label>
                </div>
            </div>

            <div class="export-options-group">
                <h3>Sort Options</h3>
                <div class="option-row">
                    <label class="option-label">
                        <span>Sort By:</span>
                        <select class="export-option" name="sortBy">
                            <option value="title" ${this.exportOptions.sortBy === 'title' ? 'selected' : ''}>Title</option>
                            <option value="unlock_time" ${this.exportOptions.sortBy === 'unlock_time' ? 'selected' : ''}>Unlock Date</option>
                            <option value="rarity" ${this.exportOptions.sortBy === 'rarity' ? 'selected' : ''}>Rarity</option>
                            <option value="year" ${this.exportOptions.sortBy === 'year' ? 'selected' : ''}>Release Year</option>
                        </select>
                    </label>
                </div>
            </div>
        `;
    }

    renderExportStats() {
        const container = this.$('#exportStats');
        if (!container) return;

        // This would be calculated from the actual trophy data
        const stats = this.calculateExportStats();
        
        container.innerHTML = `
            <div class="export-stats-grid">
                <div class="stat-item">
                    <div class="stat-value">${stats.totalItems}</div>
                    <div class="stat-label">Total Items</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${stats.filteredItems}</div>
                    <div class="stat-label">After Filters</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${stats.estimatedSize}</div>
                    <div class="stat-label">Estimated Size</div>
                </div>
            </div>
        `;
    }

    renderPreview() {
        const container = this.$('#exportPreview');
        if (!container) return;

        const previewData = this.generatePreviewData();
        
        container.innerHTML = `
            <div class="preview-header">
                <h3>Export Preview</h3>
                <p>Showing first ${Math.min(previewData.length, this.options.maxPreviewItems)} items</p>
            </div>
            <div class="preview-content">
                <pre><code>${this.formatPreviewData(previewData)}</code></pre>
            </div>
        `;
    }

    selectExportFormat(format) {
        // Update active format button
        this.$$('.export-format-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.format === format);
        });

        this.selectedFormat = format;
        this.updateExportOptions();
        
        if (this.options.showPreview) {
            this.renderPreview();
        }
    }

    updateExportOption(option, value) {
        this.exportOptions[option] = value;
        this.renderExportStats();
        
        if (this.options.showPreview) {
            this.renderPreview();
        }
    }

    calculateExportStats() {
        // This should use actual trophy data
        const mockData = {
            totalItems: this.trophies ? this.trophies.length : 0,
            filteredItems: this.getFilteredTrophies().length,
            estimatedSize: '2.3 MB'
        };
        
        return mockData;
    }

    getFilteredTrophies() {
        let filtered = this.trophies || [];

        // Apply rarity filter
        if (this.exportOptions.filterByRarity) {
            filtered = filtered.filter(trophy => trophy.rarity === this.exportOptions.filterByRarity);
        }

        // Apply type filter
        if (this.exportOptions.filterByType) {
            filtered = filtered.filter(trophy => trophy.type === this.exportOptions.filterByType);
        }

        // Apply sorting
        filtered.sort((a, b) => {
            switch (this.exportOptions.sortBy) {
                case 'title':
                    return a.title.localeCompare(b.title);
                case 'unlock_time':
                    return new Date(b.unlock_time || 0) - new Date(a.unlock_time || 0);
                case 'rarity':
                    return this.getRarityOrder(a.rarity) - this.getRarityOrder(b.rarity);
                case 'year':
                    return (b.year || 0) - (a.year || 0);
                default:
                    return 0;
            }
        });

        return filtered;
    }

    generatePreviewData() {
        const filtered = this.getFilteredTrophies();
        return filtered.slice(0, this.options.maxPreviewItems);
    }

    formatPreviewData(data) {
        const format = this.selectedFormat || 'json';
        
        switch (format) {
            case 'json':
                return JSON.stringify(this.prepareDataForExport(data), null, 2);
            
            case 'csv':
                return this.formatAsCSV(data);
            
            case 'txt':
                return this.formatAsText(data);
            
            case 'pdf':
                return 'PDF preview not available in browser. Click export to generate.';
            
            default:
                return JSON.stringify(data, null, 2);
        }
    }

    prepareDataForExport(data) {
        return data.map(trophy => {
            const exportItem = {
                title: trophy.title,
                type: trophy.type,
                year: trophy.year,
                rarity: trophy.rarity,
                unlock_date: trophy.unlock_time ? new Date(trophy.unlock_time).toISOString() : null
            };

            if (this.exportOptions.includeMetadata) {
                exportItem.description = trophy.description;
                exportItem.platforms = trophy.platforms;
                exportItem.quality_score = trophy.quality_score;
            }

            if (this.exportOptions.includeImages) {
                exportItem.poster_url = trophy.poster_url;
            }

            return exportItem;
        });
    }

    formatAsCSV(data) {
        if (data.length === 0) return 'No data to export';

        const prepared = this.prepareDataForExport(data);
        const headers = Object.keys(prepared[0]);
        
        const csvRows = [
            headers.join(','),
            ...prepared.map(item => 
                headers.map(header => {
                    const value = item[header];
                    // Escape commas and quotes in CSV
                    if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                        return `"${value.replace(/"/g, '""')}"`;
                    }
                    return value || '';
                }).join(',')
            )
        ];
        
        return csvRows.join('\n');
    }

    formatAsText(data) {
        if (data.length === 0) return 'No data to export';

        const prepared = this.prepareDataForExport(data);
        
        return prepared.map((item, index) => {
            const lines = [
                `${index + 1}. ${item.title}`,
                `   Type: ${item.type}`,
                `   Year: ${item.year || 'Unknown'}`,
                `   Rarity: ${Utils.capitalizeFirst(item.rarity)}`,
                `   Unlocked: ${item.unlock_date ? new Date(item.unlock_date).toLocaleDateString() : 'Not unlocked'}`
            ];

            if (this.exportOptions.includeMetadata && item.platforms) {
                lines.push(`   Platforms: ${item.platforms.join(', ')}`);
            }

            return lines.join('\n');
        }).join('\n\n');
    }

    async startExport() {
        const exportBtn = this.$('#startExportBtn');
        if (!exportBtn) return;

        try {
            exportBtn.disabled = true;
            exportBtn.textContent = 'Exporting...';

            const format = this.selectedFormat || 'json';
            const filteredData = this.getFilteredTrophies();
            
            if (filteredData.length === 0) {
                Utils.showNotification('No items match your filter criteria', 'warning');
                return;
            }

            await this.performExport(filteredData, format);
            Utils.showNotification(`Export completed successfully (${filteredData.length} items)`, 'success');

        } catch (error) {
            this.handleError(error, 'exporting trophies');
            Utils.showNotification('Export failed: ' + error.message, 'error');
        } finally {
            exportBtn.disabled = false;
            exportBtn.textContent = 'Export Collection';
        }
    }

    async performExport(data, format) {
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `trophy-collection-${timestamp}.${format}`;

        switch (format) {
            case 'json':
                this.downloadJSON(data, filename);
                break;
            
            case 'csv':
                this.downloadCSV(data, filename);
                break;
            
            case 'txt':
                this.downloadText(data, filename);
                break;
            
            case 'pdf':
                await this.downloadPDF(data, filename);
                break;
            
            default:
                throw new Error(`Unsupported export format: ${format}`);
        }
    }

    downloadJSON(data, filename) {
        const prepared = this.prepareDataForExport(data);
        const exportData = {
            metadata: {
                exported_at: new Date().toISOString(),
                total_items: data.length,
                export_options: this.exportOptions
            },
            collection: prepared
        };

        if (this.exportOptions.includeStats) {
            exportData.statistics = this.calculateExportStatistics(data);
        }

        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
            type: 'application/json'
        });
        
        this.downloadBlob(blob, filename);
    }

    downloadCSV(data, filename) {
        const csvContent = this.formatAsCSV(data);
        const blob = new Blob([csvContent], { type: 'text/csv' });
        this.downloadBlob(blob, filename);
    }

    downloadText(data, filename) {
        const textContent = this.formatAsText(data);
        const blob = new Blob([textContent], { type: 'text/plain' });
        this.downloadBlob(blob, filename);
    }

    async downloadPDF(data, filename) {
        // This would require a PDF library like jsPDF
        // For now, we'll create a simple HTML version
        const htmlContent = this.formatAsHTML(data);
        const blob = new Blob([htmlContent], { type: 'text/html' });
        this.downloadBlob(blob, filename.replace('.pdf', '.html'));
    }

    formatAsHTML(data) {
        const prepared = this.prepareDataForExport(data);
        const timestamp = new Date().toLocaleDateString();
        
        const itemsHTML = prepared.map(item => `
            <div class="trophy-item">
                <h3>${Utils.escapeHtml(item.title)}</h3>
                <p><strong>Type:</strong> ${item.type}</p>
                <p><strong>Year:</strong> ${item.year || 'Unknown'}</p>
                <p><strong>Rarity:</strong> ${Utils.capitalizeFirst(item.rarity)}</p>
                <p><strong>Unlocked:</strong> ${item.unlock_date ? new Date(item.unlock_date).toLocaleDateString() : 'Not unlocked'}</p>
                ${this.exportOptions.includeMetadata && item.platforms ? 
                    `<p><strong>Platforms:</strong> ${item.platforms.join(', ')}</p>` : ''
                }
            </div>
        `).join('');

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Trophy Collection Export</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 40px; }
                    .header { border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
                    .trophy-item { margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; }
                    h1 { color: #333; }
                    h3 { color: #666; margin-top: 0; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Trophy Collection Export</h1>
                    <p>Exported on: ${timestamp}</p>
                    <p>Total Items: ${data.length}</p>
                </div>
                <div class="collection">
                    ${itemsHTML}
                </div>
            </body>
            </html>
        `;
    }

    downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    calculateExportStatistics(data) {
        const stats = {
            total_items: data.length,
            by_rarity: {},
            by_type: {},
            by_year: {}
        };

        data.forEach(item => {
            // Rarity stats
            stats.by_rarity[item.rarity] = (stats.by_rarity[item.rarity] || 0) + 1;
            
            // Type stats
            stats.by_type[item.type] = (stats.by_type[item.type] || 0) + 1;
            
            // Year stats
            if (item.year) {
                stats.by_year[item.year] = (stats.by_year[item.year] || 0) + 1;
            }
        });

        return stats;
    }

    showPreview() {
        this.renderPreview();
        
        // Scroll to preview section
        const preview = this.$('#exportPreview');
        if (preview) {
            preview.scrollIntoView({ behavior: 'smooth' });
        }
    }

    downloadTemplate() {
        // Download an empty template in the selected format
        const format = this.selectedFormat || 'json';
        const templateData = this.generateTemplateData();
        
        this.performExport(templateData, format);
    }

    generateTemplateData() {
        return [{
            title: 'Sample Movie Title',
            type: 'movie',
            year: 2023,
            rarity: 'rare',
            unlock_date: new Date().toISOString(),
            description: 'Sample description',
            platforms: ['Netflix', 'Amazon Prime'],
            quality_score: 8.5
        }];
    }

    getFormatIcon(format) {
        const icons = {
            json: '📄',
            csv: '📊',
            txt: '📝',
            pdf: '📕'
        };
        return icons[format] || '📄';
    }

    getFormatDescription(format) {
        const descriptions = {
            json: 'Structured data format, ideal for backup',
            csv: 'Spreadsheet format, good for analysis',
            txt: 'Plain text format, human readable',
            pdf: 'Formatted document, good for sharing'
        };
        return descriptions[format] || '';
    }

    getRarityOrder(rarity) {
        const order = { legendary: 1, epic: 2, rare: 3, uncommon: 4, common: 5 };
        return order[rarity] || 6;
    }

    // Public API methods
    setTrophies(trophies) {
        this.trophies = trophies;
        this.renderExportStats();
        if (this.options.showPreview) {
            this.renderPreview();
        }
    }

    updateOptions(options) {
        this.exportOptions = { ...this.exportOptions, ...options };
        this.render();
    }

    onError(error, context) {
        super.onError(error, context);
        console.error(`Export Manager Error (${context}):`, error);
    }
}