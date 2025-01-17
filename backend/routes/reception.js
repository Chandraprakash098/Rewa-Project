const express = require('express');
const router = express.Router();
const { auth, checkRole } = require('../middleware/auth');
const upload = require('../config/multer');
const receptionController = require('../controllers/receptionController');

// Apply authentication and reception role check to all routes
router.use(auth, checkRole('reception'));

// User Management
router.post('/customers', upload.single('photo'), receptionController.createCustomer);
router.get('/users/search', receptionController.searchUsers);

// Order Management
// router.get('/orders/current', receptionController.getCurrentOrders);
router.get('/orders/user/:userCode', receptionController.getOrdersByUser);
router.post('/orders', receptionController.createOrderForUser);



//new
router.get('/orders/history', receptionController.getOrderHistory);
router.get('/orders/pending', receptionController.getPendingOrders);
router.patch('/orders/:orderId/status', receptionController.updateOrderStatus);

module.exports = router;