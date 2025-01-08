const express = require('express');
const router = express.Router();
const { auth, checkRole } = require('../middleware/auth');
const dispatchController = require('../controllers/dispatchController');

// All routes require authentication and dispatch role
router.use(auth);
router.use(checkRole('dispatch'));

// Get current orders
router.get('/current-orders', dispatchController.getCurrentOrders);

// Get preview orders
router.get('/preview-orders', dispatchController.getPreviewOrders);

// Get pending orders
router.get('/pending-orders', dispatchController.getPendingOrders);

// Generate delivery challan
router.post('/generate-challan', dispatchController.generateChallan);

// Get order history
router.get('/order-history', dispatchController.getOrderHistory);

// Get specific challan
router.get('/challan/:id', dispatchController.getChallanById);

module.exports = router;