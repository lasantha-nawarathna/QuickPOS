const API_BASE = '/api';

const API = {
  // Token helper functions
  getToken() {
    return localStorage.getItem('pos_token');
  },

  setToken(token) {
    localStorage.setItem('pos_token', token);
  },

  clearToken() {
    localStorage.removeItem('pos_token');
  },

  getCurrentUser() {
    const user = localStorage.getItem('pos_user');
    return user ? JSON.parse(user) : null;
  },

  setCurrentUser(user) {
    localStorage.setItem('pos_user', JSON.stringify(user));
  },

  clearCurrentUser() {
    localStorage.removeItem('pos_user');
  },

  // Base Fetch Call Wrapper
  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    
    // Set headers
    const headers = options.headers || {};
    const token = this.getToken();
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const config = {
      ...options,
      headers
    };

    try {
      const response = await fetch(url, config);
      
      // Auto logout on token expiration
      if (response.status === 401 && !endpoint.includes('/auth/login')) {
        this.clearToken();
        this.clearCurrentUser();
        window.location.reload(); // Force reload to trigger login view overlay
        throw new Error('Session expired. Please log in again.');
      }

      // Handle download responses (PDF/Excel/etc)
      const contentType = response.headers.get('content-type');
      if (contentType && (contentType.includes('application/pdf') || contentType.includes('spreadsheetml') || contentType.includes('octet-stream'))) {
        return response; // Return raw response for downloading in browser
      }

      const resData = await response.json();
      
      if (!response.ok) {
        throw new Error(resData.message || 'Something went wrong');
      }

      return resData;
    } catch (error) {
      console.error(`API Error on ${endpoint}:`, error.message);
      throw error;
    }
  },

  // Auth Endpoints
  async login(username, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    if (data.success) {
      this.setToken(data.token);
      this.setCurrentUser(data.user);
    }
    return data;
  },

  async getProfile() {
    return this.request('/auth/me');
  },

  async getUsers() {
    return this.request('/auth/users');
  },

  async createUser(userData) {
    return this.request('/auth/users', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  },

  async updateUser(id, userData) {
    return this.request(`/auth/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData)
    });
  },

  async deleteUser(id) {
    return this.request(`/auth/users/${id}`, {
      method: 'DELETE'
    });
  },

  // Products Endpoints
  async getProducts(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/products?${query}`);
  },

  async getProduct(id) {
    return this.request(`/products/${id}`);
  },

  async createProduct(formData) {
    return this.request('/products', {
      method: 'POST',
      body: formData // Form data handles upload file boundaries
    });
  },

  async updateProduct(id, formData) {
    return this.request(`/products/${id}`, {
      method: 'PUT',
      body: formData
    });
  },

  async deleteProduct(id) {
    return this.request(`/products/${id}`, {
      method: 'DELETE'
    });
  },

  // Categories Endpoints
  async getCategories() {
    return this.request('/categories');
  },

  async createCategory(catData) {
    return this.request('/categories', {
      method: 'POST',
      body: JSON.stringify(catData)
    });
  },

  async updateCategory(id, catData) {
    return this.request(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(catData)
    });
  },

  async deleteCategory(id) {
    return this.request(`/categories/${id}`, {
      method: 'DELETE'
    });
  },

  // Customers Endpoints
  async getCustomers(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/customers?${query}`);
  },

  async getCustomer(id) {
    return this.request(`/customers/${id}`);
  },

  async createCustomer(custData) {
    return this.request('/customers', {
      method: 'POST',
      body: JSON.stringify(custData)
    });
  },

  async updateCustomer(id, custData) {
    return this.request(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(custData)
    });
  },

  async deleteCustomer(id) {
    return this.request(`/customers/${id}`, {
      method: 'DELETE'
    });
  },

  // Suppliers Endpoints
  async getSuppliers(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/suppliers?${query}`);
  },

  async getSupplier(id) {
    return this.request(`/suppliers/${id}`);
  },

  async createSupplier(supData) {
    return this.request('/suppliers', {
      method: 'POST',
      body: JSON.stringify(supData)
    });
  },

  async updateSupplier(id, supData) {
    return this.request(`/suppliers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(supData)
    });
  },

  async deleteSupplier(id) {
    return this.request(`/suppliers/${id}`, {
      method: 'DELETE'
    });
  },

  // Purchases Endpoints
  async getPurchases() {
    return this.request('/purchases');
  },

  async getPurchase(id) {
    return this.request(`/purchases/${id}`);
  },

  async createPurchase(purchaseData) {
    return this.request('/purchases', {
      method: 'POST',
      body: JSON.stringify(purchaseData)
    });
  },

  // Sales Endpoints
  async getSales(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/sales?${query}`);
  },

  async getSale(id) {
    return this.request(`/sales/${id}`);
  },

  async createSale(saleData) {
    return this.request('/sales', {
      method: 'POST',
      body: JSON.stringify(saleData)
    });
  },

  async completeHeldSale(id, data) {
    return this.request(`/sales/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async deleteHeldSale(id) {
    return this.request(`/sales/${id}`, {
      method: 'DELETE'
    });
  },

  // Returns Endpoints
  async getReturns() {
    return this.request('/returns');
  },

  async processReturn(saleId) {
    return this.request('/returns', {
      method: 'POST',
      body: JSON.stringify({ sale_id: saleId })
    });
  },

  // Reports Endpoints
  async getDashboardData() {
    return this.request('/reports/dashboard');
  },

  async getReportData(params) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/reports/query?${query}`);
  },

  getPDFReportUrl(params) {
    const query = new URLSearchParams(params).toString();
    const token = this.getToken();
    return `${API_BASE}/reports/export/pdf?${query}&token=${token}`;
  },

  getExcelReportUrl(params) {
    const query = new URLSearchParams(params).toString();
    const token = this.getToken();
    return `${API_BASE}/reports/export/excel?${query}&token=${token}`;
  },

  // Settings Endpoints
  async getSettings() {
    return this.request('/settings');
  },

  async updateSettings(settingsData) {
    return this.request('/settings', {
      method: 'POST',
      body: JSON.stringify(settingsData)
    });
  },

  async createBackup() {
    return this.request('/settings/backup', {
      method: 'POST'
    });
  },

  async getBackupsList() {
    return this.request('/settings/backup/list');
  },

  getBackupDownloadUrl(filename) {
    return `${API_BASE}/settings/backup/download/${filename}`;
  },

  async restoreDatabase(formData) {
    return this.request('/settings/restore', {
      method: 'POST',
      body: formData
    });
  }
};
