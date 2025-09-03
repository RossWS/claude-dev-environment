// Timezone initialization - automatically detect and set timezone for guests
class TimezoneManager {
    static init() {
        // Auto-detect timezone if not already set
        if (!Utils.storage.get('userTimezone')) {
            const detectedTimezone = Utils.getTimezone();
            console.log('Auto-detected timezone:', detectedTimezone);
            // Don't store it automatically - let users choose
        }

        // Initialize timezone-aware date displays
        this.updateExistingTimeDisplays();
    }

    static updateExistingTimeDisplays() {
        // Update any existing time displays on the page
        document.querySelectorAll('[data-timestamp]').forEach(element => {
            const timestamp = element.dataset.timestamp;
            if (timestamp) {
                element.textContent = Utils.formatTimeAgo(timestamp);
            }
        });

        // Update any existing unlock time displays
        document.querySelectorAll('.collectible-card-unlock-time').forEach(element => {
            const timestampElement = element.querySelector('[data-unlock-time]');
            if (timestampElement) {
                const unlockTime = timestampElement.dataset.unlockTime;
                if (unlockTime) {
                    element.textContent = `Unlocked ${Utils.formatTimeAgo(unlockTime)}`;
                }
            }
        });
    }

    // Method to refresh all time displays (useful after timezone changes)
    static refreshTimeDisplays() {
        this.updateExistingTimeDisplays();
        
        // Trigger refresh in components that might be managing their own time displays
        window.dispatchEvent(new CustomEvent('timezoneChanged'));
    }
}

// Initialize on DOM load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => TimezoneManager.init());
} else {
    TimezoneManager.init();
}

// Listen for timezone changes
window.addEventListener('timezoneChanged', () => {
    TimezoneManager.refreshTimeDisplays();
});

// Export for global use
window.TimezoneManager = TimezoneManager;