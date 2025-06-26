// const express = require('express');
// const router = express.Router();
// const { auth, checkRole } = require('../middleware/auth');
// const userController = require('../controllers/userController');
// const cartController = require('../controllers/cartController')
// const paymentController= require('../controllers/paymentController')

// // Product Routes
// router.get('/products', auth, userController.getAllProducts);
// router.get('/offers', auth, userController.getOffers);

// // Cart Routes
// router.post('/cart', auth, cartController.addToCart);  // Add to cart
// router.get('/cart', auth, cartController.getCart);     // View cart
// router.delete('/cart', auth, cartController.clearCart); // Clear cart

// // Order Routes
// router.post('/orders', auth, userController.createOrder);
// //new
// router.post('/verify-payment', auth, userController.verifyPayment);
// router.get('/orders/history', auth, userController.getOrderHistory);

// // Profile Routes
// // Add this to userRoutes:
// router.get('/profile', auth, userController.getProfile);
// router.put('/profile', auth, userController.updateProfile);
// router.post('/profile/change-password', auth, userController.changePassword);

// //for Payments



// router.post('/create-razorpay-order', auth, paymentController.createRazorpayOrder);

// // Route for creating COD order
// router.post('/create-cod-order', auth, paymentController.createCODOrder);

// // Route for verifying Razorpay payment
// // router.post('/verify-payment', auth, paymentController.verifyPayment);

// module.exports = router;





const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const userController = require('../controllers/userController');
const cartController = require('../controllers/cartController');
const paymentController = require('../controllers/paymentController');
const upload = require('../config/multer');

// Product Routes
router.get('/products', auth, userController.getAllProducts);
router.get('/offers', auth, userController.getOffers);

// Cart Routes
router.post('/cart', auth, cartController.addToCart);
router.get('/cart', auth, cartController.getCart);
// router.delete('/cart', auth, cartController.clearCart);
router.delete('/cart/product', auth, cartController.removeFromCart);

// Order & Payment Routes
router.post('/create-order', auth, paymentController.createOrder); // Single entry point for order creation
// router.post('/verify-payment', auth, paymentController.verifyPayment);
router.post('/submit-payment-details', auth, upload.single('screenshot'), paymentController.submitPaymentDetails);
router.get('/orders/history', auth, userController.getOrderHistory);

// Profile Routes
router.get('/profile', auth, userController.getProfile);
router.put('/profile', auth, userController.updateProfile);
router.post('/profile/change-password', auth, userController.changePassword);


router.get('/banners', auth, userController.getBanners);
// In your routes file (probably routes/userRoutes.js or similar)
router.get('/payments/:paymentId', auth, paymentController.getPaymentDetails);

module.exports = router;