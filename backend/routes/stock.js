const express = require('express');
const router = express.Router();
const stockController = require('../controllers/stockController');
const { auth, checkRole } = require('../middleware/auth');
const upload = require("../config/multer");

// Apply authentication and stock role check to all routes
router.use(auth, checkRole('stock'));

// Get all products with quantities
router.get('/products', stockController.getAllProducts);

// Update product quantity
router.put('/update-quantity', stockController.updateQuantity);

// Get stock history for a specific product
router.get('/history/:productId', stockController.getStockHistory);
router.get('/history', stockController.getallStockHistory);

// /:productId

router.post(
    "/check-in",
    upload.single("checkInImage"),
    stockController.checkIn
  );
  router.post("/check-out", stockController.checkOut);
router.get('/daily-updates',  stockController.getDailyStockUpdates);

module.exports = router;