const express = require('express');
const router = express.Router();
const { getDashboardData, getReportData, exportPDF, exportExcel } = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/auth');

router.get('/dashboard', protect, getDashboardData);

// Data-heavy reports are locked to Manager and Administrator
router.get('/query', protect, authorize('Administrator', 'Manager'), getReportData);
router.get('/export/pdf', protect, authorize('Administrator', 'Manager'), exportPDF);
router.get('/export/excel', protect, authorize('Administrator', 'Manager'), exportExcel);

module.exports = router;
