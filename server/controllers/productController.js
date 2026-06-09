const { Product, Category, sequelize } = require('../models');
const { Op } = require('sequelize');
const fs = require('fs');
const path = require('path');

// Get all products (with search & category filters)
exports.getProducts = async (req, res) => {
  const { search, category_id, low_stock } = req.query;
  const where = {};

  if (category_id) {
    where.category_id = category_id;
  }

  if (search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { barcode: { [Op.like]: `%${search}%` } },
      { sku: { [Op.like]: `%${search}%` } }
    ];
  }

  if (low_stock === 'true') {
    where.stock_quantity = { [Op.lte]: sequelize.col('reorder_level') };
  }

  try {
    const products = await Product.findAll({
      where,
      include: [{ model: Category, as: 'Category', attributes: ['name'] }],
      order: [['id', 'DESC']]
    });
    res.json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single product
exports.getProduct = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id, {
      include: [{ model: Category, as: 'Category', attributes: ['name'] }]
    });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create product
exports.createProduct = async (req, res) => {
  try {
    const data = { ...req.body };
    if (req.file) {
      data.image = `uploads/${req.file.filename}`;
    }

    const product = await Product.create(data);
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update product
exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const data = { ...req.body };
    if (req.file) {
      // Delete old image if it exists
      if (product.image) {
        const oldPath = path.join(__dirname, '../../client', product.image);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
      data.image = `uploads/${req.file.filename}`;
    }

    await product.update(data);
    res.json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete product
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Delete image file if it exists
    if (product.image) {
      const imgPath = path.join(__dirname, '../../client', product.image);
      if (fs.existsSync(imgPath)) {
        fs.unlinkSync(imgPath);
      }
    }

    await product.destroy();
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
