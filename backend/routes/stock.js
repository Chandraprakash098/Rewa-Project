const express = require('express');
const router = express.Router();
const stockController = require('../controllers/stockController');
const { auth, checkRole } = require('../middleware/auth');

// Middleware to ensure only stock management role can access these routes
router.use(auth, checkRole('reception'));

// Get stock dashboard - view all products with quantities
router.get('/dashboard', stockController.getDashboard);

// Update product quantity
router.put('/update-quantity', stockController.updateQuantity);

// Get stock history for a specific product
router.get('/history/:productId', stockController.getStockHistory);

// Get low stock alerts
router.get('/low-stock-alerts', stockController.getLowStockAlerts);

module.exports = router;