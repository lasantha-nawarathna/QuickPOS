const express = require('express');
const router = express.Router();
const { login, getMe, getUsers, createUser, updateUser, deleteUser } = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');

router.post('/login', login);
router.get('/me', protect, getMe);

// Admin-only User CRUD
router.get('/users', protect, authorize('Administrator'), getUsers);
router.post('/users', protect, authorize('Administrator'), createUser);
router.put('/users/:id', protect, authorize('Administrator'), updateUser);
router.delete('/users/:id', protect, authorize('Administrator'), deleteUser);

module.exports = router;
