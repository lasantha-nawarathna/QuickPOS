const { Return, Sale, SaleItem, Product, InventoryTransaction, Customer, sequelize } = require('../models');

// Get return history
exports.getReturns = async (req, res) => {
  try {
    const returns = await Return.findAll({
      include: [
        { 
          model: Sale, 
          as: 'Sale',
          include: [{ model: Customer, as: 'Customer', attributes: ['first_name', 'last_name'] }]
        }
      ],
      order: [['id', 'DESC']]
    });
    res.json({ success: true, data: returns });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Process sale return / refund
exports.processReturn = async (req, res) => {
  const { sale_id } = req.body;

  const t = await sequelize.transaction();

  try {
    const sale = await Sale.findByPk(sale_id, {
      include: [{ model: SaleItem }],
      transaction: t
    });

    if (!sale) {
      throw new Error('Sale transaction not found');
    }

    if (sale.status === 'returned') {
      throw new Error('This transaction has already been refunded/returned');
    }

    if (sale.status === 'held') {
      throw new Error('Cannot return an incomplete/held sale');
    }

    // Mark sale status as returned
    await sale.update({ status: 'returned' }, { transaction: t });

    // Create Return log
    const returnRecord = await Return.create({
      sale_id: sale.id,
      refund_amount: sale.total
    }, { transaction: t });

    // Restore stock & log inventory transactions
    for (const item of sale.SaleItems) {
      const product = await Product.findByPk(item.product_id, { transaction: t });
      if (product) {
        await product.update({
          stock_quantity: product.stock_quantity + parseInt(item.quantity)
        }, { transaction: t });

        await InventoryTransaction.create({
          product_id: item.product_id,
          transaction_type: 'return',
          quantity: parseInt(item.quantity),
          reference_id: returnRecord.id
        }, { transaction: t });
      }
    }

    // Deduct loyalty points
    if (sale.customer_id) {
      const customer = await Customer.findByPk(sale.customer_id, { transaction: t });
      if (customer) {
        const pointsDeducted = Math.floor(sale.total / 10);
        if (pointsDeducted > 0) {
          const newPoints = Math.max(0, customer.loyalty_points - pointsDeducted);
          await customer.update({ loyalty_points: newPoints }, { transaction: t });
        }
      }
    }

    await t.commit();
    res.status(201).json({ success: true, data: returnRecord });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ success: false, message: error.message });
  }
};
