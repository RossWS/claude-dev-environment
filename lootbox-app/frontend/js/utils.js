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
}

// Export for use in other modules
window.Utils = Utils;