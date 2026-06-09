const express = require('express');
const router = express.Router();
const { getReturns, processReturn } = require('../controllers/returnController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getReturns)
  .post(processReturn);

module.exports = router;
