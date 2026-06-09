const express = require('express');
const router = express.Router();
const { getProducts, getProduct, createProduct, updateProduct, deleteProduct } = require('../controllers/productController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.route('/')
  .get(protect, getProducts)
  .post(protect, authorize('Administrator', 'Manager'), upload.single('image'), createProduct);

router.route('/:id')
  .get(protect, getProduct)
  .put(protect, authorize('Administrator', 'Manager'), upload.single('image'), updateProduct)
  .delete(protect, authorize('Administrator', 'Manager'), deleteProduct);

module.exports = router;
