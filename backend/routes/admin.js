const express = require('express');
const router = express.Router();
const { auth, checkRole } = require('../middleware/auth');
const upload = require('../config/multer');
const adminController = require('../controllers/adminController');

// Apply authentication and admin role check to all routes
router.use(auth, checkRole('admin'));

// Dashboard
router.get('/dashboard/stats', adminController.getDashboardStats);

// User Management
router.get('/users', adminController.getAllUsers);
router.patch('/users/:userId/toggle-status', adminController.toggleUserStatus);

// Product Management
router.post('/products', upload.single('image'), adminController.createProduct);
router.put('/products/:productId', upload.single('image'), adminController.updateProduct);

// Order Management
router.get('/orders', adminController.getAllOrders);
router.patch('/orders/:orderId/status', adminController.updateOrderStatus);

module.exports = router;