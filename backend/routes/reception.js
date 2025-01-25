const express = require("express");
const router = express.Router();
const { auth, checkRole } = require("../middleware/auth");
const upload = require("../config/multer");
const receptionController = require("../controllers/receptionController");

// Apply authentication and reception role check to all routes
router.use(auth, checkRole("reception"));

// User Management
router.post(
  "/customers",
  upload.single("photo"),
  receptionController.createCustomer
);
router.get("/users/search", receptionController.searchUsers);

// Order Management
// router.get('/orders/current', receptionController.getCurrentOrders);
router.get("/orders/user/:userCode", receptionController.getOrdersByUser);
router.post("/orders", receptionController.createOrderForUser);

// New route for adding delivery charge
router.post(
  "/orders/add-delivery-charge",
  receptionController.addDeliveryCharge
);

//new
router.get("/orders/history", receptionController.getOrderHistory);
router.get("/orders/pending", receptionController.getPendingOrders);
router.patch("/orders/:orderId/status", receptionController.updateOrderStatus);

// router.post('/check-in',  receptionController.checkIn);
// router.post('/check-out', receptionController.checkOut);

router.post(
  "/check-in",
  upload.single("checkInImage"), // Use multer to handle single image upload
  receptionController.checkIn
);

router.post(
  "/check-out",

  receptionController.checkOut
);

module.exports = router;
