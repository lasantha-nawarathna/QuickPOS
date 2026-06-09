const { Sale, SaleItem, Product, InventoryTransaction, Customer, User, sequelize } = require('../models');

// Get all sales
exports.getSales = async (req, res) => {
  const { status, customer_id } = req.query;
  const where = {};
  if (status) where.status = status;
  if (customer_id) where.customer_id = customer_id;

  try {
    const sales = await Sale.findAll({
      where,
      include: [
        { model: Customer, as: 'Customer', attributes: ['first_name', 'last_name', 'phone'] },
        { model: User, as: 'Cashier', attributes: ['full_name'] }
      ],
      order: [['id', 'DESC']]
    });
    res.json({ success: true, data: sales });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single sale details (for receipt/invoice)
exports.getSale = async (req, res) => {
  try {
    const sale = await Sale.findByPk(req.params.id, {
      include: [
        { model: Customer, as: 'Customer' },
        { model: User, as: 'Cashier', attributes: ['full_name'] },
        { 
          model: SaleItem, 
          include: [{ model: Product, as: 'Product', attributes: ['name', 'barcode', 'sku'] }]
        }
      ]
    });
    if (!sale) {
      return res.status(404).json({ success: false, message: 'Sale transaction not found' });
    }
    res.json({ success: true, data: sale });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create a new sale (can be completed or held)
exports.createSale = async (req, res) => {
  const { customer_id, items, discount, tax, payment_method, status } = req.body;
  // items: [{ product_id, quantity, unit_price, tax_amount }]
  // status: 'completed' or 'held'

  if (!items || items.length === 0) {
    return res.status(400).json({ success: false, message: 'Cart is empty' });
  }

  const t = await sequelize.transaction();

  try {
    // Calculate totals
    let subtotal = 0;
    let computedTax = 0;
    for (const item of items) {
      subtotal += item.quantity * item.unit_price;
      computedTax += parseFloat(item.tax_amount || 0);
    }

    const discountAmount = parseFloat(discount || 0);
    const taxAmount = parseFloat(tax !== undefined ? tax : computedTax);
    const total = subtotal + taxAmount - discountAmount;

    // Create Sale
    const sale = await Sale.create({
      customer_id: customer_id || null,
      cashier_id: req.user.id,
      subtotal,
      discount: discountAmount,
      tax: taxAmount,
      total,
      payment_method,
      status: status || 'completed'
    }, { transaction: t });

    // Loop items to create sale items & update stock (only if completed)
    for (const item of items) {
      await SaleItem.create({
        sale_id: sale.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        tax_amount: item.tax_amount || 0
      }, { transaction: t });

      if (status !== 'held') {
        const product = await Product.findByPk(item.product_id, { transaction: t });
        if (!product) {
          throw new Error(`Product with ID ${item.product_id} not found`);
        }

        if (product.stock_quantity < item.quantity) {
          throw new Error(`Insufficient stock for product: ${product.name}. Current stock: ${product.stock_quantity}`);
        }

        // Deduct stock
        await product.update({
          stock_quantity: product.stock_quantity - parseInt(item.quantity)
        }, { transaction: t });

        // Log transaction
        await InventoryTransaction.create({
          product_id: item.product_id,
          transaction_type: 'sale',
          quantity: -parseInt(item.quantity),
          reference_id: sale.id
        }, { transaction: t });
      }
    }

    // Award loyalty points (if completed and customer present)
    if (status !== 'held' && customer_id) {
      const customer = await Customer.findByPk(customer_id, { transaction: t });
      if (customer) {
        // e.g. 1 point for every 10 units spent
        const pointsAwarded = Math.floor(total / 10);
        if (pointsAwarded > 0) {
          await customer.update({
            loyalty_points: customer.loyalty_points + pointsAwarded
          }, { transaction: t });
        }
      }
    }

    await t.commit();
    res.status(201).json({ success: true, data: sale });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ success: false, message: error.message });
  }
};

// Complete a held sale
exports.completeHeldSale = async (req, res) => {
  const { payment_method, discount, tax, customer_id } = req.body;
  const t = await sequelize.transaction();

  try {
    const sale = await Sale.findByPk(req.params.id, {
      include: [{ model: SaleItem }],
      transaction: t
    });

    if (!sale) {
      throw new Error('Sale not found');
    }

    if (sale.status !== 'held') {
      throw new Error('This transaction is already completed or returned');
    }

    // Update details if supplied
    if (payment_method) sale.payment_method = payment_method;
    if (customer_id) sale.customer_id = customer_id;
    if (discount !== undefined) sale.discount = parseFloat(discount);
    if (tax !== undefined) sale.tax = parseFloat(tax);
    
    // Recalculate total
    sale.total = parseFloat(sale.subtotal) + parseFloat(sale.tax) - parseFloat(sale.discount);
    sale.status = 'completed';
    sale.sale_date = new Date(); // Update date to checkout date
    sale.cashier_id = req.user.id; // Record cashier who completed it

    await sale.save({ transaction: t });

    // Loop items to update stock & log transactions
    for (const item of sale.SaleItems) {
      const product = await Product.findByPk(item.product_id, { transaction: t });
      if (!product) {
        throw new Error(`Product with ID ${item.product_id} not found`);
      }

      if (product.stock_quantity < item.quantity) {
        throw new Error(`Insufficient stock for product: ${product.name}. Current stock: ${product.stock_quantity}`);
      }

      // Deduct stock
      await product.update({
        stock_quantity: product.stock_quantity - parseInt(item.quantity)
      }, { transaction: t });

      // Log transaction
      await InventoryTransaction.create({
        product_id: item.product_id,
        transaction_type: 'sale',
        quantity: -parseInt(item.quantity),
        reference_id: sale.id
      }, { transaction: t });
    }

    // Award loyalty points
    if (sale.customer_id) {
      const customer = await Customer.findByPk(sale.customer_id, { transaction: t });
      if (customer) {
        const pointsAwarded = Math.floor(sale.total / 10);
        if (pointsAwarded > 0) {
          await customer.update({
            loyalty_points: customer.loyalty_points + pointsAwarded
          }, { transaction: t });
        }
      }
    }

    await t.commit();
    res.json({ success: true, data: sale });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete held sale (cancel transaction)
exports.deleteHeldSale = async (req, res) => {
  try {
    const sale = await Sale.findByPk(req.params.id);
    if (!sale) {
      return res.status(404).json({ success: false, message: 'Sale not found' });
    }
    if (sale.status !== 'held') {
      return res.status(400).json({ success: false, message: 'Can only delete held/pending sales' });
    }
    await sale.destroy();
    res.json({ success: true, message: 'Pending sale deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
