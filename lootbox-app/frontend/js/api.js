// API layer for communicating with the backend

class API {
    constructor() {
        this.baseURL = 'http://localhost:5000/api';  // Backend server on port 5000
        this.token = Utils.storage.get('authToken');
        this.refreshTokenPromise = null;
        console.log('API initialized with baseURL:', this.baseURL);
    }

    // Set authentication token
    setToken(token) {
        this.token = token;
        Utils.storage.set('authToken', token);
    }

    // Remove authentication token
    clearToken() {
        this.token = null;
        Utils.storage.remove('authToken');
    }

    // Get headers for requests
    getHeaders(includeAuth = true) {
        const headers = {
            'Content-Type': 'application/json'
        };

        if (includeAuth && this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        return headers;
    }

    // Make HTTP request with error handling
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: this.getHeaders(options.includeAuth !== false),
            ...options
        };

        console.log('Making API request to:', url, 'with config:', config);

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
            }

            return data;
        } catch (error) {
            // Handle network errors
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('Network error - please check your connection');
            }

            // Handle 401 errors (unauthorized)
            if (error.message.includes('401') || error.message.includes('unauthorized')) {
                this.clearToken();
                throw new Error('Session expired - please login again');
            }

            throw error;
        }
    }

    // GET request
    async get(endpoint, params = {}) {
        const queryString = Object.keys(params).length > 0 ? 
            '?' + new URLSearchParams(params).toString() : '';
        
        return this.request(`${endpoint}${queryString}`, {
            method: 'GET'
        });
    }

    // POST request
    async post(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    // PUT request
    async put(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    // DELETE request
    async delete(endpoint) {
        return this.request(endpoint, {
            method: 'DELETE'
        });
    }

    // Authentication endpoints
    auth = {
        // Register new user
        async register(userData) {
            const response = await api.post('/auth/register', userData);
            if (response.token) {
                api.setToken(response.token);
            }
            return response;
        },

        // Login user
        async login(credentials) {
            const response = await api.post('/auth/login', credentials);
            if (response.token) {
                api.setToken(response.token);
            }
            return response;
        },

        // Verify current token
        async verify() {
            return api.get('/auth/verify');
        },

        // Logout (client-side)
        logout() {
            api.clearToken();
            return Promise.resolve({ success: true });
        }
    };

    // Lootbox endpoints
    lootbox = {
        // Open a lootbox (automatically uses guest endpoint if not authenticated)
        async open(type) {
            if (Utils.storage.get('authToken')) {
                return api.post('/lootbox/open', { type });
            } else {
                return api.post('/lootbox/guest-open', { type }, { includeAuth: false });
            }
        },

        // Open a lootbox for guests (no authentication)
        async guestOpen(type) {
            return api.post('/lootbox/guest-open', { type }, { includeAuth: false });
        },

        // Get spin status
        async getStatus() {
            return api.get('/lootbox/status');
        }
    };

    // User endpoints
    user = {
        // Get user profile
        async getProfile() {
            return api.get('/user/profile');
        },

        // Get trophy cabinet
        async getTrophies(params = {}) {
            return api.get('/user/trophy-cabinet', params);
        },

        // Get spin history
        async getSpinHistory(params = {}) {
            return api.get('/user/spin-history', params);
        },

        // Get achievements
        async getAchievements() {
            return api.get('/user/achievements');
        },

        // Get unlock statistics by rarity
        async getUnlockStats(params = {}) {
            return api.get('/user/unlock-stats', params);
        },

        // Top up spins (testing only)
        async topUpSpins() {
            return api.post('/user/top-up-spins');
        }
    };

    // Admin endpoints
    admin = {
        // Get admin stats
        async getStats() {
            return api.get('/admin/stats');
        },

        // Get admin settings
        async getSettings() {
            return api.get('/admin/settings');
        },

        // Update setting
        async updateSetting(key, value) {
            return api.put(`/admin/settings/${key}`, { value });
        },

        // Grant spins to user
        async grantSpins(userId, amount) {
            return api.post(`/admin/users/${userId}/grant-spins`, { amount });
        },

        // Get all users
        async getUsers(params = {}) {
            return api.get('/admin/users', params);
        },

        // Get content for management
        async getContent(params = {}) {
            return api.get('/admin/content', params);
        },

        // Toggle content active status
        async toggleContent(contentId) {
            return api.put(`/admin/content/${contentId}/toggle`);
        },

        // Get activity log
        async getActivity(params = {}) {
            return api.get('/admin/activity', params);
        }
    };

    // Content endpoints
    content = {
        // Get content by type (if public endpoint exists)
        async getByType(type, params = {}) {
            return api.get(`/content/${type}`, params);
        },

        // Search content (if public endpoint exists)
        async search(query, params = {}) {
            return api.get('/content/search', { query, ...params });
        }
    };

    // Health check
    async health() {
        return this.request('/health', { includeAuth: false });
    }

    // Batch requests helper
    async batch(requests) {
        const promises = requests.map(({ endpoint, method = 'GET', data }) => {
            switch (method.toLowerCase()) {
                case 'get': return this.get(endpoint, data);
                case 'post': return this.post(endpoint, data);
                case 'put': return this.put(endpoint, data);
                case 'delete': return this.delete(endpoint);
                default: throw new Error(`Unsupported method: ${method}`);
            }
        });

        try {
            const results = await Promise.allSettled(promises);
            return results.map((result, index) => ({
                request: requests[index],
                success: result.status === 'fulfilled',
                data: result.status === 'fulfilled' ? result.value : null,
                error: result.status === 'rejected' ? result.reason : null
            }));
        } catch (error) {
            throw new Error(`Batch request failed: ${error.message}`);
        }
    }

    // Upload file helper (for future use)
    async uploadFile(endpoint, file, progressCallback) {
        const formData = new FormData();
        formData.append('file', file);

        const xhr = new XMLHttpRequest();
        
        return new Promise((resolve, reject) => {
            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable && progressCallback) {
                    const percentComplete = (event.loaded / event.total) * 100;
                    progressCallback(percentComplete);
                }
            };

            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        resolve(response);
                    } catch (e) {
                        resolve(xhr.responseText);
                    }
                } else {
                    reject(new Error(`Upload failed: ${xhr.statusText}`));
                }
            };

            xhr.onerror = () => reject(new Error('Upload failed'));
            xhr.ontimeout = () => reject(new Error('Upload timed out'));

            xhr.open('POST', `${this.baseURL}${endpoint}`);
            
            if (this.token) {
                xhr.setRequestHeader('Authorization', `Bearer ${this.token}`);
            }

            xhr.timeout = 30000; // 30 second timeout
            xhr.send(formData);
        });
    }
}

// Request interceptor for global error handling
class APIInterceptor extends API {
    constructor() {
        super();
        this.requestCount = 0;
        this.errorCallbacks = [];
    }

    // Add global error callback
    onError(callback) {
        this.errorCallbacks.push(callback);
    }

    // Override request method to add interceptor logic
    async request(endpoint, options = {}) {
        this.requestCount++;
        
        // Emit loading start event
        document.dispatchEvent(new CustomEvent('apiLoadingStart', {
            detail: { endpoint, count: this.requestCount }
        }));

        try {
            const response = await super.request(endpoint, options);
            
            // Emit success event
            document.dispatchEvent(new CustomEvent('apiSuccess', {
                detail: { endpoint, response }
            }));
            
            return response;
        } catch (error) {
            // Call error callbacks
            this.errorCallbacks.forEach(callback => {
                try {
                    callback(error, endpoint);
                } catch (callbackError) {
                    console.error('Error in API error callback:', callbackError);
                }
            });

            // Emit error event
            document.dispatchEvent(new CustomEvent('apiError', {
                detail: { endpoint, error }
            }));

            throw error;
        } finally {
            this.requestCount--;
            
            // Emit loading end event
            document.dispatchEvent(new CustomEvent('apiLoadingEnd', {
                detail: { endpoint, count: this.requestCount }
            }));
        }
    }
}

// Create global API instance
const api = new APIInterceptor();

// Export for use in other modules
window.API = API;
window.api = api;