const express = require('express');
const router = express.Router();
const { getPurchases, getPurchase, createPurchase } = require('../controllers/purchaseController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('Administrator', 'Manager'));

router.route('/')
  .get(getPurchases)
  .post(createPurchase);

router.route('/:id')
  .get(getPurchase);

module.exports = router;
