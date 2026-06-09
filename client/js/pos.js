window.QuickPOS_Sales = {
  products: [],
  categories: [],
  cart: [],
  heldSalesCount: 0,
  currentHeldSaleId: null, // Track if we are editing an active resumed held sale

  init() {
    this.setupListeners();
  },

  setupListeners() {
    // Search listener
    document.getElementById('pos-search').addEventListener('input', () => this.filterProductsGrid());
    
    // Clear cart
    document.getElementById('btn-clear-cart').addEventListener('click', () => this.clearCart());

    // Discount change
    document.getElementById('pos-discount-input').addEventListener('input', () => this.updateCartTotals());

    // Hold Sale
    document.getElementById('btn-hold-sale').addEventListener('click', () => this.handleHoldSale());

    // Resume list
    document.getElementById('btn-resume-sales-list').addEventListener('click', () => this.openResumeSalesModal());

    // Checkout modal trigger
    document.getElementById('btn-checkout').addEventListener('click', () => this.openCheckoutModal());

    // Payment method selector
    document.getElementById('checkout-payment-method').addEventListener('change', () => this.handlePaymentMethodChange());

    // Amount paid watcher
    document.getElementById('checkout-amount-paid').addEventListener('input', () => this.calculateChange());
    document.getElementById('checkout-card-paid').addEventListener('input', () => this.calculateChange());

    // Complete Checkout submit
    document.getElementById('checkout-form').addEventListener('submit', (e) => this.handleCheckoutSubmit(e));

    // Direct print receipt button in modal
    document.getElementById('btn-print-receipt-modal').addEventListener('click', () => window.print());

    // Purchase Order creation setup
    document.getElementById('btn-new-purchase').addEventListener('click', () => this.openPurchaseOrderModal());
    document.getElementById('btn-purchase-add-item').addEventListener('click', () => this.addPurchaseOrderItem());
    document.getElementById('form-purchase').addEventListener('submit', (e) => this.submitPurchaseOrder(e));
  },

  // ==================== LOAD POS ASSETS ====================
  async loadPOSData() {
    try {
      // 1. Fetch Products
      const prodRes = await API.getProducts();
      if (prodRes.success) {
        this.products = prodRes.data;
        this.filterProductsGrid();
      }

      // 2. Fetch Categories
      const catRes = await API.getCategories();
      if (catRes.success) {
        this.categories = catRes.data;
        this.renderCategoryPills();
      }

      // 3. Fetch Customers
      const custRes = await API.getCustomers();
      if (custRes.success) {
        this.populateCustomersDropdown(custRes.data);
      }

      // 4. Update Hold count badge
      this.updateHeldSalesCount();

    } catch (e) {
      console.warn("Failed to load POS screen assets:", e);
    }
  },

  renderCategoryPills() {
    const container = document.getElementById('pos-categories');
    container.innerHTML = '<span class="category-pill active" data-category-id="">All</span>';
    
    this.categories.forEach(cat => {
      const pill = document.createElement('span');
      pill.className = 'category-pill';
      pill.setAttribute('data-category-id', cat.id);
      pill.textContent = cat.name;
      pill.addEventListener('click', () => {
        container.querySelectorAll('.category-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        this.filterProductsGrid();
      });
      container.appendChild(pill);
    });

    // Wire first pill
    container.querySelector('.category-pill').addEventListener('click', (e) => {
      container.querySelectorAll('.category-pill').forEach(p => p.classList.remove('active'));
      e.target.classList.add('active');
      this.filterProductsGrid();
    });
  },

  populateCustomersDropdown(customers) {
    const select = document.getElementById('pos-customer');
    const val = select.value;
    select.innerHTML = '<option value="">Walk-in Customer</option>';
    customers.forEach(c => {
      select.innerHTML += `<option value="${c.id}">${c.first_name} ${c.last_name} (${c.phone || 'no phone'})</option>`;
    });
    select.value = val;
  },

  // ==================== RENDER PRODUCTS GRID ====================
  filterProductsGrid() {
    const search = document.getElementById('pos-search').value.toLowerCase();
    
    const activePill = document.querySelector('#pos-categories .category-pill.active');
    const category_id = activePill ? activePill.getAttribute('data-category-id') : '';

    const grid = document.getElementById('pos-product-grid');
    grid.innerHTML = '';

    const filtered = this.products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(search) || 
                            (p.sku && p.sku.toLowerCase().includes(search)) || 
                            (p.barcode && p.barcode.toLowerCase().includes(search));
      const matchesCategory = category_id === '' || String(p.category_id) === String(category_id);
      return matchesSearch && matchesCategory;
    });

    if (filtered.length === 0) {
      grid.innerHTML = '<div class="text-center text-muted w-100 py-5"><p>No products found matching filters</p></div>';
      return;
    }

    filtered.forEach(p => {
      const isOutOfStock = p.stock_quantity <= 0;
      const isLowStock = p.stock_quantity <= p.reorder_level;
      
      const card = document.createElement('div');
      card.className = `card glass-card pos-product-card ${isOutOfStock ? 'opacity-50' : ''}`;
      
      const imgStyle = p.image ? `background-image: url('${p.image}');` : '';
      
      card.innerHTML = `
        <div class="pos-product-img" style="${imgStyle}">
          ${!p.image ? `<div class="no-image-text fw-bold text-uppercase">${p.name.slice(0, 3)}</div>` : ''}
          <span class="pos-product-stock-tag ${isLowStock ? 'low-stock' : ''}">
            ${isOutOfStock ? 'OUT' : `Qty: ${p.stock_quantity}`}
          </span>
        </div>
        <div class="pos-product-details">
          <div class="pos-product-name" title="${p.name}">${p.name}</div>
          <div class="d-flex justify-content-between align-items-center mt-2">
            <span class="pos-product-price">${window.QuickPOS.storeSettings.currency_symbol || '$'}${parseFloat(p.selling_price).toFixed(2)}</span>
            <button class="btn btn-primary btn-xs rounded-circle px-2" ${isOutOfStock ? 'disabled' : ''}>
              <i class="fa-solid fa-plus"></i>
            </button>
          </div>
        </div>
      `;

      if (!isOutOfStock) {
        card.addEventListener('click', () => this.addToCart(p));
      }
      
      grid.appendChild(card);
    });
  },

  // ==================== CART ACTIONS ====================
  addToCart(product) {
    const existing = this.cart.find(item => item.product_id === product.id);
    
    if (existing) {
      if (existing.quantity >= product.stock_quantity) {
        window.QuickPOS.showAlert('danger', `Cannot exceed stock limit. Only ${product.stock_quantity} available.`);
        return;
      }
      existing.quantity += 1;
    } else {
      if (product.stock_quantity < 1) {
        window.QuickPOS.showAlert('danger', 'Product is out of stock');
        return;
      }
      this.cart.push({
        product_id: product.id,
        name: product.name,
        selling_price: parseFloat(product.selling_price),
        tax_rate: parseFloat(product.tax_rate),
        quantity: 1,
        maxStock: product.stock_quantity
      });
    }

    this.renderCart();
  },

  updateQty(productId, amount) {
    const item = this.cart.find(x => x.product_id === productId);
    if (item) {
      item.quantity += amount;
      if (item.quantity > item.maxStock) {
        window.QuickPOS.showAlert('danger', `Cannot exceed stock limit. Only ${item.maxStock} available.`);
        item.quantity = item.maxStock;
      }
      if (item.quantity <= 0) {
        this.cart = this.cart.filter(x => x.product_id !== productId);
      }
      this.renderCart();
    }
  },

  removeFromCart(productId) {
    this.cart = this.cart.filter(x => x.product_id !== productId);
    this.renderCart();
  },

  clearCart() {
    this.cart = [];
    this.currentHeldSaleId = null;
    document.getElementById('pos-discount-input').value = 0;
    this.renderCart();
  },

  renderCart() {
    const list = document.getElementById('pos-cart-list');
    list.innerHTML = '';

    if (this.cart.length === 0) {
      list.innerHTML = `
        <div class="text-center text-muted py-5 my-auto">
          <i class="fa-solid fa-shopping-bag fa-3x mb-2 text-black-50"></i>
          <p class="mb-0">Cart is empty</p>
        </div>
      `;
      this.updateCartTotals();
      return;
    }

    const currency = window.QuickPOS.storeSettings.currency_symbol || '$';

    this.cart.forEach(item => {
      const rowTotal = item.selling_price * item.quantity;
      const el = document.createElement('div');
      el.className = 'cart-item';
      el.innerHTML = `
        <div style="flex: 1;">
          <div class="cart-item-name">${item.name}</div>
          <div class="text-muted small">${currency}${item.selling_price.toFixed(2)} each</div>
        </div>
        <div class="d-flex align-items-center gap-1 mx-2">
          <button class="btn btn-outline-secondary btn-xs cart-item-qty-btn" onclick="QuickPOS_Sales.updateQty(${item.product_id}, -1)">-</button>
          <span class="px-2 fw-semibold" style="min-width: 24px; text-align: center;">${item.quantity}</span>
          <button class="btn btn-outline-secondary btn-xs cart-item-qty-btn" onclick="QuickPOS_Sales.updateQty(${item.product_id}, 1)">+</button>
        </div>
        <div class="text-end" style="min-width: 80px;">
          <strong class="text-success">${currency}${rowTotal.toFixed(2)}</strong>
          <a href="#" class="text-danger ms-2 small" onclick="QuickPOS_Sales.removeFromCart(${item.product_id})"><i class="fa-solid fa-trash-can"></i></a>
        </div>
      `;
      list.appendChild(el);
    });

    this.updateCartTotals();
  },

  updateCartTotals() {
    let subtotal = 0;
    let tax = 0;

    this.cart.forEach(item => {
      const rowTotal = item.selling_price * item.quantity;
      subtotal += rowTotal;
      // Tax amount per item
      tax += rowTotal * (item.tax_rate / 100);
    });

    const discount = parseFloat(document.getElementById('pos-discount-input').value) || 0;
    const total = subtotal + tax - discount;

    const currency = window.QuickPOS.storeSettings.currency_symbol || '$';
    document.getElementById('pos-subtotal').textContent = `${currency}${subtotal.toFixed(2)}`;
    document.getElementById('pos-tax').textContent = `${currency}${tax.toFixed(2)}`;
    document.getElementById('pos-total').textContent = `${currency}${Math.max(0, total).toFixed(2)}`;
  },

  // ==================== HOLD / RESUME SALE ====================
  async handleHoldSale() {
    if (this.cart.length === 0) {
      window.QuickPOS.showAlert('warning', 'Cannot hold an empty cart');
      return;
    }

    const customer_id = document.getElementById('pos-customer').value;
    const discount = parseFloat(document.getElementById('pos-discount-input').value) || 0;
    
    // Calculate tax
    let tax = 0;
    const itemsData = this.cart.map(item => {
      const rowTotal = item.selling_price * item.quantity;
      const tAmt = rowTotal * (item.tax_rate / 100);
      tax += tAmt;
      return {
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.selling_price,
        tax_amount: tAmt
      };
    });

    const saleData = {
      customer_id: customer_id || null,
      items: itemsData,
      discount,
      tax,
      payment_method: 'Hold', // Dummy payment method
      status: 'held'
    };

    try {
      let res;
      if (this.currentHeldSaleId) {
        // Resuming from an existing held sale that we are re-holding (update it)
        res = await API.completeHeldSale(this.currentHeldSaleId, { ...saleData, status: 'held' });
      } else {
        res = await API.createSale(saleData);
      }

      if (res.success) {
        window.QuickPOS.showAlert('success', 'Sale successfully saved as PENDING / HELD');
        this.clearCart();
        this.updateHeldSalesCount();
      }
    } catch (e) {
      window.QuickPOS.showAlert('danger', `Failed to hold sale: ${e.message}`);
    }
  },

  async updateHeldSalesCount() {
    try {
      const res = await API.getSales({ status: 'held' });
      if (res.success) {
        this.heldSalesCount = res.data.length;
        document.getElementById('hold-count').textContent = this.heldSalesCount;
      }
    } catch (e) {}
  },

  async openResumeSalesModal() {
    try {
      const res = await API.getSales({ status: 'held' });
      if (res.success) {
        const tbody = document.getElementById('held-sales-table-body');
        tbody.innerHTML = '';

        if (res.data.length === 0) {
          tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">No pending held sales found</td></tr>';
        } else {
          res.data.forEach(sale => {
            const dateStr = new Date(sale.sale_date).toLocaleString();
            const cName = sale.Customer ? `${sale.Customer.first_name} ${sale.Customer.last_name}` : 'Walk-in';
            const currency = window.QuickPOS.storeSettings.currency_symbol || '$';

            const tr = document.createElement('tr');
            tr.innerHTML = `
              <td><code>HOLD-${sale.id}</code></td>
              <td>${dateStr}</td>
              <td>${cName}</td>
              <td>${currency}${parseFloat(sale.subtotal).toFixed(2)}</td>
              <td><strong>${currency}${parseFloat(sale.total).toFixed(2)}</strong></td>
              <td>
                <div class="btn-group btn-group-sm">
                  <button class="btn btn-outline-info" onclick="QuickPOS_Sales.resumeSale(${sale.id})"><i class="fa-solid fa-folder-open me-1"></i>Resume</button>
                  <button class="btn btn-outline-danger" onclick="QuickPOS_Sales.deleteHeldSale(${sale.id})"><i class="fa-solid fa-trash-can"></i></button>
                </div>
              </td>
            `;
            tbody.appendChild(tr);
          });
        }
        
        new bootstrap.Modal(document.getElementById('modal-resume-sales')).show();
      }
    } catch (e) {
      window.QuickPOS.showAlert('danger', `Failed to retrieve held sales list: ${e.message}`);
    }
  },

  async resumeSale(saleId) {
    try {
      const res = await API.getSale(saleId);
      if (res.success) {
        const sale = res.data;
        
        // Load cart
        this.cart = sale.SaleItems.map(item => ({
          product_id: item.product_id,
          name: item.Product ? item.Product.name : 'Deleted Product',
          selling_price: parseFloat(item.unit_price),
          tax_rate: item.Product ? parseFloat(item.Product.tax_rate) : 0,
          quantity: item.quantity,
          maxStock: item.Product ? item.Product.stock_quantity + item.quantity : item.quantity // Add back quantity to stock for validation since it's already deducted? Wait, held sales do NOT deduct stock! So maxStock is just product's current stock!
        }));

        // Set customer
        document.getElementById('pos-customer').value = sale.customer_id || '';
        // Set discount
        document.getElementById('pos-discount-input').value = sale.discount;
        
        // Track held ID
        this.currentHeldSaleId = sale.id;

        // Hide resume list modal
        bootstrap.Modal.getInstance(document.getElementById('modal-resume-sales')).hide();
        
        this.renderCart();
        window.QuickPOS.showAlert('info', `Resumed pending transaction HOLD-${sale.id}`);
      }
    } catch (e) {
      window.QuickPOS.showAlert('danger', `Resuming failed: ${e.message}`);
    }
  },

  async deleteHeldSale(saleId) {
    if (confirm('Are you sure you want to delete this pending sale?')) {
      try {
        const res = await API.deleteHeldSale(saleId);
        if (res.success) {
          window.QuickPOS.showAlert('success', 'Pending transaction deleted successfully');
          this.updateHeldSalesCount();
          // Reload list
          this.openResumeSalesModal();
        }
      } catch (e) {
        window.QuickPOS.showAlert('danger', `Deletion failed: ${e.message}`);
      }
    }
  },

  // ==================== CHECKOUT WORKFLOW ====================
  openCheckoutModal() {
    if (this.cart.length === 0) {
      window.QuickPOS.showAlert('warning', 'Please add items to cart before checkout');
      return;
    }

    // Hide checkout alert
    document.getElementById('checkout-alert').classList.add('d-none');

    // Calculate total
    let subtotal = 0;
    let tax = 0;
    this.cart.forEach(item => {
      const rowTotal = item.selling_price * item.quantity;
      subtotal += rowTotal;
      tax += rowTotal * (item.tax_rate / 100);
    });

    const discount = parseFloat(document.getElementById('pos-discount-input').value) || 0;
    const total = subtotal + tax - discount;

    const currency = window.QuickPOS.storeSettings.currency_symbol || '$';
    document.getElementById('checkout-amount-due').textContent = `${currency}${Math.max(0, total).toFixed(2)}`;
    
    // Reset payment fields
    document.getElementById('checkout-payment-method').value = 'Cash';
    document.getElementById('checkout-amount-paid').value = Math.max(0, total).toFixed(2);
    document.getElementById('checkout-card-paid').value = '';
    
    this.handlePaymentMethodChange();
    this.calculateChange();

    new bootstrap.Modal(document.getElementById('modal-checkout')).show();
  },

  handlePaymentMethodChange() {
    const method = document.getElementById('checkout-payment-method').value;
    const cashGroup = document.getElementById('group-amount-paid');
    const cardGroup = document.getElementById('group-card-paid');
    const changeGroup = document.getElementById('group-change-due');

    if (method === 'Cash') {
      cashGroup.classList.remove('d-none');
      cardGroup.classList.add('d-none');
      changeGroup.classList.remove('d-none');
    } else if (method === 'Mixed Payment') {
      cashGroup.classList.remove('d-none');
      cardGroup.classList.remove('d-none');
      changeGroup.classList.remove('d-none');
    } else {
      // Card / Bank Transfer does not require Cash input or Change Due in modal
      cashGroup.classList.add('d-none');
      cardGroup.classList.add('d-none');
      changeGroup.classList.add('d-none');
    }
  },

  calculateChange() {
    const method = document.getElementById('checkout-payment-method').value;
    
    // Get total from label
    const totalText = document.getElementById('checkout-amount-due').textContent;
    const total = parseFloat(totalText.replace(/[^\d.]/g, '')) || 0;

    let cashPaid = parseFloat(document.getElementById('checkout-amount-paid').value) || 0;
    let cardPaid = parseFloat(document.getElementById('checkout-card-paid').value) || 0;

    const changeDueEl = document.getElementById('checkout-change-due');
    const currency = window.QuickPOS.storeSettings.currency_symbol || '$';

    if (method === 'Cash') {
      const change = cashPaid - total;
      changeDueEl.textContent = `${currency}${Math.max(0, change).toFixed(2)}`;
      changeDueEl.className = change >= 0 ? 'fw-bold mb-0 text-success' : 'fw-bold mb-0 text-danger';
    } else if (method === 'Mixed Payment') {
      const change = (cashPaid + cardPaid) - total;
      changeDueEl.textContent = `${currency}${Math.max(0, change).toFixed(2)}`;
      changeDueEl.className = (cashPaid + cardPaid) >= total ? 'fw-bold mb-0 text-success' : 'fw-bold mb-0 text-danger';
    }
  },

  async handleCheckoutSubmit(e) {
    e.preventDefault();
    const alertEl = document.getElementById('checkout-alert');
    alertEl.classList.add('d-none');

    const method = document.getElementById('checkout-payment-method').value;
    
    // Get total
    const totalText = document.getElementById('checkout-amount-due').textContent;
    const total = parseFloat(totalText.replace(/[^\d.]/g, '')) || 0;

    let cashPaid = parseFloat(document.getElementById('checkout-amount-paid').value) || 0;
    let cardPaid = parseFloat(document.getElementById('checkout-card-paid').value) || 0;

    if (method === 'Cash' && cashPaid < total) {
      alertEl.textContent = 'Paid amount must be equal to or greater than the total amount due.';
      alertEl.classList.remove('d-none');
      return;
    }

    if (method === 'Mixed Payment' && (cashPaid + cardPaid) < total) {
      alertEl.textContent = 'Combined cash and card payment must cover the total amount due.';
      alertEl.classList.remove('d-none');
      return;
    }

    // Build items payload
    let tax = 0;
    const itemsData = this.cart.map(item => {
      const rowTotal = item.selling_price * item.quantity;
      const tAmt = rowTotal * (item.tax_rate / 100);
      tax += tAmt;
      return {
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.selling_price,
        tax_amount: tAmt
      };
    });

    const customer_id = document.getElementById('pos-customer').value;
    const discount = parseFloat(document.getElementById('pos-discount-input').value) || 0;

    const salePayload = {
      customer_id: customer_id || null,
      items: itemsData,
      discount,
      tax,
      payment_method: method,
      status: 'completed'
    };

    try {
      let res;
      if (this.currentHeldSaleId) {
        // Complete an existing held sale
        res = await API.completeHeldSale(this.currentHeldSaleId, salePayload);
      } else {
        // Create new sale
        res = await API.createSale(salePayload);
      }

      if (res.success) {
        // Close checkout modal
        bootstrap.Modal.getInstance(document.getElementById('modal-checkout')).hide();
        
        // Show success alert
        window.QuickPOS.showAlert('success', 'Sale completed successfully!');
        
        // Fetch full sale receipt data
        const saleRes = await API.getSale(res.data.id);
        if (saleRes.success) {
          this.previewReceipt(saleRes.data, cashPaid, cardPaid);
        }

        // Clear cart
        this.clearCart();
        
        // Refresh POS grid to update stocks
        this.loadPOSData();
      }
    } catch (err) {
      alertEl.textContent = `Checkout error: ${err.message}`;
      alertEl.classList.remove('d-none');
    }
  },

  // ==================== RECEIPT PRINTING PREVIEW ====================
  previewReceipt(sale, cashPaid, cardPaid) {
    const currency = window.QuickPOS.storeSettings.currency_symbol || '$';
    const storeName = window.QuickPOS.storeSettings.store_name || 'QuickPOS Store';
    const footerText = window.QuickPOS.storeSettings.receipt_footer || 'Thank you!';

    const cName = sale.Customer ? `${sale.Customer.first_name} ${sale.Customer.last_name}` : 'Walk-in Customer';
    const cashierName = sale.Cashier ? sale.Cashier.full_name : 'System Cashier';

    let itemsRowsHtml = '';
    sale.SaleItems.forEach(item => {
      const pName = item.Product ? item.Product.name : 'Product';
      const itemSub = item.quantity * item.unit_price;
      itemsRowsHtml += `
        <tr>
          <td colspan="3">${pName}</td>
        </tr>
        <tr>
          <td>&nbsp;&nbsp;${item.quantity} x ${currency}${parseFloat(item.unit_price).toFixed(2)}</td>
          <td></td>
          <td align="right">${currency}${itemSub.toFixed(2)}</td>
        </tr>
      `;
    });

    const paymentMethodText = sale.payment_method;
    let paidAmountDetails = '';
    let changeTextDetails = '';

    if (sale.payment_method === 'Cash') {
      paidAmountDetails = `<tr><td>Cash Tendered:</td><td colspan="2" align="right">${currency}${cashPaid.toFixed(2)}</td></tr>`;
      changeTextDetails = `<tr><td>Change Returned:</td><td colspan="2" align="right">${currency} ${Math.max(0, cashPaid - sale.total).toFixed(2)}</td></tr>`;
    } else if (sale.payment_method === 'Mixed Payment') {
      paidAmountDetails = `
        <tr><td>Cash Paid:</td><td colspan="2" align="right">${currency}${cashPaid.toFixed(2)}</td></tr>
        <tr><td>Card Paid:</td><td colspan="2" align="right">${currency}${cardPaid.toFixed(2)}</td></tr>
      `;
      changeTextDetails = `<tr><td>Change Returned:</td><td colspan="2" align="right">${currency} ${Math.max(0, (cashPaid + cardPaid) - sale.total).toFixed(2)}</td></tr>`;
    }

    const receiptHtml = `
      <div class="receipt-header">
        <h4 style="margin: 0; font-weight: bold;">${storeName}</h4>
        <div style="font-size: 11px; margin-top: 5px;">
          DATE: ${new Date(sale.sale_date).toLocaleString()}<br>
          INVOICE: TXN-${sale.id}<br>
          CASHIER: ${cashierName}<br>
          CUSTOMER: ${cName}
        </div>
      </div>
      <div class="receipt-divider"></div>
      <table class="receipt-table">
        <thead>
          <tr>
            <th align="left">Item Description</th>
            <th></th>
            <th align="right">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRowsHtml}
        </tbody>
      </table>
      <div class="receipt-divider"></div>
      <table style="width:100%; font-size:12px;">
        <tr>
          <td>Subtotal:</td>
          <td align="right">${currency}${parseFloat(sale.subtotal).toFixed(2)}</td>
        </tr>
        <tr>
          <td>Sales Tax:</td>
          <td align="right">${currency}${parseFloat(sale.tax).toFixed(2)}</td>
        </tr>
        <tr>
          <td>Discount Given:</td>
          <td align="right">-${currency}${parseFloat(sale.discount).toFixed(2)}</td>
        </tr>
        <tr style="font-weight: bold; font-size: 13px;">
          <td>Total Charge:</td>
          <td align="right">${currency}${parseFloat(sale.total).toFixed(2)}</td>
        </tr>
        <tr>
          <td>Payment Method:</td>
          <td align="right">${paymentMethodText}</td>
        </tr>
        ${paidAmountDetails}
        ${changeTextDetails}
      </table>
      <div class="receipt-divider"></div>
      <div class="receipt-footer" style="white-space: pre-wrap; font-size: 11px;">
        ${footerText}
      </div>
    `;

    // Populate Modal Preview
    document.getElementById('receipt-preview-content').innerHTML = receiptHtml;

    // Populate hidden print workspace
    document.getElementById('receipt-print-area').innerHTML = receiptHtml;

    // Launch Modal
    new bootstrap.Modal(document.getElementById('modal-receipt')).show();
  },

  // ==================== PURCHASES ORDER MODULE ====================
  purchaseItems: [], // temporary items inside purchase order modal

  async openPurchaseOrderModal() {
    this.purchaseItems = [];
    document.getElementById('form-purchase').reset();
    document.getElementById('purchase-items-table-body').innerHTML = '';
    document.getElementById('purchase-total-label').textContent = `${window.QuickPOS.storeSettings.currency_symbol || '$'}0.00`;

    try {
      // Populate Suppliers
      const supRes = await API.getSuppliers();
      const supSelect = document.getElementById('purchase-supplier');
      supSelect.innerHTML = '<option value="">Select Supplier</option>';
      if (supRes.success) {
        supRes.data.forEach(s => {
          supSelect.innerHTML += `<option value="${s.id}">${s.name}</option>`;
        });
      }

      // Populate Products
      const prodRes = await API.getProducts();
      const prodSelect = document.getElementById('purchase-item-select');
      prodSelect.innerHTML = '<option value="">Select Product to Add</option>';
      if (prodRes.success) {
        prodRes.data.forEach(p => {
          prodSelect.innerHTML += `<option value="${p.id}" data-cost="${p.cost_price}">${p.name} (SKU: ${p.sku || 'N/A'})</option>`;
        });
      }

      // Auto update cost price on select change
      prodSelect.onchange = () => {
        const opt = prodSelect.options[prodSelect.selectedIndex];
        const cost = opt.getAttribute('data-cost') || '0.00';
        document.getElementById('purchase-item-cost').value = cost;
      };

    } catch (e) {
      console.warn("Failed to load PO creation assets:", e);
    }
  },

  addPurchaseOrderItem() {
    const select = document.getElementById('purchase-item-select');
    const pId = select.value;
    const pName = select.options[select.selectedIndex].text;
    const qty = parseInt(document.getElementById('purchase-item-qty').value) || 0;
    const cost = parseFloat(document.getElementById('purchase-item-cost').value) || 0;

    if (!pId || qty <= 0 || cost < 0) {
      alert('Please select a valid product, quantity and cost price');
      return;
    }

    const existing = this.purchaseItems.find(x => x.product_id === pId);
    if (existing) {
      existing.quantity += qty;
    } else {
      this.purchaseItems.push({
        product_id: pId,
        name: pName,
        quantity: qty,
        cost_price: cost
      });
    }

    this.renderPurchaseOrderItems();
  },

  removePurchaseOrderItem(productId) {
    this.purchaseItems = this.purchaseItems.filter(x => x.product_id !== productId);
    this.renderPurchaseOrderItems();
  },

  renderPurchaseOrderItems() {
    const tbody = document.getElementById('purchase-items-table-body');
    tbody.innerHTML = '';
    let total = 0;
    const currency = window.QuickPOS.storeSettings.currency_symbol || '$';

    this.purchaseItems.forEach(item => {
      const sub = item.quantity * item.cost_price;
      total += sub;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${item.name}</td>
        <td>${item.quantity}</td>
        <td>${currency}${item.cost_price.toFixed(2)}</td>
        <td><strong>${currency}${sub.toFixed(2)}</strong></td>
        <td><a href="#" class="text-danger" onclick="QuickPOS_Sales.removePurchaseOrderItem('${item.product_id}')"><i class="fa-solid fa-trash"></i></a></td>
      `;
      tbody.appendChild(tr);
    });

    document.getElementById('purchase-total-label').textContent = `${currency}${total.toFixed(2)}`;
  },

  async submitPurchaseOrder(e) {
    e.preventDefault();
    const supId = document.getElementById('purchase-supplier').value;

    if (!supId) {
      alert('Please select a supplier');
      return;
    }

    if (this.purchaseItems.length === 0) {
      alert('Please add at least one item to purchase order');
      return;
    }

    const payload = {
      supplier_id: supId,
      items: this.purchaseItems.map(item => ({
        product_id: parseInt(item.product_id),
        quantity: item.quantity,
        cost_price: item.cost_price
      }))
    };

    try {
      const res = await API.createPurchase(payload);
      if (res.success) {
        window.QuickPOS.showAlert('success', 'Purchase order submitted successfully! Stock level updated.');
        bootstrap.Modal.getInstance(document.getElementById('modal-purchase')).hide();
        
        // Reload purchases view if active
        if (window.QuickPOS.activeView === 'purchases') {
          window.QuickPOS.loadPurchasesList();
        }
      }
    } catch (err) {
      alert(`PO Submission error: ${err.message}`);
    }
  }
};
