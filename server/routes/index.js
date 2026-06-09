const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const productRoutes = require('./productRoutes');
const categoryRoutes = require('./categoryRoutes');
const customerRoutes = require('./customerRoutes');
const supplierRoutes = require('./supplierRoutes');
const purchaseRoutes = require('./purchaseRoutes');
const saleRoutes = require('./saleRoutes');
const returnRoutes = require('./returnRoutes');
const reportRoutes = require('./reportRoutes');
const settingRoutes = require('./settingRoutes');

router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/categories', categoryRoutes);
router.use('/customers', customerRoutes);
router.use('/suppliers', supplierRoutes);
router.use('/purchases', purchaseRoutes);
router.use('/sales', saleRoutes);
router.use('/returns', returnRoutes);
router.use('/reports', reportRoutes);
router.use('/settings', settingRoutes);

module.exports = router;
