const express = require('express');
const router = express.Router();
const { auth, checkRole } = require('../middleware/auth');
const dispatchController = require('../controllers/dispatchController');
const upload = require("../config/multer");

// All routes require authentication and dispatch role
router.use(auth);
router.use(checkRole('dispatch'));

// Get current orders
router.get('/current-orders', dispatchController.getCurrentOrders);



// Generate delivery challan
router.post('/generate-challan', dispatchController.generateChallan);

// Get order history
router.get('/order-history', dispatchController.getOrderHistory);

// Get specific challan
// router.get('/challan/:id', dispatchController.getChallanById);

router.get('/challans/:userCode', dispatchController.getChallansByUserCode);


router.get('/orders/processing', dispatchController.getProcessingOrders);
router.patch('/orders/:orderId/status', dispatchController.updateOrderStatus);

router.post(
    "/check-in",
    upload.single("checkInImage"),
    dispatchController.checkIn
  );
  router.post("/check-out", dispatchController.checkOut);
router.get('/daily-orders', dispatchController.getDailyDispatchOrders);

router.get('/challan/:challanId/download', dispatchController.downloadChallan);

router.patch('/orders/:orderId/cod-payment-status', 
  dispatchController.updateCODPaymentStatus
);

module.exports = router;