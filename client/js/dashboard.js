window.QuickPOS_Dashboard = {
  chartInstance: null,

  init() {
    // Initializer
  },

  async loadDashboard() {
    try {
      const res = await API.getDashboardData();
      if (res.success) {
        const data = res.data;
        const currency = window.QuickPOS.storeSettings.currency_symbol || '$';

        // 1. Populate Metric Cards
        document.getElementById('dash-daily-sales').textContent = `${currency}${parseFloat(data.dailySales).toFixed(2)}`;
        document.getElementById('dash-monthly-sales').textContent = `${currency}${parseFloat(data.monthlySales).toFixed(2)}`;
        document.getElementById('dash-total-products').textContent = data.totalProducts;
        
        const lowStockCount = data.lowStockCount;
        document.getElementById('dash-low-stock').textContent = lowStockCount;

        // 2. Populate Low Stock details list
        const lowStockTbody = document.getElementById('dash-low-stock-details');
        lowStockTbody.innerHTML = '';
        if (data.lowStockAlerts.length === 0) {
          lowStockTbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-3">No low stock products found</td></tr>';
        } else {
          data.lowStockAlerts.forEach(p => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
              <td><strong>${p.name}</strong></td>
              <td><code>${p.sku || 'N/A'}</code></td>
              <td><span class="text-danger fw-bold">${p.stock_quantity}</span></td>
              <td><span class="badge bg-secondary-subtle text-dark">${p.reorder_level}</span></td>
            `;
            lowStockTbody.appendChild(tr);
          });
        }

        // 3. Populate Recent Completed Transactions list
        const recentTbody = document.getElementById('dash-recent-sales');
        recentTbody.innerHTML = '';
        if (data.recentSales.length === 0) {
          recentTbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-3">No recent sales processed</td></tr>';
        } else {
          data.recentSales.forEach(sale => {
            const dateStr = new Date(sale.sale_date).toLocaleDateString(undefined, {month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'});
            const cashierName = sale.Cashier ? sale.Cashier.full_name : 'System';
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
              <td><code>TXN-${sale.id}</code></td>
              <td>${dateStr}</td>
              <td><strong>${currency}${parseFloat(sale.total).toFixed(2)}</strong></td>
              <td><span class="badge bg-light text-dark text-truncate" style="max-width:80px;">${cashierName}</span></td>
            `;
            recentTbody.appendChild(tr);
          });
        }

        // 4. Populate Top Selling Products list
        const topProductsContainer = document.getElementById('dash-top-products');
        topProductsContainer.innerHTML = '';
        if (data.topProducts.length === 0) {
          topProductsContainer.innerHTML = '<div class="text-center text-muted py-3">No sales records found</div>';
        } else {
          data.topProducts.forEach(item => {
            const name = item.Product ? item.Product.name : 'Deleted Product';
            const qty = item.total_quantity;
            const revenue = parseFloat(item.total_sales).toFixed(2);
            
            const div = document.createElement('div');
            div.className = 'list-group-item d-flex justify-content-between align-items-center bg-transparent border-0 px-0 py-2 border-bottom border-light-subtle';
            div.innerHTML = `
              <div class="text-truncate" style="max-width: 180px;">
                <strong class="small d-block text-truncate">${name}</strong>
                <span class="text-muted small" style="font-size:0.75rem;">${qty} items sold</span>
              </div>
              <span class="badge bg-success-subtle text-success">${currency}${revenue}</span>
            `;
            topProductsContainer.appendChild(div);
          });
        }

        // 5. Draw Sales Trends Chart
        this.drawChart(data.chartData);
      }
    } catch (e) {
      console.warn("Failed to update dashboard fields:", e);
    }
  },

  drawChart(history) {
    const ctx = document.getElementById('dashboard-chart').getContext('2d');
    
    // Destroy existing chart to avoid overlay bugs
    if (this.chartInstance) {
      this.chartInstance.destroy();
    }

    const labels = history.map(h => h.month);
    const salesData = history.map(h => parseFloat(h.sales));

    // Create a beautiful linear gradient for chart filling
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(13, 110, 253, 0.4)');
    gradient.addColorStop(1, 'rgba(13, 110, 253, 0.0)');

    this.chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Total Revenue',
          data: salesData,
          borderColor: '#0d6efd',
          borderWidth: 3,
          backgroundColor: gradient,
          fill: true,
          tension: 0.3,
          pointBackgroundColor: '#0d6efd',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: 'rgba(30, 41, 59, 0.9)',
            titleFont: { family: 'Outfit', size: 13 },
            bodyFont: { family: 'Outfit', size: 12 },
            padding: 10,
            displayColors: false,
            callbacks: {
              label: (context) => {
                const currency = window.QuickPOS.storeSettings.currency_symbol || '$';
                return `Revenue: ${currency}${context.raw.toFixed(2)}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            },
            ticks: {
              font: { family: 'Outfit', size: 11 }
            }
          },
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            },
            ticks: {
              font: { family: 'Outfit', size: 11 },
              callback: (value) => {
                const currency = window.QuickPOS.storeSettings.currency_symbol || '$';
                return currency + value;
              }
            }
          }
        }
      }
    });
  }
};
