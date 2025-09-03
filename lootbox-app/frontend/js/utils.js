// Utility functions for the Loot Box application

class Utils {
    // Debounce function to limit API calls
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Throttle function for performance
    static throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // Format date for display
    static formatDate(dateString, options = {}) {
        const defaultOptions = {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        };
        const formatOptions = { ...defaultOptions, ...options };
        
        try {
            return new Date(dateString).toLocaleDateString('en-US', formatOptions);
        } catch (error) {
            console.warn('Date formatting error:', error);
            return dateString;
        }
    }

    // Format relative time (e.g., "2 days ago")
    static formatRelativeTime(dateString) {
        const now = new Date();
        const date = new Date(dateString);
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
        if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)} weeks ago`;
        
        return this.formatDate(dateString);
    }

    // Alias for backwards compatibility
    static formatTimeAgo(dateString) {
        return this.formatRelativeTime(dateString);
    }

    // Timezone utilities
    static getTimezone() {
        try {
            return Intl.DateTimeFormat().resolvedOptions().timeZone;
        } catch (error) {
            console.warn('Failed to detect timezone:', error);
            return 'UTC';
        }
    }

    static getUserTimezone() {
        // First check if user has a saved timezone preference
        const savedTimezone = this.storage.get('userTimezone');
        if (savedTimezone) {
            return savedTimezone;
        }
        
        // Fall back to browser detected timezone
        return this.getTimezone();
    }

    static setUserTimezone(timezone) {
        try {
            // Validate timezone
            Intl.DateTimeFormat('en', { timeZone: timezone });
            this.storage.set('userTimezone', timezone);
            return true;
        } catch (error) {
            console.warn('Invalid timezone:', timezone, error);
            return false;
        }
    }

    static formatDateInTimezone(dateString, timezone = null, options = {}) {
        if (!timezone) {
            timezone = this.getUserTimezone();
        }
        
        const defaultOptions = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: timezone
        };
        const formatOptions = { ...defaultOptions, ...options };
        
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', formatOptions);
        } catch (error) {
            console.warn('Date formatting error:', error);
            return dateString;
        }
    }

    static formatRelativeTimeInTimezone(dateString, timezone = null) {
        if (!timezone) {
            timezone = this.getUserTimezone();
        }
        
        try {
            // Convert the date to the user's timezone for comparison
            const now = new Date();
            const date = new Date(dateString);
            
            // Get timezone offset difference
            const nowInUserTz = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
            const dateInUserTz = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
            
            const diffInSeconds = Math.floor((nowInUserTz - dateInUserTz) / 1000);

            if (diffInSeconds < 60) return 'Just now';
            if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
            if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
            if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
            if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)} weeks ago`;
            
            return this.formatDateInTimezone(dateString, timezone);
        } catch (error) {
            console.warn('Timezone relative time formatting error:', error);
            return this.formatRelativeTime(dateString);
        }
    }

    // Enhanced formatTimeAgo with timezone support
    static formatTimeAgo(dateString, timezone = null) {
        return this.formatRelativeTimeInTimezone(dateString, timezone);
    }

    // Get list of common timezones for UI
    static getCommonTimezones() {
        return [
            { value: 'America/New_York', label: 'Eastern Time (ET)' },
            { value: 'America/Chicago', label: 'Central Time (CT)' },
            { value: 'America/Denver', label: 'Mountain Time (MT)' },
            { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
            { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
            { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST)' },
            { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
            { value: 'Europe/London', label: 'Greenwich Mean Time (GMT)' },
            { value: 'Europe/Paris', label: 'Central European Time (CET)' },
            { value: 'Europe/Berlin', label: 'Central European Time (CET)' },
            { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST)' },
            { value: 'Asia/Shanghai', label: 'China Standard Time (CST)' },
            { value: 'Asia/Kolkata', label: 'India Standard Time (IST)' },
            { value: 'Australia/Sydney', label: 'Australian Eastern Time (AET)' },
            { value: 'America/Toronto', label: 'Eastern Time Canada' },
            { value: 'America/Vancouver', label: 'Pacific Time Canada' }
        ];
    }

    // Capitalize first letter of each word
    static titleCase(str) {
        return str.replace(/\w\S*/g, (txt) => 
            txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
        );
    }

    // Truncate text with ellipsis
    static truncate(text, maxLength, suffix = '...') {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength - suffix.length) + suffix;
    }

    // Deep clone object
    static deepClone(obj) {
        try {
            return JSON.parse(JSON.stringify(obj));
        } catch (error) {
            console.warn('Deep clone failed:', error);
            return obj;
        }
    }

    // Check if object is empty
    static isEmpty(obj) {
        return obj == null || 
               (typeof obj === 'object' && Object.keys(obj).length === 0) ||
               (typeof obj === 'string' && obj.trim() === '') ||
               (Array.isArray(obj) && obj.length === 0);
    }

    // Generate random ID
    static generateId(prefix = '') {
        const timestamp = Date.now().toString(36);
        const randomPart = Math.random().toString(36).substr(2, 5);
        return `${prefix}${timestamp}${randomPart}`;
    }

    // Validate email format
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Sanitize HTML to prevent XSS
    static sanitizeHtml(str) {
        const temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
    }

    // Format number with commas
    static formatNumber(num) {
        return new Intl.NumberFormat('en-US').format(num);
    }

    // Get rarity color for UI elements
    static getRarityColor(tier) {
        const colors = {
            mythic: '#FF00FF',
            legendary: '#FFD700',
            epic: '#9C27B0',
            rare: '#2196F3',
            uncommon: '#4CAF50',
            common: '#999999'
        };
        return colors[tier?.toLowerCase()] || colors.common;
    }

    // Get rarity icon
    static getRarityIcon(tier) {
        const icons = {
            mythic: '🌟',
            legendary: '👑',
            epic: '💎',
            rare: '⭐',
            uncommon: '🔹',
            common: '⚪'
        };
        return icons[tier?.toLowerCase()] || icons.common;
    }

    // Calculate quality score (client-side validation)
    static calculateQualityScore(item) {
        if (!item || typeof item.critics_score !== 'number' || typeof item.audience_score !== 'number') {
            return 0;
        }

        // Favor critics more heavily (80/20 split instead of 65/35)
        const criticWeight = 0.80;
        const audienceWeight = 0.20;
        const baseScore = (item.critics_score * criticWeight) + (item.audience_score * audienceWeight);
        
        // Penalize movies with low critical scores to avoid mainstream bias
        const criticsPenalty = item.critics_score < 80 ? -5 : 0;
        const lowCriticsMajorPenalty = item.critics_score < 70 ? -5 : 0;
        
        // Bonuses remain the same but are now worth less relative to critics score
        const certifiedBonus = item.certified_fresh ? 5 : 0;
        const hotBonus = item.verified_hot ? 3 : 0;
        const imdbBonus = item.imdb_rating >= 8.5 ? 8 : item.imdb_rating >= 8.0 ? 6 : item.imdb_rating >= 7.5 ? 3 : 0;
        
        return Math.round(baseScore + certifiedBonus + hotBonus + imdbBonus + criticsPenalty + lowCriticsMajorPenalty);
    }

    // Get rarity tier based on score
    static getRarityTier(score) {
        if (score >= 95) return { tier: 'mythic', label: 'MYTHIC', icon: '🌟' };
        if (score >= 90) return { tier: 'legendary', label: 'LEGENDARY', icon: '👑' };
        if (score >= 85) return { tier: 'epic', label: 'EPIC', icon: '💎' };
        if (score >= 80) return { tier: 'rare', label: 'RARE', icon: '⭐' };
        if (score >= 75) return { tier: 'uncommon', label: 'UNCOMMON', icon: '🔹' };
        return { tier: 'common', label: 'COMMON', icon: '⚪' };
    }

    // Local storage helpers
    static storage = {
        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
            } catch (error) {
                console.warn('localStorage set failed:', error);
            }
        },

        get(key, defaultValue = null) {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch (error) {
                console.warn('localStorage get failed:', error);
                return defaultValue;
            }
        },

        remove(key) {
            try {
                localStorage.removeItem(key);
            } catch (error) {
                console.warn('localStorage remove failed:', error);
            }
        },

        clear() {
            try {
                localStorage.clear();
            } catch (error) {
                console.warn('localStorage clear failed:', error);
            }
        }
    };

    // Cookie helpers
    static cookies = {
        set(name, value, days = 7) {
            const expires = new Date();
            expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
            document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Strict`;
        },

        get(name) {
            const nameEQ = name + "=";
            const ca = document.cookie.split(';');
            for (let i = 0; i < ca.length; i++) {
                let c = ca[i];
                while (c.charAt(0) === ' ') c = c.substring(1, c.length);
                if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
            }
            return null;
        },

        remove(name) {
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        }
    };

    // URL helpers
    static url = {
        // Get query parameter
        getParam(name) {
            const urlParams = new URLSearchParams(window.location.search);
            return urlParams.get(name);
        },

        // Set query parameter without page reload
        setParam(name, value) {
            const url = new URL(window.location);
            url.searchParams.set(name, value);
            window.history.pushState({}, '', url);
        },

        // Remove query parameter
        removeParam(name) {
            const url = new URL(window.location);
            url.searchParams.delete(name);
            window.history.pushState({}, '', url);
        },

        // Get hash without #
        getHash() {
            return window.location.hash.slice(1);
        },

        // Set hash
        setHash(hash) {
            window.location.hash = hash;
        }
    };

    // DOM helpers
    static dom = {
        // Create element with attributes and children
        create(tagName, attributes = {}, ...children) {
            const element = document.createElement(tagName);
            
            // Set attributes
            Object.entries(attributes).forEach(([key, value]) => {
                if (key === 'className') {
                    element.className = value;
                } else if (key === 'dataset') {
                    Object.entries(value).forEach(([dataKey, dataValue]) => {
                        element.dataset[dataKey] = dataValue;
                    });
                } else if (key.startsWith('on') && typeof value === 'function') {
                    element.addEventListener(key.slice(2).toLowerCase(), value);
                } else {
                    element.setAttribute(key, value);
                }
            });
            
            // Add children
            children.forEach(child => {
                if (typeof child === 'string') {
                    element.appendChild(document.createTextNode(child));
                } else if (child instanceof Node) {
                    element.appendChild(child);
                }
            });
            
            return element;
        },

        // Find element by selector
        find(selector) {
            return document.querySelector(selector);
        },

        // Find all elements by selector
        findAll(selector) {
            return document.querySelectorAll(selector);
        },

        // Add class with animation support
        addClass(element, className, callback) {
            element.classList.add(className);
            if (callback && typeof callback === 'function') {
                element.addEventListener('animationend', callback, { once: true });
            }
        },

        // Remove class
        removeClass(element, className) {
            element.classList.remove(className);
        },

        // Toggle class
        toggleClass(element, className) {
            element.classList.toggle(className);
        },

        // Check if element has class
        hasClass(element, className) {
            return element.classList.contains(className);
        }
    };

    // Animation helpers
    static animation = {
        // Fade in element
        fadeIn(element, duration = 300, callback) {
            element.style.opacity = '0';
            element.style.display = 'block';
            
            const startTime = performance.now();
            
            function animate(currentTime) {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                element.style.opacity = progress;
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else if (callback) {
                    callback();
                }
            }
            
            requestAnimationFrame(animate);
        },

        // Fade out element
        fadeOut(element, duration = 300, callback) {
            const startOpacity = parseFloat(element.style.opacity) || 1;
            const startTime = performance.now();
            
            function animate(currentTime) {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                element.style.opacity = startOpacity * (1 - progress);
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    element.style.display = 'none';
                    if (callback) callback();
                }
            }
            
            requestAnimationFrame(animate);
        },

        // Slide element
        slide(element, direction, duration = 300, callback) {
            const startTime = performance.now();
            const startPosition = direction === 'up' ? 0 : (direction === 'down' ? 0 : element.offsetTop);
            
            function animate(currentTime) {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Apply easing
                const eased = 1 - Math.pow(1 - progress, 3);
                
                if (direction === 'up') {
                    element.style.transform = `translateY(${-30 * (1 - eased)}px)`;
                } else if (direction === 'down') {
                    element.style.transform = `translateY(${30 * (1 - eased)}px)`;
                }
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    element.style.transform = '';
                    if (callback) callback();
                }
            }
            
            requestAnimationFrame(animate);
        }
    };

    // Performance helpers
    static performance = {
        // Measure function execution time
        measure(fn, ...args) {
            const start = performance.now();
            const result = fn(...args);
            const end = performance.now();
            console.log(`Function execution took ${end - start} milliseconds`);
            return result;
        },

        // Defer execution to next tick
        defer(fn) {
            return new Promise(resolve => {
                setTimeout(() => {
                    resolve(fn());
                }, 0);
            });
        },

        // Request idle callback
        idle(fn, options = {}) {
            if ('requestIdleCallback' in window) {
                requestIdleCallback(fn, options);
            } else {
                setTimeout(fn, 1);
            }
        }
    };

    // Error handling
    static error = {
        // Handle and format API errors
        handle(error, context = 'Unknown') {
            console.error(`Error in ${context}:`, error);
            
            let message = 'An unexpected error occurred';
            
            if (error.response) {
                // API error
                message = error.response.data?.message || `Server error (${error.response.status})`;
            } else if (error.message) {
                // JavaScript error
                message = error.message;
            }
            
            return {
                message,
                context,
                originalError: error,
                timestamp: new Date().toISOString()
            };
        },

        // Log error for debugging
        log(error, context) {
            const errorInfo = this.handle(error, context);
            
            // In production, you might want to send this to an error tracking service
            if (process.env.NODE_ENV === 'development') {
                console.error('Error logged:', errorInfo);
            }
            
            return errorInfo;
        }
    };

    // Countdown timer helpers
    static countdown = {
        // Format countdown time in HH:MM:SS format
        formatTime(totalSeconds) {
            if (totalSeconds <= 0) return '00:00:00';
            
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;
            
            return [hours, minutes, seconds]
                .map(val => String(val).padStart(2, '0'))
                .join(':');
        },

        // Calculate time until next midnight (when spins refresh)
        getTimeUntilMidnight(timezone = null) {
            try {
                const now = new Date();
                const userTimezone = timezone || Utils.getUserTimezone();
                
                // Get current time in user's timezone
                const nowInTz = new Date(now.toLocaleString('en-US', { timeZone: userTimezone }));
                
                // Get next midnight in user's timezone
                const nextMidnight = new Date(nowInTz);
                nextMidnight.setHours(24, 0, 0, 0);
                
                // Convert back to local time for calculation
                const nextMidnightLocal = new Date(nextMidnight.toLocaleString('en-US', { timeZone: 'UTC' }));
                const nowLocal = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
                
                const timeDiff = Math.max(0, Math.floor((nextMidnightLocal - nowLocal) / 1000));
                return timeDiff;
            } catch (error) {
                console.warn('Error calculating time until midnight:', error);
                // Fallback: calculate using local time
                const now = new Date();
                const nextMidnight = new Date(now);
                nextMidnight.setDate(nextMidnight.getDate() + 1);
                nextMidnight.setHours(0, 0, 0, 0);
                return Math.max(0, Math.floor((nextMidnight - now) / 1000));
            }
        },

        // Start a countdown timer that updates an element
        start(elementId, updateCallback = null) {
            const element = document.getElementById(elementId);
            if (!element) return null;

            const updateTimer = () => {
                const secondsLeft = this.getTimeUntilMidnight();
                const formattedTime = this.formatTime(secondsLeft);
                element.textContent = formattedTime;
                
                if (updateCallback && typeof updateCallback === 'function') {
                    updateCallback(secondsLeft, formattedTime);
                }
                
                // If countdown reached zero, we might want to refresh spins
                if (secondsLeft <= 0) {
                    element.textContent = '00:00:00';
                    // Don't clear the timer yet, let it continue for the next day
                }
            };

            // Update immediately
            updateTimer();
            
            // Update every second
            const intervalId = setInterval(updateTimer, 1000);
            
            return intervalId;
        },

        // Stop a countdown timer
        stop(intervalId) {
            if (intervalId) {
                clearInterval(intervalId);
            }
        }
    };
}

// Export for use in other modules
window.Utils = Utils;