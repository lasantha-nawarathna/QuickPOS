const express = require('express');
const router = express.Router();
const { getCategories, createCategory, updateCategory, deleteCategory } = require('../controllers/categoryController');
const { protect, authorize } = require('../middleware/auth');

router.route('/')
  .get(protect, getCategories)
  .post(protect, authorize('Administrator', 'Manager'), createCategory);

router.route('/:id')
  .put(protect, authorize('Administrator', 'Manager'), updateCategory)
  .delete(protect, authorize('Administrator', 'Manager'), deleteCategory);

module.exports = router;
