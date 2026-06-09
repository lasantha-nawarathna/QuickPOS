const { Sale, SaleItem, Product, Category, User, Customer, InventoryTransaction, sequelize } = require('../models');
const { Op } = require('sequelize');
const PDFDocument = require('pdfkit');
const XLSX = require('xlsx');

// @desc    Get dashboard metrics and charts data
// @route   GET /api/reports/dashboard
// @access  Private
exports.getDashboardData = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // 1. Daily sales summary
    const dailySales = await Sale.sum('total', {
      where: {
        status: 'completed',
        sale_date: { [Op.gte]: today }
      }
    }) || 0;

    // 2. Monthly sales summary
    const monthlySales = await Sale.sum('total', {
      where: {
        status: 'completed',
        sale_date: { [Op.gte]: firstDayOfMonth }
      }
    }) || 0;

    // 3. Total products count
    const totalProducts = await Product.count();

    // 4. Low stock count
    const lowStockCount = await Product.count({
      where: {
        stock_quantity: { [Op.lte]: sequelize.col('reorder_level') }
      }
    });

    // 5. Low stock alerts (detailed items)
    const lowStockAlerts = await Product.findAll({
      where: {
        stock_quantity: { [Op.lte]: sequelize.col('reorder_level') }
      },
      attributes: ['id', 'name', 'sku', 'stock_quantity', 'reorder_level'],
      limit: 10
    });

    // 6. Top-selling products
    const topProducts = await SaleItem.findAll({
      attributes: [
        'product_id',
        [sequelize.fn('SUM', sequelize.col('quantity')), 'total_quantity'],
        [sequelize.fn('SUM', sequelize.literal('quantity * unit_price')), 'total_sales']
      ],
      include: [
        {
          model: Product,
          as: 'Product',
          attributes: ['name', 'sku'],
          where: { id: sequelize.col('SaleItem.product_id') }
        },
        {
          model: Sale,
          where: { status: 'completed' },
          attributes: []
        }
      ],
      group: ['product_id'],
      order: [[sequelize.literal('total_quantity'), 'DESC']],
      limit: 5
    });

    // 7. Recent transactions
    const recentSales = await Sale.findAll({
      where: { status: 'completed' },
      include: [
        { model: Customer, as: 'Customer', attributes: ['first_name', 'last_name'] },
        { model: User, as: 'Cashier', attributes: ['full_name'] }
      ],
      order: [['sale_date', 'DESC']],
      limit: 5
    });

    // 8. Monthly sales chart data (last 6 months)
    const chartData = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthEnd = new Date(today.getFullYear(), today.getMonth() - i + 1, 0, 23, 59, 59, 999);
      
      const salesSum = await Sale.sum('total', {
        where: {
          status: 'completed',
          sale_date: { [Op.between]: [monthStart, monthEnd] }
        }
      }) || 0;

      chartData.push({
        month: monthStart.toLocaleString('default', { month: 'short', year: '2-digit' }),
        sales: salesSum
      });
    }

    res.json({
      success: true,
      data: {
        dailySales,
        monthlySales,
        totalProducts,
        lowStockCount,
        lowStockAlerts,
        topProducts,
        recentSales,
        chartData
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Generate specific report records based on filters
// @route   GET /api/reports/query
// @access  Private
exports.getReportData = async (req, res) => {
  const { type, startDate, endDate } = req.query;
  try {
    const filter = {};
    if (startDate && endDate) {
      filter.sale_date = { [Op.between]: [new Date(startDate), new Date(endDate + 'T23:59:59')] };
    }

    let records = [];

    switch (type) {
      case 'sales': // Detailed Sales
        records = await Sale.findAll({
          where: { status: 'completed', ...filter },
          include: [
            { model: Customer, as: 'Customer', attributes: ['first_name', 'last_name'] },
            { model: User, as: 'Cashier', attributes: ['full_name'] }
          ],
          order: [['sale_date', 'DESC']]
        });
        break;

      case 'products': // Product Sales performance
        records = await SaleItem.findAll({
          attributes: [
            'product_id',
            [sequelize.fn('SUM', sequelize.col('quantity')), 'quantity_sold'],
            [sequelize.fn('SUM', sequelize.literal('quantity * unit_price')), 'total_sales'],
            [sequelize.fn('AVG', sequelize.col('unit_price')), 'avg_price']
          ],
          include: [
            { model: Product, as: 'Product', attributes: ['name', 'sku', 'cost_price'] },
            {
              model: Sale,
              where: { status: 'completed', ...(startDate && endDate ? { sale_date: filter.sale_date } : {}) },
              attributes: []
            }
          ],
          group: ['product_id'],
          order: [[sequelize.literal('total_sales'), 'DESC']]
        });
        break;

      case 'categories': // Category Sales
        records = await SaleItem.findAll({
          attributes: [
            [sequelize.col('Product.category_id'), 'category_id'],
            [sequelize.fn('SUM', sequelize.col('quantity')), 'quantity_sold'],
            [sequelize.fn('SUM', sequelize.literal('quantity * unit_price')), 'total_sales']
          ],
          include: [
            { 
              model: Product, 
              as: 'Product', 
              attributes: ['category_id'],
              include: [{ model: Category, as: 'Category', attributes: ['name'] }]
            },
            {
              model: Sale,
              where: { status: 'completed', ...(startDate && endDate ? { sale_date: filter.sale_date } : {}) },
              attributes: []
            }
          ],
          group: [sequelize.col('Product.category_id')],
          order: [[sequelize.literal('total_sales'), 'DESC']]
        });
        break;

      case 'cashier': // Cashier Performance
        records = await Sale.findAll({
          where: { status: 'completed', ...filter },
          attributes: [
            'cashier_id',
            [sequelize.fn('COUNT', sequelize.col('id')), 'transaction_count'],
            [sequelize.fn('SUM', sequelize.col('total')), 'total_sales']
          ],
          include: [{ model: User, as: 'Cashier', attributes: ['full_name', 'username'] }],
          group: ['cashier_id'],
          order: [[sequelize.literal('total_sales'), 'DESC']]
        });
        break;

      case 'valuation': // Inventory valuation
        records = await Product.findAll({
          attributes: [
            'id', 'name', 'sku', 'stock_quantity', 'cost_price', 'selling_price',
            [sequelize.literal('stock_quantity * cost_price'), 'stock_cost_value'],
            [sequelize.literal('stock_quantity * selling_price'), 'stock_selling_value']
          ],
          include: [{ model: Category, as: 'Category', attributes: ['name'] }],
          order: [['stock_quantity', 'DESC']]
        });
        break;

      case 'profit_loss': // Profit & Loss statement
        // Sales total
        const completedSales = await Sale.findAll({
          where: { status: 'completed', ...filter },
          include: [{ model: SaleItem }]
        });

        let totalRevenue = 0;
        let totalCost = 0;
        let totalTax = 0;
        let totalDiscount = 0;

        for (const sale of completedSales) {
          totalRevenue += parseFloat(sale.subtotal);
          totalTax += parseFloat(sale.tax);
          totalDiscount += parseFloat(sale.discount);

          for (const item of sale.SaleItems) {
            const prod = await Product.findByPk(item.product_id);
            if (prod) {
              totalCost += parseFloat(prod.cost_price) * item.quantity;
            }
          }
        }

        const netSales = totalRevenue - totalDiscount;
        const grossProfit = netSales - totalCost;
        const netProfit = grossProfit; // Simple version, could deduct other expenses

        records = [{
          total_revenue: totalRevenue.toFixed(2),
          total_discount: totalDiscount.toFixed(2),
          net_sales: netSales.toFixed(2),
          total_cost: totalCost.toFixed(2),
          total_tax: totalTax.toFixed(2),
          gross_profit: grossProfit.toFixed(2),
          net_profit: netProfit.toFixed(2)
        }];
        break;

      default:
        return res.status(400).json({ success: false, message: 'Invalid report type' });
    }

    res.json({ success: true, data: records });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Export report data as PDF
// @route   GET /api/reports/export/pdf
// @access  Private
exports.exportPDF = async (req, res) => {
  const { type, startDate, endDate } = req.query;

  try {
    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=report_${type}.pdf`);
    doc.pipe(res);

    // Header layout
    doc.fillColor('#1b3a4b').fontSize(22).text('POS System Report', { align: 'center' });
    doc.fontSize(14).fillColor('#495057').text(`Report Type: ${type.toUpperCase()}`, { align: 'center' });
    if (startDate && endDate) {
      doc.fontSize(10).text(`Period: ${startDate} to ${endDate}`, { align: 'center' });
    }
    doc.moveDown(2);

    // Fetch reports database records
    req.query.type = type;
    // We will bypass standard HTTP and call the utility logic directly, but let's mock/query database details here
    const filter = {};
    if (startDate && endDate) {
      filter.sale_date = { [Op.between]: [new Date(startDate), new Date(endDate + 'T23:59:59')] };
    }

    if (type === 'sales') {
      const sales = await Sale.findAll({
        where: { status: 'completed', ...filter },
        include: [
          { model: Customer, as: 'Customer', attributes: ['first_name', 'last_name'] },
          { model: User, as: 'Cashier', attributes: ['full_name'] }
        ],
        order: [['sale_date', 'DESC']]
      });

      doc.fontSize(12).fillColor('#1b3a4b');
      doc.text('TXN ID      Date           Customer       Cashier      Total', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#495057');

      sales.forEach(s => {
        const cName = s.Customer ? `${s.Customer.first_name} ${s.Customer.last_name}` : 'Walk-in';
        const cashier = s.Cashier ? s.Cashier.full_name : 'N/A';
        const sDate = new Date(s.sale_date).toLocaleDateString();
        doc.text(`${String(s.id).padEnd(12)}${sDate.padEnd(15)}${cName.slice(0, 14).padEnd(15)}${cashier.slice(0, 12).padEnd(13)}$${parseFloat(s.total).toFixed(2)}`);
      });
    } else if (type === 'valuation') {
      const products = await Product.findAll({
        attributes: [
          'name', 'sku', 'stock_quantity', 'cost_price', 'selling_price',
          [sequelize.literal('stock_quantity * cost_price'), 'cost_val']
        ]
      });

      doc.fontSize(12).fillColor('#1b3a4b');
      doc.text('Product Name               SKU           Stock      Cost Price    Total Cost Val', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#495057');

      products.forEach(p => {
        doc.text(`${p.name.slice(0, 25).padEnd(27)}${String(p.sku || '').padEnd(14)}${String(p.stock_quantity).padEnd(11)}$${parseFloat(p.cost_price).toFixed(2).padEnd(14)}$${parseFloat(p.getDataValue('cost_val') || 0).toFixed(2)}`);
      });
    } else {
      doc.fontSize(14).text(`Report data for ${type} generated. Please view the dashboard or Excel download for full breakdown.`, { align: 'left' });
    }

    doc.end();
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Export report data as Excel sheet
// @route   GET /api/reports/export/excel
// @access  Private
exports.exportExcel = async (req, res) => {
  const { type, startDate, endDate } = req.query;
  try {
    const filter = {};
    if (startDate && endDate) {
      filter.sale_date = { [Op.between]: [new Date(startDate), new Date(endDate + 'T23:59:59')] };
    }

    let records = [];
    if (type === 'sales') {
      const sales = await Sale.findAll({
        where: { status: 'completed', ...filter },
        include: [
          { model: Customer, as: 'Customer', attributes: ['first_name', 'last_name'] },
          { model: User, as: 'Cashier', attributes: ['full_name'] }
        ]
      });

      records = sales.map(s => ({
        'Transaction ID': s.id,
        'Sale Date': s.sale_date,
        'Customer': s.Customer ? `${s.Customer.first_name} ${s.Customer.last_name}` : 'Walk-in',
        'Cashier': s.Cashier ? s.Cashier.full_name : 'N/A',
        'Subtotal': parseFloat(s.subtotal),
        'Discount': parseFloat(s.discount),
        'Tax': parseFloat(s.tax),
        'Total': parseFloat(s.total),
        'Payment Method': s.payment_method
      }));
    } else if (type === 'valuation') {
      const products = await Product.findAll({
        include: [{ model: Category, as: 'Category', attributes: ['name'] }]
      });

      records = products.map(p => ({
        'Product ID': p.id,
        'Product Name': p.name,
        'SKU': p.sku,
        'Category': p.Category ? p.Category.name : 'N/A',
        'Cost Price': parseFloat(p.cost_price),
        'Selling Price': parseFloat(p.selling_price),
        'Stock Quantity': p.stock_quantity,
        'Cost Value': p.stock_quantity * parseFloat(p.cost_price),
        'Retail Value': p.stock_quantity * parseFloat(p.selling_price)
      }));
    } else {
      // General fall-back
      records = [{ Info: `Data export for ${type} report` }];
    }

    // Create Excel Workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(records);
    XLSX.utils.book_append_sheet(wb, ws, 'Report Data');
    
    // Generate Buffer
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', `attachment; filename=report_${type}.xlsx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
