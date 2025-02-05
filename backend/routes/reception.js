// const express = require("express");
// const router = express.Router();
// const { auth, checkRole,authWithReception } = require("../middleware/auth");
// const upload = require("../config/multer");
// const receptionController = require("../controllers/receptionController");

// // Apply authentication and reception role check to all routes
// router.use(auth, checkRole("reception"));


// // User Management
// router.post(
//   "/customers",
//   upload.single("photo"),
//   receptionController.createCustomer
// );
// router.get('/users', receptionController.getAllUsers);
// router.get("/users/search", receptionController.searchUsers);

// // Order Management

// router.get("/orders/user/:userCode", receptionController.getOrdersByUser);
// router.post("/orders", receptionController.createOrderForUser);

// // New route for adding delivery charge
// router.post(
//   "/orders/add-delivery-charge",
//   receptionController.addDeliveryCharge
// );

// //new
// router.get("/orders/history", receptionController.getOrderHistory);
// router.get("/orders/pending", receptionController.getPendingOrders);
// router.patch("/orders/:orderId/status", receptionController.updateOrderStatus);



// router.post(
//   "/check-in",
//   upload.single("checkInImage"), // Use multer to handle single image upload
//   receptionController.checkIn
// );

// router.post(
//   "/check-out",

//   receptionController.checkOut
// );


// router.post('/user-access', receptionController.getUserAccessToken);
// router.post('/validate-access', receptionController.validateReceptionAccess);




// //For test

// // router.post('/user-panel-access', auth, checkRole('reception'), receptionController.getUserPanelAccess);
// router.post('/user-panel-access', receptionController.getUserPanelAccess);
// router.get('/user-panel/products', authWithReception,receptionController.getUserProducts);
// router.post('/user-panel/orders', authWithReception,receptionController.createOrderAsReception);

// module.exports = router;


// receptionRoutes.js
const express = require("express");
const router = express.Router();
const { auth, checkRole, authWithReception } = require("../middleware/auth");
const upload = require("../config/multer");
const receptionController = require("../controllers/receptionController");




// Regular reception routes with auth and role check
router.use(auth, checkRole("reception"));

// Main reception routes
router.post("/customers", upload.single("photo"), receptionController.createCustomer);
router.get('/users', receptionController.getAllUsers);
router.get("/users/search", receptionController.searchUsers);
router.get("/orders/user/:userCode", receptionController.getOrdersByUser);
router.post("/orders/add-delivery-charge", receptionController.addDeliveryCharge);
router.get("/orders/history", receptionController.getOrderHistory);
router.get("/orders/pending", receptionController.getPendingOrders);
router.patch("/orders/:orderId/status", receptionController.updateOrderStatus);
router.post("/check-in", upload.single("checkInImage"), receptionController.checkIn);
router.post("/check-out", receptionController.checkOut);

// User panel access route (requires regular reception authentication)
// router.use('/user-panel-access', auth, checkRole('reception'));
router.post('/user-panel-access', receptionController.getUserPanelAccess);
router.post("/miscellaneous-panel-access", receptionController.getMiscellaneousPanelAccess);

// User panel routes with special authentication
const userPanelRouter = express.Router();
userPanelRouter.use(authWithReception);
userPanelRouter.get('/products', receptionController.getUserProducts);
userPanelRouter.post('/orders', receptionController.createOrderAsReception);

// Mount user panel router
router.use('/user-panel', userPanelRouter);

module.exports = router;
