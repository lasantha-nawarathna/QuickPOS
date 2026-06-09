// Global App state and controller namespace
window.QuickPOS = {
  activeView: 'pos',
  storeSettings: {},
  
  // Initialize Application
  async init() {
    // 1. Setup Theme Toggle
    this.initTheme();

    // 2. Setup Login Listener
    document.getElementById('login-form').addEventListener('submit', (e) => this.handleLogin(e));
    document.getElementById('btn-logout').addEventListener('click', () => this.handleLogout());
    document.getElementById('profile-logout').addEventListener('click', () => this.handleLogout());

    // 3. Setup Navigation Sidebar Links
    document.querySelectorAll('.sidebar-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const view = link.getAttribute('data-view');
        this.switchView(view);
      });
    });

    // 4. Check Authentication
    if (API.getToken()) {
      try {
        const profileData = await API.getProfile();
        if (profileData.success) {
          this.onAuthenticated(profileData.user);
        } else {
          this.showLogin();
        }
      } catch (error) {
        this.showLogin();
      }
    } else {
      this.showLogin();
    }
  },

  // Theme support
  initTheme() {
    const savedTheme = localStorage.getItem('pos_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    this.updateThemeIcon(savedTheme);

    document.getElementById('theme-toggle').addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('pos_theme', newTheme);
      this.updateThemeIcon(newTheme);
    });
  },

  updateThemeIcon(theme) {
    const icon = document.querySelector('#theme-toggle i');
    if (theme === 'dark') {
      icon.className = 'fa-solid fa-sun fs-5';
    } else {
      icon.className = 'fa-solid fa-moon fs-5';
    }
  },

  // Auth Functions
  showLogin() {
    document.getElementById('login-overlay').classList.remove('d-none');
    document.getElementById('app-container').classList.add('d-none');
  },

  async handleLogin(e) {
    e.preventDefault();
    const alertEl = document.getElementById('login-alert');
    alertEl.classList.add('d-none');

    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    try {
      const data = await API.login(username, password);
      if (data.success) {
        this.onAuthenticated(data.user);
      }
    } catch (error) {
      alertEl.textContent = error.message;
      alertEl.classList.remove('d-none');
    }
  },

  handleLogout() {
    API.clearToken();
    API.clearCurrentUser();
    window.location.reload();
  },

  async onAuthenticated(user) {
    document.getElementById('login-overlay').classList.add('d-none');
    document.getElementById('app-container').classList.remove('d-none');
    
    // Display profile details
    document.getElementById('nav-user-name').textContent = user.full_name;
    document.getElementById('nav-user-role').textContent = user.role;

    // Apply Role Restrictions
    this.applyRoleRestrictions(user.role);

    // Fetch and cache store settings
    try {
      const settingsRes = await API.getSettings();
      if (settingsRes.success) {
        this.storeSettings = settingsRes.data;
      }
    } catch (e) {
      console.warn("Failed to load settings:", e);
    }

    // Initialize individual modules
    if (window.QuickPOS_Sales) window.QuickPOS_Sales.init();
    if (window.QuickPOS_Dashboard) window.QuickPOS_Dashboard.init();
    
    // Setup general listeners
    this.setupGeneralListeners();

    // Default view
    this.switchView('pos');
  },

  applyRoleRestrictions(role) {
    document.querySelectorAll('.sidebar-link').forEach(link => {
      const view = link.getAttribute('data-view');
      let visible = true;

      if (role === 'Cashier') {
        // Cashier sees only POS, Customers, Returns
        visible = ['pos', 'customers', 'returns'].includes(view);
      } else if (role === 'Manager') {
        // Manager sees everything except Settings
        visible = view !== 'settings';
      }

      if (visible) {
        link.parentElement.classList.remove('d-none');
      } else {
        link.parentElement.classList.add('d-none');
      }
    });

    // Hide user accounts and store forms from non-admins in view settings
    if (role !== 'Administrator') {
      const adminUsersCard = document.getElementById('users-admin-card');
      if (adminUsersCard) adminUsersCard.classList.add('d-none');
    }
  },

  // View Switcher Router
  switchView(view) {
    this.activeView = view;
    
    // Update active sidebar link
    document.querySelectorAll('.sidebar-link').forEach(link => {
      if (link.getAttribute('data-view') === view) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Toggle view visibility
    document.querySelectorAll('.app-view').forEach(viewEl => {
      viewEl.classList.add('d-none');
    });
    
    const targetViewEl = document.getElementById(`view-${view}`);
    if (targetViewEl) targetViewEl.classList.remove('d-none');

    // Update Header title
    const titles = {
      pos: 'POS Sales Screen',
      dashboard: 'Dashboard Overview',
      products: 'Products Catalog Management',
      categories: 'Product Categories',
      customers: 'Customer Loyalty Registry',
      suppliers: 'Suppliers contacts',
      purchases: 'Inventory Purchase Orders',
      returns: 'Returns & Refund Center',
      reports: 'Management Reports & Audits',
      settings: 'POS Terminal Settings'
    };
    document.getElementById('page-title').textContent = titles[view] || 'QuickPOS';

    // Trigger View Load Details
    this.onViewLoaded(view);
  },

  onViewLoaded(view) {
    switch (view) {
      case 'pos':
        if (window.QuickPOS_Sales) window.QuickPOS_Sales.loadPOSData();
        break;
      case 'dashboard':
        if (window.QuickPOS_Dashboard) window.QuickPOS_Dashboard.loadDashboard();
        break;
      case 'products':
        this.loadProductsList();
        break;
      case 'categories':
        this.loadCategoriesList();
        break;
      case 'customers':
        this.loadCustomersList();
        break;
      case 'suppliers':
        this.loadSuppliersList();
        break;
      case 'purchases':
        this.loadPurchasesList();
        break;
      case 'returns':
        this.loadReturnsList();
        break;
      case 'reports':
        this.resetReportsPanel();
        break;
      case 'settings':
        this.loadSettingsPanel();
        break;
    }
  },

  // Alert system Helper
  showAlert(type, message) {
    const container = document.getElementById('global-alert-container');
    const alertHtml = `
      <div class="alert alert-${type} alert-dismissible fade show shadow-sm border-0" role="alert">
        <i class="fa-solid ${type === 'danger' ? 'fa-circle-xmark' : 'fa-circle-check'} me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
      </div>
    `;
    container.innerHTML = alertHtml;
    // Auto-dismiss alert after 4 seconds
    setTimeout(() => {
      const alertEl = container.querySelector('.alert');
      if (alertEl) {
        const bsAlert = bootstrap.Alert.getInstance(alertEl) || new bootstrap.Alert(alertEl);
        bsAlert.close();
      }
    }, 4000);
  },

  // Form submit & list rendering loaders
  setupGeneralListeners() {
    // 1. Products Setup listeners
    document.getElementById('products-search').addEventListener('input', () => this.loadProductsList());
    document.getElementById('products-category-filter').addEventListener('change', () => this.loadProductsList());
    document.getElementById('products-stock-filter').addEventListener('change', () => this.loadProductsList());
    document.getElementById('form-product').addEventListener('submit', (e) => this.saveProduct(e));
    document.getElementById('btn-add-product').addEventListener('click', () => {
      document.getElementById('form-product').reset();
      document.getElementById('product-id').value = '';
      document.getElementById('modal-product-title').textContent = 'Add New Product';
    });

    // 2. Categories Setup listeners
    document.getElementById('form-category').addEventListener('submit', (e) => this.saveCategory(e));
    document.getElementById('btn-add-category').addEventListener('click', () => {
      document.getElementById('form-category').reset();
      document.getElementById('category-id').value = '';
      document.getElementById('modal-category-title').textContent = 'Add Category';
    });

    // 3. Customers Setup listeners
    document.getElementById('customers-search').addEventListener('input', () => this.loadCustomersList());
    document.getElementById('form-customer').addEventListener('submit', (e) => this.saveCustomer(e));
    document.getElementById('btn-add-customer').addEventListener('click', () => {
      document.getElementById('form-customer').reset();
      document.getElementById('customer-id').value = '';
      document.getElementById('modal-customer-title').textContent = 'Add Customer Profile';
    });

    // 4. Suppliers Setup listeners
    document.getElementById('suppliers-search').addEventListener('input', () => this.loadSuppliersList());
    document.getElementById('form-supplier').addEventListener('submit', (e) => this.saveSupplier(e));
    document.getElementById('btn-add-supplier').addEventListener('click', () => {
      document.getElementById('form-supplier').reset();
      document.getElementById('supplier-id').value = '';
      document.getElementById('modal-supplier-title').textContent = 'Add Supplier Contact';
    });

    // 5. System settings setup listeners
    document.getElementById('store-settings-form').addEventListener('submit', (e) => this.saveStoreSettings(e));
    document.getElementById('btn-create-backup').addEventListener('click', () => this.createDatabaseBackup());
    document.getElementById('db-restore-form').addEventListener('submit', (e) => this.restoreDatabase(e));

    // Admin Users listener
    document.getElementById('form-user').addEventListener('submit', (e) => this.saveUser(e));
    document.getElementById('btn-add-user').addEventListener('click', () => {
      document.getElementById('form-user').reset();
      document.getElementById('user-id').value = '';
      document.getElementById('modal-user-title').textContent = 'Add System User';
      document.getElementById('user-password').setAttribute('required', 'required');
      document.getElementById('help-user-password').classList.add('d-none');
    });

    // 6. Return process submit
    document.getElementById('form-process-return').addEventListener('submit', (e) => this.handleReturnSubmit(e));
  },

  // ==================== LOAD & CRUD LOADERS ====================

  // --- PRODUCTS ---
  async loadProductsList() {
    const search = document.getElementById('products-search').value;
    const category_id = document.getElementById('products-category-filter').value;
    const low_stock = document.getElementById('products-stock-filter').checked ? 'true' : 'false';

    try {
      const res = await API.getProducts({ search, category_id, low_stock });
      if (res.success) {
        const tbody = document.getElementById('products-table-body');
        tbody.innerHTML = '';
        
        res.data.forEach(p => {
          const imgStyle = p.image ? `background-image: url('${p.image}'); background-size: cover;` : '';
          const stockClass = p.stock_quantity <= p.reorder_level ? 'text-danger fw-bold' : '';
          
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>
              <div style="width: 40px; height: 40px; border-radius: 4px; background-color: #e2e8f0; ${imgStyle}" class="d-flex align-items-center justify-content-center">
                ${!p.image ? `<i class="fa-solid fa-image text-muted"></i>` : ''}
              </div>
            </td>
            <td><strong>${p.name}</strong></td>
            <td><code>${p.sku || 'N/A'}</code></td>
            <td>${p.Category ? p.Category.name : 'Uncategorized'}</td>
            <td>${this.storeSettings.currency_symbol || '$'}${parseFloat(p.cost_price).toFixed(2)}</td>
            <td><strong class="text-success">${this.storeSettings.currency_symbol || '$'}${parseFloat(p.selling_price).toFixed(2)}</strong></td>
            <td class="${stockClass}">${p.stock_quantity} <span class="badge bg-secondary-subtle text-dark small" style="font-size:0.65rem;">Min: ${p.reorder_level}</span></td>
            <td>
              <div class="btn-group btn-group-sm">
                <button class="btn btn-outline-primary" onclick="QuickPOS.editProduct(${p.id})"><i class="fa-solid fa-edit"></i></button>
                <button class="btn btn-outline-danger" onclick="QuickPOS.deleteProduct(${p.id})"><i class="fa-solid fa-trash"></i></button>
              </div>
            </td>
          `;
          tbody.appendChild(tr);
        });
      }
    } catch (e) {
      this.showAlert('danger', `Failed to load products list: ${e.message}`);
    }
  },

  async saveProduct(e) {
    e.preventDefault();
    const id = document.getElementById('product-id').value;
    const formEl = document.getElementById('form-product');
    const formData = new FormData();

    formData.append('name', document.getElementById('product-name').value);
    formData.append('category_id', document.getElementById('product-category').value);
    formData.append('sku', document.getElementById('product-sku').value);
    formData.append('barcode', document.getElementById('product-barcode').value);
    formData.append('cost_price', document.getElementById('product-cost').value);
    formData.append('selling_price', document.getElementById('product-selling').value);
    formData.append('tax_rate', document.getElementById('product-tax').value);
    formData.append('stock_quantity', document.getElementById('product-stock').value);
    formData.append('reorder_level', document.getElementById('product-reorder').value);
    formData.append('description', document.getElementById('product-desc').value);

    const imageFile = document.getElementById('product-image').files[0];
    if (imageFile) {
      formData.append('image', imageFile);
    }

    try {
      let res;
      if (id) {
        res = await API.updateProduct(id, formData);
      } else {
        res = await API.createProduct(formData);
      }

      if (res.success) {
        this.showAlert('success', id ? 'Product updated successfully' : 'Product created successfully');
        // Hide modal
        bootstrap.Modal.getInstance(document.getElementById('modal-product')).hide();
        this.loadProductsList();
      }
    } catch (error) {
      this.showAlert('danger', `Error saving product: ${error.message}`);
    }
  },

  async editProduct(id) {
    try {
      const res = await API.getProduct(id);
      if (res.success) {
        const p = res.data;
        document.getElementById('product-id').value = p.id;
        document.getElementById('product-name').value = p.name;
        document.getElementById('product-category').value = p.category_id || '';
        document.getElementById('product-sku').value = p.sku || '';
        document.getElementById('product-barcode').value = p.barcode || '';
        document.getElementById('product-cost').value = p.cost_price;
        document.getElementById('product-selling').value = p.selling_price;
        document.getElementById('product-tax').value = p.tax_rate;
        document.getElementById('product-stock').value = p.stock_quantity;
        document.getElementById('product-reorder').value = p.reorder_level;
        document.getElementById('product-desc').value = p.description || '';
        document.getElementById('product-image').value = ''; // Reset file input

        document.getElementById('modal-product-title').textContent = 'Edit Product Details';
        new bootstrap.Modal(document.getElementById('modal-product')).show();
      }
    } catch (e) {
      this.showAlert('danger', `Failed to load product details: ${e.message}`);
    }
  },

  async deleteProduct(id) {
    if (confirm('Are you sure you want to delete this product?')) {
      try {
        const res = await API.deleteProduct(id);
        if (res.success) {
          this.showAlert('success', 'Product deleted successfully');
          this.loadProductsList();
        }
      } catch (e) {
        this.showAlert('danger', `Error deleting product: ${e.message}`);
      }
    }
  },

  // --- CATEGORIES ---
  async loadCategoriesList() {
    try {
      const res = await API.getCategories();
      if (res.success) {
        // Populate view table
        const tbody = document.getElementById('categories-table-body');
        tbody.innerHTML = '';
        
        // Populate products modal category selector as well
        const productCatSelect = document.getElementById('product-category');
        productCatSelect.innerHTML = '<option value="">Select Category</option>';

        const filterSelect = document.getElementById('products-category-filter');
        filterSelect.innerHTML = '<option value="">All Categories</option>';

        res.data.forEach(c => {
          // Table
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td><code>${c.id}</code></td>
            <td><strong>${c.name}</strong></td>
            <td>${c.description || '<span class="text-muted small">No description</span>'}</td>
            <td>
              <div class="btn-group btn-group-sm">
                <button class="btn btn-outline-primary" onclick="QuickPOS.editCategory(${c.id})"><i class="fa-solid fa-edit"></i></button>
                <button class="btn btn-outline-danger" onclick="QuickPOS.deleteCategory(${c.id})"><i class="fa-solid fa-trash"></i></button>
              </div>
            </td>
          `;
          tbody.appendChild(tr);

          // Modals dropdowns
          const opt = `<option value="${c.id}">${c.name}</option>`;
          productCatSelect.innerHTML += opt;
          filterSelect.innerHTML += opt;
        });
      }
    } catch (e) {
      this.showAlert('danger', `Failed to load categories: ${e.message}`);
    }
  },

  async saveCategory(e) {
    e.preventDefault();
    const id = document.getElementById('category-id').value;
    const catData = {
      name: document.getElementById('category-name').value,
      description: document.getElementById('category-desc').value
    };

    try {
      let res;
      if (id) {
        res = await API.updateCategory(id, catData);
      } else {
        res = await API.createCategory(catData);
      }
      if (res.success) {
        this.showAlert('success', id ? 'Category updated' : 'Category created');
        bootstrap.Modal.getInstance(document.getElementById('modal-category')).hide();
        this.loadCategoriesList();
      }
    } catch (error) {
      this.showAlert('danger', `Error saving category: ${error.message}`);
    }
  },

  async editCategory(id) {
    try {
      const cats = await API.getCategories();
      const c = cats.data.find(x => x.id === id);
      if (c) {
        document.getElementById('category-id').value = c.id;
        document.getElementById('category-name').value = c.name;
        document.getElementById('category-desc').value = c.description || '';
        document.getElementById('modal-category-title').textContent = 'Edit Category';
        new bootstrap.Modal(document.getElementById('modal-category')).show();
      }
    } catch (e) {
      this.showAlert('danger', `Error fetching category details`);
    }
  },

  async deleteCategory(id) {
    if (confirm('Are you sure you want to delete this category? Products inside this category will become uncategorized.')) {
      try {
        const res = await API.deleteCategory(id);
        if (res.success) {
          this.showAlert('success', 'Category deleted');
          this.loadCategoriesList();
        }
      } catch (e) {
        this.showAlert('danger', `Error deleting category: ${e.message}`);
      }
    }
  },

  // --- CUSTOMERS ---
  async loadCustomersList() {
    const search = document.getElementById('customers-search').value;
    try {
      const res = await API.getCustomers({ search });
      if (res.success) {
        const tbody = document.getElementById('customers-table-body');
        tbody.innerHTML = '';

        res.data.forEach(c => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td><strong>${c.first_name} ${c.last_name}</strong></td>
            <td>${c.phone || 'N/A'}</td>
            <td>${c.email || 'N/A'}</td>
            <td>${c.address || 'N/A'}</td>
            <td><span class="badge bg-success">${c.loyalty_points} pts</span></td>
            <td>
              <div class="btn-group btn-group-sm">
                <button class="btn btn-outline-primary" onclick="QuickPOS.editCustomer(${c.id})"><i class="fa-solid fa-edit"></i></button>
                <button class="btn btn-outline-danger" onclick="QuickPOS.deleteCustomer(${c.id})"><i class="fa-solid fa-trash"></i></button>
              </div>
            </td>
          `;
          tbody.appendChild(tr);
        });

        // Trigger POS module to reload selector list
        if (window.QuickPOS_Sales) window.QuickPOS_Sales.populateCustomersDropdown(res.data);
      }
    } catch (e) {
      this.showAlert('danger', `Failed to load customer list: ${e.message}`);
    }
  },

  async saveCustomer(e) {
    e.preventDefault();
    const id = document.getElementById('customer-id').value;
    const custData = {
      first_name: document.getElementById('customer-firstname').value,
      last_name: document.getElementById('customer-lastname').value,
      phone: document.getElementById('customer-phone').value,
      email: document.getElementById('customer-email').value,
      address: document.getElementById('customer-address').value
    };

    try {
      let res;
      if (id) {
        res = await API.updateCustomer(id, custData);
      } else {
        res = await API.createCustomer(custData);
      }
      if (res.success) {
        this.showAlert('success', id ? 'Customer updated' : 'Customer profile added');
        bootstrap.Modal.getInstance(document.getElementById('modal-customer')).hide();
        this.loadCustomersList();
      }
    } catch (error) {
      this.showAlert('danger', `Error saving customer details: ${error.message}`);
    }
  },

  async editCustomer(id) {
    try {
      const res = await API.getCustomer(id);
      if (res.success) {
        const c = res.data;
        document.getElementById('customer-id').value = c.id;
        document.getElementById('customer-firstname').value = c.first_name;
        document.getElementById('customer-lastname').value = c.last_name;
        document.getElementById('customer-phone').value = c.phone || '';
        document.getElementById('customer-email').value = c.email || '';
        document.getElementById('customer-address').value = c.address || '';
        document.getElementById('modal-customer-title').textContent = 'Edit Customer Profile';
        new bootstrap.Modal(document.getElementById('modal-customer')).show();
      }
    } catch (e) {
      this.showAlert('danger', `Error fetching customer profile: ${e.message}`);
    }
  },

  async deleteCustomer(id) {
    if (confirm('Delete this customer profile permanently?')) {
      try {
        const res = await API.deleteCustomer(id);
        if (res.success) {
          this.showAlert('success', 'Customer profile deleted');
          this.loadCustomersList();
        }
      } catch (e) {
        this.showAlert('danger', `Error deleting customer: ${e.message}`);
      }
    }
  },

  // --- SUPPLIERS ---
  async loadSuppliersList() {
    const search = document.getElementById('suppliers-search').value;
    try {
      const res = await API.getSuppliers({ search });
      if (res.success) {
        const tbody = document.getElementById('suppliers-table-body');
        tbody.innerHTML = '';
        res.data.forEach(s => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td><strong>${s.name}</strong></td>
            <td>${s.phone || 'N/A'}</td>
            <td>${s.email || 'N/A'}</td>
            <td>${s.address || 'N/A'}</td>
            <td>
              <div class="btn-group btn-group-sm">
                <button class="btn btn-outline-primary" onclick="QuickPOS.editSupplier(${s.id})"><i class="fa-solid fa-edit"></i></button>
                <button class="btn btn-outline-danger" onclick="QuickPOS.deleteSupplier(${s.id})"><i class="fa-solid fa-trash"></i></button>
              </div>
            </td>
          `;
          tbody.appendChild(tr);
        });
      }
    } catch (e) {
      this.showAlert('danger', `Failed to load suppliers: ${e.message}`);
    }
  },

  async saveSupplier(e) {
    e.preventDefault();
    const id = document.getElementById('supplier-id').value;
    const supData = {
      name: document.getElementById('supplier-name').value,
      phone: document.getElementById('supplier-phone').value,
      email: document.getElementById('supplier-email').value,
      address: document.getElementById('supplier-address').value
    };

    try {
      let res;
      if (id) {
        res = await API.updateSupplier(id, supData);
      } else {
        res = await API.createSupplier(supData);
      }
      if (res.success) {
        this.showAlert('success', id ? 'Supplier details updated' : 'Supplier profile added');
        bootstrap.Modal.getInstance(document.getElementById('modal-supplier')).hide();
        this.loadSuppliersList();
      }
    } catch (error) {
      this.showAlert('danger', `Error saving supplier profile: ${error.message}`);
    }
  },

  async editSupplier(id) {
    try {
      const res = await API.getSupplier(id);
      if (res.success) {
        const s = res.data;
        document.getElementById('supplier-id').value = s.id;
        document.getElementById('supplier-name').value = s.name;
        document.getElementById('supplier-phone').value = s.phone || '';
        document.getElementById('supplier-email').value = s.email || '';
        document.getElementById('supplier-address').value = s.address || '';
        document.getElementById('modal-supplier-title').textContent = 'Edit Supplier Profile';
        new bootstrap.Modal(document.getElementById('modal-supplier')).show();
      }
    } catch (e) {
      this.showAlert('danger', `Error fetching supplier profile: ${e.message}`);
    }
  },

  async deleteSupplier(id) {
    if (confirm('Delete this supplier profile permanently?')) {
      try {
        const res = await API.deleteSupplier(id);
        if (res.success) {
          this.showAlert('success', 'Supplier deleted');
          this.loadSuppliersList();
        }
      } catch (e) {
        this.showAlert('danger', `Error deleting supplier: ${e.message}`);
      }
    }
  },

  // --- PURCHASES (INCOMING STOCK POs) ---
  async loadPurchasesList() {
    try {
      const res = await API.getPurchases();
      if (res.success) {
        const tbody = document.getElementById('purchases-table-body');
        tbody.innerHTML = '';
        res.data.forEach(po => {
          const dateStr = new Date(po.purchase_date).toLocaleString();
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td><code>PO-${po.id}</code></td>
            <td>${dateStr}</td>
            <td>${po.Supplier ? po.Supplier.name : 'Unknown Supplier'}</td>
            <td><strong>${this.storeSettings.currency_symbol || '$'}${parseFloat(po.total_amount).toFixed(2)}</strong></td>
            <td>
              <button class="btn btn-outline-info btn-sm" onclick="QuickPOS.viewPurchaseDetails(${po.id})">
                <i class="fa-solid fa-eye me-1"></i>View Items
              </button>
            </td>
          `;
          tbody.appendChild(tr);
        });
      }
    } catch (e) {
      this.showAlert('danger', `Failed to load purchase orders: ${e.message}`);
    }
  },

  async viewPurchaseDetails(poId) {
    try {
      const res = await API.getPurchase(poId);
      if (res.success) {
        const po = res.data;
        document.getElementById('po-detail-id').textContent = `PO-${po.id}`;
        document.getElementById('po-detail-supplier').textContent = po.Supplier ? po.Supplier.name : 'Unknown';
        document.getElementById('po-detail-date').textContent = new Date(po.purchase_date).toLocaleString();
        document.getElementById('po-detail-total').textContent = `${this.storeSettings.currency_symbol || '$'}${parseFloat(po.total_amount).toFixed(2)}`;

        const tbody = document.getElementById('po-detail-items');
        tbody.innerHTML = '';
        po.PurchaseItems.forEach(item => {
          const prodName = item.Product ? item.Product.name : 'Deleted Product';
          const subtotal = item.quantity * item.cost_price;
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>${prodName}</td>
            <td>${item.quantity}</td>
            <td>${this.storeSettings.currency_symbol || '$'}${parseFloat(item.cost_price).toFixed(2)}</td>
            <td><strong>${this.storeSettings.currency_symbol || '$'}${parseFloat(subtotal).toFixed(2)}</strong></td>
          `;
          tbody.appendChild(tr);
        });

        new bootstrap.Modal(document.getElementById('modal-purchase-detail')).show();
      }
    } catch (e) {
      this.showAlert('danger', `Failed to load PO details: ${e.message}`);
    }
  },

  // --- RETURNS ---
  async loadReturnsList() {
    try {
      const res = await API.getReturns();
      if (res.success) {
        const tbody = document.getElementById('returns-table-body');
        tbody.innerHTML = '';
        res.data.forEach(ret => {
          const dateStr = new Date(ret.return_date).toLocaleString();
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td><code>RET-${ret.id}</code></td>
            <td><code>TXN-${ret.sale_id}</code></td>
            <td>${dateStr}</td>
            <td><strong class="text-danger">${this.storeSettings.currency_symbol || '$'}${parseFloat(ret.refund_amount).toFixed(2)}</strong></td>
          `;
          tbody.appendChild(tr);
        });
      }
    } catch (e) {
      this.showAlert('danger', `Failed to load returns list: ${e.message}`);
    }
  },

  async handleReturnSubmit(e) {
    e.preventDefault();
    const txnId = document.getElementById('return-sale-id').value;
    try {
      const res = await API.processReturn(txnId);
      if (res.success) {
        this.showAlert('success', `Transaction ${txnId} successfully refunded and items restocked!`);
        document.getElementById('form-process-return').reset();
        this.loadReturnsList();
      }
    } catch (e) {
      this.showAlert('danger', `Error executing return: ${e.message}`);
    }
  },

  // --- REPORTS ---
  resetReportsPanel() {
    document.getElementById('report-filter-form').reset();
    document.getElementById('report-results-panel').classList.add('d-none');
    
    // Wire reports filters
    const typeSelect = document.getElementById('report-type');
    typeSelect.addEventListener('change', () => {
      const val = typeSelect.value;
      const dateGroups = document.querySelectorAll('.report-date-group');
      // Hide date filters for valuation report
      if (val === 'valuation') {
        dateGroups.forEach(el => el.classList.add('d-none'));
      } else {
        dateGroups.forEach(el => el.classList.remove('d-none'));
      }
    });

    document.getElementById('report-filter-form').onsubmit = (e) => this.runReportQuery(e);
  },

  async runReportQuery(e) {
    e.preventDefault();
    const type = document.getElementById('report-type').value;
    const startDate = document.getElementById('report-start-date').value;
    const endDate = document.getElementById('report-end-date').value;

    const params = { type };
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    try {
      const res = await API.getReportData(params);
      if (res.success) {
        this.renderReportResults(type, res.data);
        
        // Setup download button hrefs
        document.getElementById('btn-report-pdf').onclick = () => window.open(API.getPDFReportUrl(params), '_blank');
        document.getElementById('btn-report-excel').onclick = () => window.open(API.getExcelReportUrl(params), '_blank');
        document.getElementById('btn-report-print').onclick = () => window.print();
      }
    } catch (e) {
      this.showAlert('danger', `Failed to query report: ${e.message}`);
    }
  },

  renderReportResults(type, records) {
    const head = document.getElementById('report-table-head');
    const body = document.getElementById('report-table-body');
    const panel = document.getElementById('report-results-panel');
    const title = document.getElementById('report-results-title');

    head.innerHTML = '';
    body.innerHTML = '';
    panel.classList.remove('d-none');
    
    const currency = this.storeSettings.currency_symbol || '$';

    if (type === 'sales') {
      title.textContent = 'Detailed Completed Sales Report';
      head.innerHTML = `
        <tr>
          <th>TXN ID</th>
          <th>Date/Time</th>
          <th>Customer</th>
          <th>Subtotal</th>
          <th>Discount</th>
          <th>Tax</th>
          <th>Total Charged</th>
          <th>Payment</th>
        </tr>
      `;
      records.forEach(r => {
        const cName = r.Customer ? `${r.Customer.first_name} ${r.Customer.last_name}` : 'Walk-in';
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><code>TXN-${r.id}</code></td>
          <td>${new Date(r.sale_date).toLocaleString()}</td>
          <td>${cName}</td>
          <td>${currency}${parseFloat(r.subtotal).toFixed(2)}</td>
          <td>${currency}${parseFloat(r.discount).toFixed(2)}</td>
          <td>${currency}${parseFloat(r.tax).toFixed(2)}</td>
          <td><strong>${currency}${parseFloat(r.total).toFixed(2)}</strong></td>
          <td>${r.payment_method}</td>
        `;
        body.appendChild(tr);
      });
    } else if (type === 'products') {
      title.textContent = 'Product Performance Report';
      head.innerHTML = `
        <tr>
          <th>Product ID</th>
          <th>Product Name</th>
          <th>SKU</th>
          <th>Cost Price</th>
          <th>Avg Retail Price</th>
          <th>Units Sold</th>
          <th>Total Revenue</th>
        </tr>
      `;
      records.forEach(r => {
        const pName = r.Product ? r.Product.name : 'N/A';
        const sku = r.Product ? r.Product.sku : 'N/A';
        const cost = r.Product ? parseFloat(r.Product.cost_price).toFixed(2) : '0.00';
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><code>${r.product_id}</code></td>
          <td><strong>${pName}</strong></td>
          <td><code>${sku}</code></td>
          <td>${currency}${cost}</td>
          <td>${currency}${parseFloat(r.avg_price).toFixed(2)}</td>
          <td>${r.quantity_sold}</td>
          <td><strong>${currency}${parseFloat(r.total_sales).toFixed(2)}</strong></td>
        `;
        body.appendChild(tr);
      });
    } else if (type === 'categories') {
      title.textContent = 'Category Sales Performance Report';
      head.innerHTML = `
        <tr>
          <th>Category Name</th>
          <th>Quantity Sold</th>
          <th>Total Sales Value</th>
        </tr>
      `;
      records.forEach(r => {
        const catName = r.Product && r.Product.Category ? r.Product.Category.name : 'Uncategorized';
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${catName}</strong></td>
          <td>${r.quantity_sold} units</td>
          <td><strong>${currency}${parseFloat(r.total_sales).toFixed(2)}</strong></td>
        `;
        body.appendChild(tr);
      });
    } else if (type === 'cashier') {
      title.textContent = 'Cashier Performance Summary';
      head.innerHTML = `
        <tr>
          <th>Cashier Full Name</th>
          <th>Username</th>
          <th>Sales Completed</th>
          <th>Total Sales Revenue</th>
        </tr>
      `;
      records.forEach(r => {
        const cName = r.Cashier ? r.Cashier.full_name : 'Deleted';
        const uName = r.Cashier ? r.Cashier.username : 'N/A';
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${cName}</strong></td>
          <td><code>${uName}</code></td>
          <td>${r.transaction_count} sales</td>
          <td><strong>${currency}${parseFloat(r.total_sales).toFixed(2)}</strong></td>
        `;
        body.appendChild(tr);
      });
    } else if (type === 'valuation') {
      title.textContent = 'Current Inventory Valuation Report';
      head.innerHTML = `
        <tr>
          <th>Product Name</th>
          <th>SKU</th>
          <th>Category</th>
          <th>Stock level</th>
          <th>Cost price</th>
          <th>Selling price</th>
          <th>Stock Cost Value</th>
          <th>Stock Retail Value</th>
        </tr>
      `;
      records.forEach(r => {
        const cat = r.Category ? r.Category.name : 'N/A';
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${r.name}</strong></td>
          <td><code>${r.sku || 'N/A'}</code></td>
          <td>${cat}</td>
          <td>${r.stock_quantity} units</td>
          <td>${currency}${parseFloat(r.cost_price).toFixed(2)}</td>
          <td>${currency}${parseFloat(r.selling_price).toFixed(2)}</td>
          <td><strong>${currency}${parseFloat(r.stock_cost_value || 0).toFixed(2)}</strong></td>
          <td><strong>${currency}${parseFloat(r.stock_selling_value || 0).toFixed(2)}</strong></td>
        `;
        body.appendChild(tr);
      });
    } else if (type === 'profit_loss') {
      title.textContent = 'Profit & Loss Statement';
      head.innerHTML = `
        <tr>
          <th>Financial Statement Item</th>
          <th>Amount Value</th>
        </tr>
      `;
      const pl = records[0];
      if (pl) {
        body.innerHTML = `
          <tr><td>Total Gross Revenue</td><td>${currency}${pl.total_revenue}</td></tr>
          <tr class="text-danger"><td>(-) Discounts Awarded</td><td>${currency}${pl.total_discount}</td></tr>
          <tr class="table-info fw-bold"><td>Net Retail Revenue</td><td>${currency}${pl.net_sales}</td></tr>
          <tr class="text-danger"><td>(-) Cost of Goods Sold (COGS)</td><td>${currency}${pl.total_cost}</td></tr>
          <tr class="table-success fw-bold" style="font-size:1.1rem;"><td>Gross Financial Profit</td><td>${currency}${pl.gross_profit}</td></tr>
          <tr><td>Estimated Tax Collected</td><td>${currency}${pl.total_tax}</td></tr>
          <tr class="table-primary fw-bold" style="font-size:1.2rem;"><td>Net Operating Profit</td><td>${currency}${pl.net_profit}</td></tr>
        `;
      }
    }
  },

  // --- SETTINGS, USERS & BACKUPS ---
  async loadSettingsPanel() {
    try {
      // Load Store Configuration settings
      const res = await API.getSettings();
      if (res.success) {
        this.storeSettings = res.data;
        document.getElementById('setting-store-name').value = res.data.store_name || '';
        document.getElementById('setting-currency').value = res.data.currency_symbol || '$';
        document.getElementById('setting-tax-rate').value = res.data.tax_rate || '0.00';
        document.getElementById('setting-receipt-footer').value = res.data.receipt_footer || '';
      }

      // Load DB Backups list
      this.loadBackupsList();

      // Load system user accounts (Admin only)
      const currentUser = API.getCurrentUser();
      if (currentUser && currentUser.role === 'Administrator') {
        document.getElementById('users-admin-card').classList.remove('d-none');
        this.loadUsersList();
      } else {
        document.getElementById('users-admin-card').classList.add('d-none');
      }

    } catch (e) {
      console.warn('Error loading settings settings: ', e);
    }
  },

  async saveStoreSettings(e) {
    e.preventDefault();
    const data = {
      store_name: document.getElementById('setting-store-name').value,
      currency_symbol: document.getElementById('setting-currency').value,
      tax_rate: document.getElementById('setting-tax-rate').value,
      receipt_footer: document.getElementById('setting-receipt-footer').value
    };

    try {
      const res = await API.updateSettings(data);
      if (res.success) {
        this.storeSettings = { ...this.storeSettings, ...data };
        this.showAlert('success', 'Store configuration settings updated successfully');
      }
    } catch (error) {
      this.showAlert('danger', `Failed to save settings: ${error.message}`);
    }
  },

  async loadBackupsList() {
    try {
      const res = await API.getBackupsList();
      if (res.success) {
        const backupsContainer = document.getElementById('backups-list');
        backupsContainer.innerHTML = '';
        
        if (res.data.length === 0) {
          backupsContainer.innerHTML = '<span class="text-muted small py-2">No backups found</span>';
          return;
        }

        res.data.forEach(file => {
          const item = document.createElement('div');
          item.className = 'list-group-item d-flex justify-content-between align-items-center px-0 py-2 bg-transparent border-0 border-bottom';
          item.innerHTML = `
            <span class="small font-monospace" style="font-size:0.75rem;">${file}</span>
            <a href="${API.getBackupDownloadUrl(file)}" class="btn btn-outline-info btn-xs py-0 px-1" title="Download backup"><i class="fa-solid fa-download"></i></a>
          `;
          backupsContainer.appendChild(item);
        });
      }
    } catch (e) {
      console.warn("Failed to load backups:", e);
    }
  },

  async createDatabaseBackup() {
    try {
      const res = await API.createBackup();
      if (res.success) {
        this.showAlert('success', 'SQLite Database file backed up successfully');
        this.loadBackupsList();
      }
    } catch (e) {
      this.showAlert('danger', `Backup creation failed: ${e.message}`);
    }
  },

  async restoreDatabase(e) {
    e.preventDefault();
    if (!confirm('CAUTION: Restoring database will overwrite all current system sales, products, and configurations. Proceed?')) {
      return;
    }

    const fileInput = document.getElementById('db-restore-file');
    const formData = new FormData();
    formData.append('db_file', fileInput.files[0]);

    try {
      const res = await API.restoreDatabase(formData);
      if (res.success) {
        alert('Database restored successfully! The app will reload now.');
        this.handleLogout(); // Log out and refresh to reload new data
      }
    } catch (e) {
      this.showAlert('danger', `Restoration failed: ${e.message}`);
    }
  },

  async loadUsersList() {
    try {
      const res = await API.getUsers();
      if (res.success) {
        const listContainer = document.getElementById('users-list');
        listContainer.innerHTML = '';

        res.data.forEach(u => {
          const item = document.createElement('div');
          item.className = 'list-group-item d-flex justify-content-between align-items-center px-0 py-2 bg-transparent border-0 border-bottom';
          item.innerHTML = `
            <div>
              <strong class="small">${u.full_name}</strong> <span class="badge bg-secondary-subtle text-dark" style="font-size:0.6rem;">${u.role}</span>
              <div class="text-muted small" style="font-size: 0.75rem;">@${u.username}</div>
            </div>
            <div class="btn-group btn-group-xs">
              <button class="btn btn-outline-primary btn-xs py-0 px-1" onclick="QuickPOS.editUser(${u.id})"><i class="fa-solid fa-edit"></i></button>
              <button class="btn btn-outline-danger btn-xs py-0 px-1" onclick="QuickPOS.deleteUser(${u.id})"><i class="fa-solid fa-trash"></i></button>
            </div>
          `;
          listContainer.appendChild(item);
        });
      }
    } catch (e) {
      console.warn("Failed to load user list:", e);
    }
  },

  async saveUser(e) {
    e.preventDefault();
    const id = document.getElementById('user-id').value;
    const pwd = document.getElementById('user-password').value;

    const userData = {
      full_name: document.getElementById('user-fullname').value,
      username: document.getElementById('user-username').value,
      role: document.getElementById('user-role').value
    };

    if (pwd) {
      userData.password = pwd;
    }

    try {
      let res;
      if (id) {
        res = await API.updateUser(id, userData);
      } else {
        res = await API.createUser(userData);
      }

      if (res.success) {
        this.showAlert('success', id ? 'User updated successfully' : 'User account created');
        bootstrap.Modal.getInstance(document.getElementById('modal-user')).hide();
        this.loadUsersList();
      }
    } catch (error) {
      this.showAlert('danger', `Failed to save user: ${error.message}`);
    }
  },

  async editUser(id) {
    try {
      const res = await API.getUsers();
      const u = res.data.find(x => x.id === id);
      if (u) {
        document.getElementById('user-id').value = u.id;
        document.getElementById('user-fullname').value = u.full_name;
        document.getElementById('user-username').value = u.username;
        document.getElementById('user-role').value = u.role;
        document.getElementById('user-password').value = ''; // Reset password input
        
        document.getElementById('user-password').removeAttribute('required');
        document.getElementById('help-user-password').classList.remove('d-none');
        document.getElementById('modal-user-title').textContent = 'Edit System User';

        new bootstrap.Modal(document.getElementById('modal-user')).show();
      }
    } catch (e) {
      this.showAlert('danger', 'Failed to retrieve user details');
    }
  },

  async deleteUser(id) {
    if (confirm('Delete this user account permanently?')) {
      try {
        const res = await API.deleteUser(id);
        if (res.success) {
          this.showAlert('success', 'User account deleted');
          this.loadUsersList();
        }
      } catch (e) {
        this.showAlert('danger', `Failed to delete user: ${e.message}`);
      }
    }
  }
};

// Start QuickPOS app on page load
window.addEventListener('DOMContentLoaded', () => {
  window.QuickPOS.init();
});
