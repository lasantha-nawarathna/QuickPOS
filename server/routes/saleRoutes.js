const express = require('express');
const router = express.Router();
const { getSales, getSale, createSale, completeHeldSale, deleteHeldSale } = require('../controllers/saleController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getSales)
  .post(createSale);

router.route('/:id')
  .get(getSale)
  .put(completeHeldSale)
  .delete(deleteHeldSale);

module.exports = router;
