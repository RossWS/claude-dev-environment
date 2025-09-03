// User Management Component - handles user administration
class UserManagement extends BaseComponent {
    constructor(selector, options = {}) {
        super(selector, options);
        this.users = [];
        this.currentPage = 1;
        this.filters = {
            role: '',
            status: '',
            search: ''
        };
        this.pagination = {};
    }

    getDefaultOptions() {
        return {
            itemsPerPage: 15,
            enableSearch: true,
            enableFiltering: true,
            enableSorting: true
        };
    }

    setupEventListeners() {
        super.setupEventListeners();
        
        // Search
        const searchInput = this.$('#userSearchInput');
        if (searchInput) {
            this.addEventListener(searchInput, 'input', 
                this.debounce(() => this.applySearch(), 300));
        }

        // Filters
        const roleFilter = this.$('#userRoleFilter');
        const statusFilter = this.$('#userStatusFilter');
        
        if (roleFilter) {
            this.addEventListener(roleFilter, 'change', this.applyFilters);
        }
        
        if (statusFilter) {
            this.addEventListener(statusFilter, 'change', this.applyFilters);
        }

        // Bulk actions
        const selectAllBtn = this.$('#selectAllUsers');
        const bulkDeleteBtn = this.$('#bulkDeleteUsers');
        const bulkRoleBtn = this.$('#bulkChangeRole');
        
        if (selectAllBtn) {
            this.addEventListener(selectAllBtn, 'change', this.toggleSelectAll);
        }
        
        if (bulkDeleteBtn) {
            this.addEventListener(bulkDeleteBtn, 'click', this.bulkDeleteUsers);
        }
        
        if (bulkRoleBtn) {
            this.addEventListener(bulkRoleBtn, 'click', this.bulkChangeRole);
        }
    }

    async render() {
        await this.loadUsers();
        this.renderUsers();
        this.renderUsersPagination();
        this.addUserActionHandlers();
    }

    async loadUsers(loadMore = false) {
        try {
            const params = new URLSearchParams({
                page: loadMore ? this.currentPage + 1 : this.currentPage,
                limit: this.options.itemsPerPage,
                ...this.filters
            });

            const response = await apiClient.get(`/admin/users?${params}`);
            
            if (response.success) {
                if (loadMore) {
                    this.users.push(...response.data.users);
                    this.currentPage++;
                } else {
                    this.users = response.data.users;
                    this.currentPage = 1;
                }
                
                this.pagination = response.data.pagination;
            }
        } catch (error) {
            this.handleError(error, 'loading users');
        }
    }

    renderUsers() {
        const container = this.$('#adminUsersGrid');
        
        if (!container) return;

        if (this.users.length === 0) {
            container.innerHTML = '<div class="no-data">No users found</div>';
            return;
        }

        const usersHTML = this.users.map(user => this.createUserCard(user)).join('');
        container.innerHTML = usersHTML;
    }

    createUserCard(user) {
        const lastActive = user.last_active 
            ? Utils.formatTimeAgo(new Date(user.last_active))
            : 'Never';
        
        const statusClass = user.is_active ? 'active' : 'inactive';
        const statusText = user.is_active ? 'Active' : 'Inactive';
        
        return `
            <div class="admin-user-card" data-id="${user.id}">
                <div class="user-selector">
                    <input type="checkbox" class="user-checkbox" data-id="${user.id}">
                </div>
                
                <div class="user-avatar">
                    <div class="avatar-circle">
                        ${user.username.charAt(0).toUpperCase()}
                    </div>
                </div>
                
                <div class="user-info">
                    <div class="user-header">
                        <h3 class="username">${Utils.escapeHtml(user.username)}</h3>
                        <span class="user-role ${user.role}">${Utils.capitalizeFirst(user.role)}</span>
                    </div>
                    
                    <div class="user-meta">
                        <div class="meta-row">
                            <span class="meta-label">Email:</span>
                            <span class="meta-value">${Utils.escapeHtml(user.email)}</span>
                        </div>
                        <div class="meta-row">
                            <span class="meta-label">Status:</span>
                            <span class="meta-value status-${statusClass}">${statusText}</span>
                        </div>
                        <div class="meta-row">
                            <span class="meta-label">Last Active:</span>
                            <span class="meta-value">${lastActive}</span>
                        </div>
                        <div class="meta-row">
                            <span class="meta-label">Joined:</span>
                            <span class="meta-value">${Utils.formatDate(user.created_at)}</span>
                        </div>
                    </div>
                    
                    <div class="user-stats">
                        <div class="stat">
                            <span class="stat-value">${user.total_spins || 0}</span>
                            <span class="stat-label">Spins</span>
                        </div>
                        <div class="stat">
                            <span class="stat-value">${user.trophy_count || 0}</span>
                            <span class="stat-label">Trophies</span>
                        </div>
                        <div class="stat">
                            <span class="stat-value">${user.level || 1}</span>
                            <span class="stat-label">Level</span>
                        </div>
                    </div>
                </div>
                
                <div class="user-actions">
                    <button class="btn-small edit-user" data-id="${user.id}">Edit</button>
                    <button class="btn-small ${user.is_active ? 'deactivate' : 'activate'}-user" data-id="${user.id}">
                        ${user.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button class="btn-small view-profile" data-id="${user.id}">Profile</button>
                    ${user.role !== 'admin' ? `<button class="btn-small delete-user" data-id="${user.id}">Delete</button>` : ''}
                </div>
            </div>
        `;
    }

    renderUsersPagination() {
        const container = this.$('#adminUsersPagination');
        
        if (!container || !this.pagination.pages || this.pagination.pages <= 1) {
            if (container) container.innerHTML = '';
            return;
        }

        const { page, pages } = this.pagination;
        const hasPrev = page > 1;
        const hasNext = page < pages;
        const startPage = Math.max(1, page - 2);
        const endPage = Math.min(pages, page + 2);

        let paginationHTML = '';

        if (hasPrev) {
            paginationHTML += `<button class="pagination-btn" data-page="${page - 1}">Previous</button>`;
        }

        for (let i = startPage; i <= endPage; i++) {
            const isActive = i === page ? 'active' : '';
            paginationHTML += `<button class="pagination-btn ${isActive}" data-page="${i}">${i}</button>`;
        }

        if (hasNext) {
            paginationHTML += `<button class="pagination-btn" data-page="${page + 1}">Next</button>`;
        }

        container.innerHTML = paginationHTML;

        // Add click handlers
        this.$$('.pagination-btn').forEach(btn => {
            this.addEventListener(btn, 'click', (e) => {
                const targetPage = parseInt(e.target.dataset.page);
                this.changePage(targetPage);
            });
        });
    }

    addUserActionHandlers() {
        // Edit user buttons
        this.$$('.edit-user').forEach(btn => {
            this.addEventListener(btn, 'click', (e) => {
                const userId = e.target.dataset.id;
                this.editUser(userId);
            });
        });

        // Activate/Deactivate buttons
        this.$$('.activate-user, .deactivate-user').forEach(btn => {
            this.addEventListener(btn, 'click', (e) => {
                const userId = e.target.dataset.id;
                const isActivating = e.target.classList.contains('activate-user');
                this.toggleUserStatus(userId, isActivating);
            });
        });

        // View profile buttons
        this.$$('.view-profile').forEach(btn => {
            this.addEventListener(btn, 'click', (e) => {
                const userId = e.target.dataset.id;
                this.viewUserProfile(userId);
            });
        });

        // Delete user buttons
        this.$$('.delete-user').forEach(btn => {
            this.addEventListener(btn, 'click', (e) => {
                const userId = e.target.dataset.id;
                this.deleteUser(userId);
            });
        });

        // Checkbox handlers
        this.$$('.user-checkbox').forEach(checkbox => {
            this.addEventListener(checkbox, 'change', this.updateBulkActionsState);
        });
    }

    applySearch() {
        const searchInput = this.$('#userSearchInput');
        this.filters.search = searchInput ? searchInput.value.trim() : '';
        this.currentPage = 1;
        this.render();
    }

    applyFilters() {
        const roleFilter = this.$('#userRoleFilter');
        const statusFilter = this.$('#userStatusFilter');

        this.filters = {
            ...this.filters,
            role: roleFilter?.value || '',
            status: statusFilter?.value || ''
        };

        this.currentPage = 1;
        this.render();
    }

    async changePage(page) {
        this.currentPage = page;
        await this.loadUsers();
        this.renderUsers();
        this.renderUsersPagination();
        this.addUserActionHandlers();
    }

    toggleSelectAll(e) {
        const isChecked = e.target.checked;
        this.$$('.user-checkbox').forEach(checkbox => {
            checkbox.checked = isChecked;
        });
        this.updateBulkActionsState();
    }

    updateBulkActionsState() {
        const checkedBoxes = this.$$('.user-checkbox:checked');
        const bulkActions = this.$$('.bulk-user-action');
        
        bulkActions.forEach(btn => {
            btn.disabled = checkedBoxes.length === 0;
        });
    }

    getSelectedUserIds() {
        return Array.from(this.$$('.user-checkbox:checked'))
            .map(checkbox => parseInt(checkbox.dataset.id));
    }

    async editUser(userId) {
        try {
            const user = this.users.find(u => u.id === parseInt(userId));
            if (!user) return;

            // TODO: Open edit user modal
            console.log('Edit user:', user);
        } catch (error) {
            this.handleError(error, 'editing user');
        }
    }

    async toggleUserStatus(userId, activate) {
        try {
            const action = activate ? 'activate' : 'deactivate';
            const response = await apiClient.post(`/admin/users/${userId}/${action}`);
            
            if (response.success) {
                // Update local user data
                const user = this.users.find(u => u.id === parseInt(userId));
                if (user) {
                    user.is_active = activate;
                }
                
                this.renderUsers();
                this.addUserActionHandlers();
                
                Utils.showNotification(
                    `User ${activate ? 'activated' : 'deactivated'} successfully`, 
                    'success'
                );
            }
        } catch (error) {
            this.handleError(error, `${activate ? 'activating' : 'deactivating'} user`);
        }
    }

    viewUserProfile(userId) {
        const user = this.users.find(u => u.id === parseInt(userId));
        if (!user) return;

        // TODO: Open user profile modal or navigate to profile view
        console.log('View user profile:', user);
    }

    async deleteUser(userId) {
        const user = this.users.find(u => u.id === parseInt(userId));
        if (!user) return;

        if (!confirm(`Are you sure you want to delete user "${user.username}"? This action cannot be undone.`)) {
            return;
        }

        try {
            const response = await apiClient.delete(`/admin/users/${userId}`);
            
            if (response.success) {
                // Remove from local array
                this.users = this.users.filter(u => u.id !== parseInt(userId));
                this.renderUsers();
                this.renderUsersPagination();
                
                Utils.showNotification('User deleted successfully', 'success');
            }
        } catch (error) {
            this.handleError(error, 'deleting user');
        }
    }

    async bulkDeleteUsers() {
        const selectedIds = this.getSelectedUserIds();
        if (selectedIds.length === 0) return;

        if (!confirm(`Are you sure you want to delete ${selectedIds.length} users? This action cannot be undone.`)) {
            return;
        }

        try {
            const response = await apiClient.post('/admin/users/bulk-delete', { ids: selectedIds });
            
            if (response.success) {
                await this.loadUsers();
                this.renderUsers();
                this.renderUsersPagination();
                
                Utils.showNotification(`${selectedIds.length} users deleted successfully`, 'success');
            }
        } catch (error) {
            this.handleError(error, 'bulk deleting users');
        }
    }

    async bulkChangeRole() {
        const selectedIds = this.getSelectedUserIds();
        if (selectedIds.length === 0) return;

        // TODO: Open role selection modal
        console.log('Bulk change role for:', selectedIds);
    }

    onError(error, context) {
        super.onError(error, context);
        Utils.showNotification(`Error ${context}: ${error.message}`, 'error');
    }
}