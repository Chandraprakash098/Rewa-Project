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
// router.patch('/users/:userId/toggle-status', adminController.toggleUserStatus);
router.patch('/users/:userCode/toggle-status', adminController.toggleUserStatus);
router.get('/users/:userId/activity', adminController.getUserActivityHistory);
router.get('/staff', adminController.getAllStaff);
router.delete('/staff/:staffId', adminController.deleteStaff);

// Product Management
router.get('/products', adminController.getAllProducts);
router.post('/products', upload.single('image'), adminController.createProduct);
router.put('/products/:productId', upload.single('image'), adminController.updateProduct);
router.delete('/products/:productId', adminController.deleteProduct);

// Order Management
router.get('/orders', adminController.getAllOrders);
router.get('/download-order-history', adminController.downloadOrderHistory);
// router.patch('/orders/:orderId/status', adminController.updateOrderStatus);

router.get('/orders/preview', adminController.getPreviewOrders);
router.post('/orders/:orderId/process', adminController.processPreviewOrder);


router.get('/marketing-activities', adminController.getAllMarketingActivities);
router.patch('/marketing-activities/:activityId/review', adminController.reviewMarketingActivity);
router.get('/download-marketing-activities', adminController.downloadAllMarketingActivities);


router.get('/attendance', adminController.getAllAttendance);
router.get('/attendance-summary', adminController.getAttendanceSummary);
router.get('/check-in-images', adminController.getCheckInImages);

router.get('/profile', adminController.getAdminProfile);

//new Routes to show stock history

router.get('/stock/full-history', adminController.getFullStockHistory);
router.get('/stock/full-history/download', adminController.downloadFullStockHistory);


router.post('/banners', upload.single('image'), adminController.uploadBanner);
router.put('/banners/:bannerId', upload.single('image'), adminController.updateBanner);
router.delete('/banners/:bannerId', adminController.deleteBanner);
router.get('/banners', adminController.getAllBanners);

module.exports = router;