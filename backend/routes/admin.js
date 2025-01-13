const express = require('express');
const router = express.Router();
const { auth, checkRole } = require('../middleware/auth');
const upload = require('../config/multer');
const adminController = require('../controllers/adminController');

// Apply authentication and admin role check to all routes
router.use(auth, checkRole('admin'));

// Dashboard
router.get('/dashboard/stats', adminController.getDashboardStats);
router.get('/categories', adminController.getCategories);

// User Management
router.get('/users', adminController.getAllUsers);
router.patch('/users/:userId/toggle-status', adminController.toggleUserStatus);

// Product Management
router.get('/products', adminController.getAllProducts);
router.post('/products', upload.single('image'), adminController.createProduct);
router.put('/products/:productId', upload.single('image'), adminController.updateProduct);
router.delete('/products/:productId', adminController.deleteProduct);

// Order Management
router.get('/orders', adminController.getAllOrders);
// router.patch('/orders/:orderId/status', adminController.updateOrderStatus);

router.get('/orders/preview', adminController.getPreviewOrders);
router.post('/orders/:orderId/process', adminController.processPreviewOrder);


router.get('/marketing-activities', adminController.getAllMarketingActivities);
router.patch('/marketing-activities/:activityId/review', adminController.reviewMarketingActivity);

module.exports = router;