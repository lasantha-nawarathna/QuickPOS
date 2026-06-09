const { Purchase, PurchaseItem, Product, InventoryTransaction, Supplier, sequelize } = require('../models');

// Get all purchases
exports.getPurchases = async (req, res) => {
  try {
    const purchases = await Purchase.findAll({
      include: [
        { model: Supplier, as: 'Supplier', attributes: ['name'] }
      ],
      order: [['id', 'DESC']]
    });
    res.json({ success: true, data: purchases });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single purchase details
exports.getPurchase = async (req, res) => {
  try {
    const purchase = await Purchase.findByPk(req.params.id, {
      include: [
        { model: Supplier, as: 'Supplier' },
        { 
          model: PurchaseItem, 
          include: [{ model: Product, as: 'Product', attributes: ['name', 'sku'] }]
        }
      ]
    });
    if (!purchase) {
      return res.status(404).json({ success: false, message: 'Purchase order not found' });
    }
    res.json({ success: true, data: purchase });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create a new purchase order (adjust stock and add transactions)
exports.createPurchase = async (req, res) => {
  const { supplier_id, items } = req.body; // items: [{ product_id, quantity, cost_price }]

  if (!items || items.length === 0) {
    return res.status(400).json({ success: false, message: 'Please add items to purchase order' });
  }

  const t = await sequelize.transaction();

  try {
    // Calculate total amount
    let total_amount = 0;
    for (const item of items) {
      total_amount += item.quantity * item.cost_price;
    }

    // Create Purchase
    const purchase = await Purchase.create({
      supplier_id,
      total_amount
    }, { transaction: t });

    // Loop items to create purchase items & update stock
    for (const item of items) {
      await PurchaseItem.create({
        purchase_id: purchase.id,
        product_id: item.product_id,
        quantity: item.quantity,
        cost_price: item.cost_price
      }, { transaction: t });

      // Update product stock and cost price
      const product = await Product.findByPk(item.product_id, { transaction: t });
      if (!product) {
        throw new Error(`Product with ID ${item.product_id} not found`);
      }

      await product.update({
        stock_quantity: product.stock_quantity + parseInt(item.quantity),
        cost_price: item.cost_price // Update cost price to latest
      }, { transaction: t });

      // Log inventory transaction
      await InventoryTransaction.create({
        product_id: item.product_id,
        transaction_type: 'purchase',
        quantity: parseInt(item.quantity),
        reference_id: purchase.id
      }, { transaction: t });
    }

    await t.commit();
    res.status(201).json({ success: true, data: purchase });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ success: false, message: error.message });
  }
};
