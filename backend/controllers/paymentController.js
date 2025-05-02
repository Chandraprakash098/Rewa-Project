
const Razorpay = require('razorpay');
const Payment = require('../models/Payment');
const Cart = require('../models/Cart');
const Order = require('../models/Order');
const User = require('../models/User');
const Product = require('../models/Product');
const crypto = require('crypto');
const UserActivity = require('../models/UserActivity')

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

const isAhmedabadOrGandhinagar = (pinCode) => {
  const pin = Number(pinCode);
  return (pin >= 380001 && pin <= 382481) || (pin >= 382010 && pin <= 382855);
};

const calculateDeliveryCharge = (boxes, deliveryChoice, pinCode) => {
  if (deliveryChoice === 'companyPickup' || !isAhmedabadOrGandhinagar(pinCode)) {
    return 0;
  }
  return boxes >= 230 && boxes <= 299 ? boxes * 2 : boxes * 3;
};

const paymentController = {

//   createOrder: async (req, res) => {
//     try {
//       const userId = req.user._id;
//       const { paymentMethod } = req.body;
  
//       if (req.isReceptionAccess) {
//         console.log(`Order created by reception ${req.receptionUser._id} for user ${userId}`);
//       }
  
//       // Validate payment method
//       const validPaymentMethods = ['UPI', 'netBanking', 'debitCard', 'COD'];
//       if (!validPaymentMethods.includes(paymentMethod)) {
//         return res.status(400).json({
//           error: 'Invalid payment method',
//           validMethods: validPaymentMethods
//         });
//       }
  
//       // Validate user and check activity status
//       const user = await User.findById(userId);
//       if (!user?.customerDetails?.address) {
//         return res.status(400).json({
//           error: "No address found. Please update your profile with a valid address."
//         });
//       }
  
//       // Check if user is currently inactive
//       if (!user.isActive) {
//         const userActivity = await UserActivity.findOne({ user: userId });
//         if (userActivity) {
//           const lastPeriod = userActivity.activityPeriods[userActivity.activityPeriods.length - 1];
//           if (lastPeriod && lastPeriod.status === 'inactive') {
//             const inactiveDays = Math.ceil((new Date() - lastPeriod.startDate) / (1000 * 60 * 60 * 24));
//             if (inactiveDays >= 30) {
//               lastPeriod.endDate = new Date();
//               userActivity.activityPeriods.push({
//                 startDate: new Date(),
//                 status: 'active'
//               });
//               await userActivity.save();
//               user.isActive = true;
//               await user.save();
//               console.log(`User ${userId} reactivated after ${inactiveDays} days of inactivity due to new order`);
//             }
//           }
//         }
//       }
  
//       // Get cart with populated product details
//       const cart = await Cart.findOne({ user: userId }).populate("products.product");
//       if (!cart || !cart.products.length) {
//         return res.status(400).json({ error: "Cart is empty" });
//       }
  
//       // Validate products and calculate total
//       const orderProducts = [];
//       let totalAmount = 0;
//       const productTypes = new Set();
//       const now = new Date();
  
//       for (const item of cart.products) {
//         const product = await Product.findById(item.product._id);
//         if (!product || !product.isActive) {
//           return res.status(400).json({ 
//             error: `Product not found or inactive: ${item.product.name}` 
//           });
//         }
  
//         // Determine price based on offer validity
//         const isOfferValid = product.discountedPrice && 
//                             product.validFrom && 
//                             product.validTo && 
//                             now >= product.validFrom && 
//                             now <= product.validTo;
//         const price = isOfferValid ? product.discountedPrice : product.originalPrice;
  
//         // Uncomment and adjust stock check if needed
//         // if (product.quantity < item.quantity) {
//         //   return res.status(400).json({
//         //     error: `Not enough stock for ${product.name}`,
//         //     availableStock: product.quantity,
//         //     requestedQuantity: item.quantity
//         //   });
//         // }
  
//         totalAmount += price * item.quantity;
//         orderProducts.push({
//           product: product._id,
//           quantity: item.quantity,
//           price: price
//         });
//         productTypes.add(product.type);
//       }
  
//       // Handle COD orders
//       if (paymentMethod === 'COD') {
//         const order = new Order({
//           user: userId,
//           products: orderProducts,
//           totalAmount,
//           totalAmountWithDelivery: totalAmount,
//           deliveryCharge: 0,
//           paymentMethod: 'COD',
//           type: [...productTypes][0],
//           shippingAddress: user.customerDetails.address,
//           firmName: user.customerDetails.firmName,
//           gstNumber: user.customerDetails.gstNumber,
//           paymentStatus: 'pending',
//           orderStatus: 'pending',
//           userStatus: user.isActive ? 'active' : 'inactive'
//         });
  
//         await order.save();
  
//         for (const item of orderProducts) {
//           await Product.findByIdAndUpdate(
//             item.product,
//             { $inc: { quantity: -item.quantity } }
//           );
//         }
//         await Cart.findByIdAndDelete(cart._id);
  
//         return res.status(201).json({
//           success: true,
//           message: "COD order placed successfully",
//           order
//         });
//       }
  
//       // Handle online payments
//       const receiptId = `rcpt_${Date.now().toString().slice(-8)}_${userId.toString().slice(-4)}`;
//       const razorpayOrder = await razorpay.orders.create({
//         amount: Math.round(totalAmount * 100),
//         currency: 'INR',
//         receipt: receiptId,
//         payment_capture: 1,
//         notes: {
//           userId: userId.toString(),
//           cartId: cart._id.toString(),
//           paymentMethod,
//           productType: [...productTypes][0],
//           userStatus: user.isActive ? 'active' : 'inactive'
//         }
//       });
  
//       res.status(200).json({
//         success: true,
//         orderId: razorpayOrder.id,
//         amount: totalAmount,
//         currency: 'INR',
//         keyId: process.env.RAZORPAY_KEY_ID,
//         cartDetails: {
//           items: cart.products.length,
//           total: totalAmount
//         },
//         userDetails: {
//           name: user.name,
//           email: user.email,
//           phone: user.phoneNumber,
//           status: user.isActive ? 'active' : 'inactive'
//         }
//       });
  
//     } catch (error) {
//       console.error("Order creation error:", error);
//       res.status(500).json({
//         error: "Error creating order",
//         details: error.message
//       });
//     }
//   },



// verifyPayment: async (req, res) => {
//   try {
//     const {
//       razorpay_order_id,
//       razorpay_payment_id,
//       // razorpay_signature
//     } = req.body;

//     // Fetch payment and order details from Razorpay
//     const payment = await razorpay.payments.fetch(razorpay_payment_id);
//     const razorpayOrder = await razorpay.orders.fetch(razorpay_order_id);

//     if (payment.status !== 'captured') {
//       return res.status(400).json({ 
//         error: 'Payment not captured',
//         details: 'Payment status is ' + payment.status,
//         success: false
//       });
//     }

//     if (payment.order_id !== razorpay_order_id) {
//       return res.status(400).json({ 
//         error: 'Order ID mismatch',
//         success: false
//       });
//     }

//     if (payment.amount !== razorpayOrder.amount) {
//       return res.status(400).json({ 
//         error: 'Payment amount mismatch',
//         success: false
//       });
//     }

//     // Extract order details from Razorpay order notes
//     const { userId, cartId, paymentMethod, productType } = razorpayOrder.notes;

//     // Get user and check activity status
//     const user = await User.findById(userId);
//     if (!user) {
//       return res.status(404).json({
//         error: 'User not found',
//         success: false
//       });
//     }

//     const userActivity = await UserActivity.findOne({ user: userId });
//     let userActivityStatus = user.isActive ? 'active' : 'inactive';
//     let inactiveDays = 0;
//     let wasReactivated = false;

//     if (!user.isActive && userActivity) {
//       const lastPeriod = userActivity.activityPeriods[userActivity.activityPeriods.length - 1];
//       if (lastPeriod && lastPeriod.status === 'inactive') {
//         inactiveDays = Math.ceil((new Date() - lastPeriod.startDate) / (1000 * 60 * 60 * 24));
//         if (inactiveDays >= 10) {
//           lastPeriod.endDate = new Date();
//           userActivity.activityPeriods.push({
//             startDate: new Date(),
//             status: 'active'
//           });
//           await userActivity.save();
//           user.isActive = true;
//           await user.save();
//           userActivityStatus = 'active';
//           wasReactivated = true;
//         }
//       }
//     }

//     // Get cart and create order
//     const cart = await Cart.findById(cartId).populate('products.product');
//     if (!cart) {
//       return res.status(400).json({ 
//         error: 'Cart not found',
//         success: false
//       });
//     }

//     // Verify product prices with offer validity
//     const now = new Date();
//     const orderProducts = cart.products.map(item => {
//       const product = item.product;
//       const isOfferValid = product.discountedPrice && 
//                           product.validFrom && 
//                           product.validTo && 
//                           now >= product.validFrom && 
//                           now <= product.validTo;
//       const price = isOfferValid ? product.discountedPrice : product.originalPrice;
      
//       return {
//         product: product._id,
//         quantity: item.quantity,
//         price: price
//       };
//     });

//     const totalAmount = orderProducts.reduce((sum, item) => sum + (item.price * item.quantity), 0);
//     if (Math.round(totalAmount * 100) !== razorpayOrder.amount) {
//       return res.status(400).json({
//         error: 'Calculated total amount does not match Razorpay order amount',
//         success: false
//       });
//     }

//     const order = new Order({
//       user: userId,
//       products: orderProducts,
//       totalAmount: razorpayOrder.amount / 100,
//       totalAmountWithDelivery: razorpayOrder.amount / 100,
//       paymentMethod,
//       type: productType,
//       shippingAddress: user.customerDetails.address,
//       firmName: user.customerDetails.firmName,
//       gstNumber: user.customerDetails.gstNumber,
//       paymentStatus: 'completed',
//       orderStatus: 'processing',
//       userActivityStatus,
//       inactiveDays,
//       reactivatedWithOrder: wasReactivated
//     });

//     await order.save();

//     const paymentRecord = new Payment({
//       user: userId,
//       amount: razorpayOrder.amount / 100,
//       paymentIntentId: razorpay_payment_id,
//       status: 'completed',
//       userActivityStatus,
//       orderDetails: order._id
//     });
//     await paymentRecord.save();

//     for (const item of cart.products) {
//       await Product.findByIdAndUpdate(
//         item.product._id,
//         { $inc: { quantity: -item.quantity } }
//       );
//     }

//     await Cart.findByIdAndDelete(cartId);

//     res.status(200).json({
//       success: true,
//       orderId: order._id,
//       message: 'Payment verified and order created successfully',
//       userStatus: {
//         currentStatus: userActivityStatus,
//         wasReactivated,
//         inactiveDays
//       }
//     });

//   } catch (error) {
//     console.error('Payment Verification Error:', error);
//     res.status(500).json({ 
//       error: 'Error verifying payment',
//       details: error.message,
//       success: false
//     });
//   }
// }
// };



createOrder: async (req, res) => {
  try {
    const userId = req.user._id;
    const { paymentMethod, shippingAddress, deliveryChoice } = req.body;

    if (req.isReceptionAccess) {
      console.log(`Order created by reception ${req.receptionUser._id} for user ${userId}`);
    }

    const validPaymentMethods = ['UPI', 'netBanking', 'debitCard', 'COD'];
    if (!validPaymentMethods.includes(paymentMethod)) {
      return res.status(400).json({
        error: 'Invalid payment method',
        validMethods: validPaymentMethods
      });
    }

    if (!shippingAddress || !shippingAddress.address || !shippingAddress.city || !shippingAddress.state || !shippingAddress.pinCode) {
      return res.status(400).json({
        error: 'Complete shipping address with pin code is required'
      });
    }

    if (!/^\d{6}$/.test(shippingAddress.pinCode)) {
      return res.status(400).json({
        error: 'Pin code must be 6 digits'
      });
    }

    if (!['homeDelivery', 'companyPickup'].includes(deliveryChoice)) {
      return res.status(400).json({
        error: 'Invalid delivery choice'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    if (!user.isActive) {
      const userActivity = await UserActivity.findOne({ user: userId });
      if (userActivity) {
        const lastPeriod = userActivity.activityPeriods[userActivity.activityPeriods.length - 1];
        if (lastPeriod && lastPeriod.status === 'inactive') {
          const inactiveDays = Math.ceil((new Date() - lastPeriod.startDate) / (1000 * 60 * 60 * 24));
          if (inactiveDays >= 30) {
            lastPeriod.endDate = new Date();
            userActivity.activityPeriods.push({
              startDate: new Date(),
              status: 'active'
            });
            await userActivity.save();
            user.isActive = true;
            await user.save();
            console.log(`User ${userId} reactivated after ${inactiveDays} days of inactivity due to new order`);
          }
        }
      }
    }

    const cart = await Cart.findOne({ user: userId }).populate("products.product");
    if (!cart || !cart.products.length) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    const orderProducts = [];
    let totalAmount = 0;
    const productTypes = new Set();
    const now = new Date();

    for (const item of cart.products) {
      const product = await Product.findById(item.product._id);
      if (!product || !product.isActive) {
        return res.status(400).json({
          error: `Product not found or inactive: ${item.product.name}`
        });
      }

      const isOfferValid = product.discountedPrice &&
                          product.validFrom &&
                          product.validTo &&
                          now >= product.validFrom &&
                          now <= product.validTo;
      const price = isOfferValid ? product.discountedPrice : product.originalPrice;

      if (item.boxes < 230) {
        return res.status(400).json({
          error: `Minimum 230 boxes required for ${product.name}`,
          minimumRequired: 230,
          requestedBoxes: item.boxes
        });
      }

      totalAmount += price * item.boxes;
      orderProducts.push({
        product: product._id,
        boxes: item.boxes,
        price: price
      });
      productTypes.add(product.type);
    }

    const deliveryCharge = calculateDeliveryCharge(
      orderProducts.reduce((sum, item) => sum + item.boxes, 0),
      deliveryChoice,
      shippingAddress.pinCode
    );

    if (paymentMethod === 'COD') {
      const order = new Order({
        user: userId,
        products: orderProducts,
        totalAmount,
        deliveryCharge,
        totalAmountWithDelivery: totalAmount + deliveryCharge,
        paymentMethod: 'COD',
        type: [...productTypes][0],
        shippingAddress,
        deliveryChoice,
        firmName: user.customerDetails.firmName,
        gstNumber: user.customerDetails.gstNumber,
        paymentStatus: 'pending',
        // orderStatus: isAhmedabadOrGandhinagar(shippingAddress.pinCode) ? 'pending' : 'preview',
        orderStatus: 'pending',
        userStatus: user.isActive ? 'active' : 'inactive'
      });

      await order.save();

      for (const item of orderProducts) {
        await Product.findByIdAndUpdate(
          item.product,
          { $inc: { boxes: -item.boxes } }
        );
      }
      await Cart.findByIdAndDelete(cart._id);

      return res.status(201).json({
        success: true,
        message: "COD order placed successfully",
        order
      });
    }

    const receiptId = `rcpt_${Date.now().toString().slice(-8)}_${userId.toString().slice(-4)}`;
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round((totalAmount + deliveryCharge) * 100),
      currency: 'INR',
      receipt: receiptId,
      payment_capture: 1,
      notes: {
        userId: userId.toString(),
        cartId: cart._id.toString(),
        paymentMethod,
        productType: [...productTypes][0],
        userStatus: user.isActive ? 'active' : 'inactive',
        deliveryChoice,
        pinCode: shippingAddress.pinCode
      }
    });

    res.status(200).json({
      success: true,
      orderId: razorpayOrder.id,
      amount: totalAmount + deliveryCharge,
      currency: 'INR',
      keyId: process.env.RAZORPAY_KEY_ID,
      cartDetails: {
        items: cart.products.length,
        total: totalAmount,
        deliveryCharge
      },
      userDetails: {
        name: user.name,
        email: user.email,
        phone: user.phoneNumber,
        status: user.isActive ? 'active' : 'inactive'
      }
    });

  } catch (error) {
    console.error("Order creation error:", error);
    res.status(500).json({
      error: "Error creating order",
      details: error.message
    });
  }
},

verifyPayment: async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
    } = req.body;

    const payment = await razorpay.payments.fetch(razorpay_payment_id);
    const razorpayOrder = await razorpay.orders.fetch(razorpay_order_id);

    if (payment.status !== 'captured') {
      return res.status(400).json({
        error: 'Payment not captured',
        details: 'Payment status is ' + payment.status,
        success: false
      });
    }

    if (payment.order_id !== razorpay_order_id) {
      return res.status(400).json({
        error: 'Order ID mismatch',
        success: false
      });
    }

    if (payment.amount !== razorpayOrder.amount) {
      return res.status(400).json({
        error: 'Payment amount mismatch',
        success: false
      });
    }

    const { userId, cartId, paymentMethod, productType, deliveryChoice, pinCode } = razorpayOrder.notes;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        success: false
      });
    }

    const userActivity = await UserActivity.findOne({ user: userId });
    let userActivityStatus = user.isActive ? 'active' : 'inactive';
    let inactiveDays = 0;
    let wasReactivated = false;

    if (!user.isActive && userActivity) {
      const lastPeriod = userActivity.activityPeriods[userActivity.activityPeriods.length - 1];
      if (lastPeriod && lastPeriod.status === 'inactive') {
        inactiveDays = Math.ceil((new Date() - lastPeriod.startDate) / (1000 * 60 * 60 * 24));
        if (inactiveDays >= 10) {
          lastPeriod.endDate = new Date();
          userActivity.activityPeriods.push({
            startDate: new Date(),
            status: 'active'
          });
          await userActivity.save();
          user.isActive = true;
          await user.save();
          userActivityStatus = 'active';
          wasReactivated = true;
        }
      }
    }

    const cart = await Cart.findById(cartId).populate('products.product');
    if (!cart) {
      return res.status(400).json({
        error: 'Cart not found',
        success: false
      });
    }

    const now = new Date();
    const orderProducts = cart.products.map(item => {
      const product = item.product;
      const isOfferValid = product.discountedPrice &&
                          product.validFrom &&
                          product.validTo &&
                          now >= product.validFrom &&
                          now <= product.validTo;
      const price = isOfferValid ? product.discountedPrice : product.originalPrice;

      return {
        product: product._id,
        boxes: item.boxes,
        price: price
      };
    });

    const totalAmount = orderProducts.reduce((sum, item) => sum + (item.price * item.boxes), 0);
    const deliveryCharge = calculateDeliveryCharge(
      orderProducts.reduce((sum, item) => sum + item.boxes, 0),
      deliveryChoice,
      pinCode
    );

    if (Math.round((totalAmount + deliveryCharge) * 100) !== razorpayOrder.amount) {
      return res.status(400).json({
        error: 'Calculated total amount does not match Razorpay order amount',
        success: false
      });
    }

    const order = new Order({
      user: userId,
      products: orderProducts,
      totalAmount,
      deliveryCharge,
      totalAmountWithDelivery: totalAmount + deliveryCharge,
      paymentMethod,
      type: productType,
      shippingAddress: {
        address: user.customerDetails.address,
        city: 'Unknown', // Update based on actual input if available
        state: 'Unknown',
        pinCode
      },
      deliveryChoice,
      firmName: user.customerDetails.firmName,
      gstNumber: user.customerDetails.gstNumber,
      paymentStatus: 'completed',
      orderStatus: isAhmedabadOrGandhinagar(pinCode) ? 'processing' : 'preview',
      userActivityStatus,
      inactiveDays,
      reactivatedWithOrder: wasReactivated
    });

    await order.save();

    const paymentRecord = new Payment({
      user: userId,
      amount: razorpayOrder.amount / 100,
      paymentIntentId: razorpay_payment_id,
      status: 'completed',
      userActivityStatus,
      orderDetails: order._id
    });
    await paymentRecord.save();

    for (const item of cart.products) {
      await Product.findByIdAndUpdate(
        item.product._id,
        { $inc: { boxes: -item.boxes } }
      );
    }

    await Cart.findByIdAndDelete(cartId);

    res.status(200).json({
      success: true,
      orderId: order._id,
      message: 'Payment verified and order created successfully',
      userStatus: {
        currentStatus: userActivityStatus,
        wasReactivated,
        inactiveDays
      }
    });

  } catch (error) {
    console.error('Payment Verification Error:', error);
    res.status(500).json({
      error: 'Error verifying payment',
      details: error.message,
      success: false
    });
  }
}
};

module.exports = paymentController;






















// const Razorpay = require('razorpay');
// const Payment = require('../models/Payment');
// const Cart = require('../models/Cart');
// const Order = require('../models/Order');
// const User = require('../models/User');
// const Product = require('../models/Product');
// const crypto = require('crypto');
// const UserActivity = require('../models/UserActivity');
// const rateLimit = require('express-rate-limit');
// const winston = require('winston');
// const mongoose = require('mongoose');

// // Configure logging
// const logger = winston.createLogger({
//   level: 'info',
//   format: winston.format.json(),
//   transports: [
//     new winston.transports.File({ filename: 'error.log', level: 'error' }),
//     new winston.transports.File({ filename: 'combined.log' })
//   ]
// });

// if (process.env.NODE_ENV !== 'production') {
//   logger.add(new winston.transports.Console({
//     format: winston.format.simple()
//   }));
// }

// // Configure rate limiting
// const createOrderLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100, // limit each IP to 100 requests per windowMs
//   message: 'Too many orders created from this IP, please try again after 15 minutes'
// });

// const verifyPaymentLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000,
//   max: 100,
//   message: 'Too many payment verification attempts from this IP, please try again after 15 minutes'
// });

// // Initialize Razorpay
// const razorpay = new Razorpay({
//   key_id: process.env.RAZORPAY_LIVE_KEY_ID,
//   key_secret: process.env.RAZORPAY_LIVE_KEY_SECRET
// });

// // Retry mechanism for critical operations
// const retry = async (operation, retries = 3) => {
//   try {
//     return await operation();
//   } catch (error) {
//     if (retries > 0) {
//       await new Promise(resolve => setTimeout(resolve, 1000));
//       return retry(operation, retries - 1);
//     }
//     throw error;
//   }
// };

// // Payment status monitoring
// const monitorPaymentStatus = async (paymentId, orderId) => {
//   const maxAttempts = 3;
//   let attempts = 0;

//   const checkStatus = async () => {
//     try {
//       const payment = await razorpay.payments.fetch(paymentId);
//       if (payment.status === 'captured') {
//         return payment;
//       }
//       if (attempts < maxAttempts) {
//         attempts++;
//         await new Promise(resolve => setTimeout(resolve, 5000));
//         return checkStatus();
//       }
//       throw new Error('Payment status check timeout');
//     } catch (error) {
//       logger.error('Payment status check failed:', {
//         paymentId,
//         orderId,
//         error: error.message
//       });
//       throw error;
//     }
//   };

//   return checkStatus();
// };

// const paymentController = {
//   createOrder: async (req, res) => {
//     const session = await mongoose.startSession();
//     session.startTransaction();

//     try {
//       const userId = req.user._id;
//       const { paymentMethod } = req.body;

//       if (req.isReceptionAccess) {
//         logger.info(`Order created by reception ${req.receptionUser._id} for user ${userId}`);
//       }

//       // Validate payment method
//       const validPaymentMethods = ['UPI', 'netBanking', 'debitCard', 'COD'];
//       if (!validPaymentMethods.includes(paymentMethod)) {
//         return res.status(400).json({
//           error: 'Invalid payment method',
//           validMethods: validPaymentMethods
//         });
//       }

//       // Validate user and check activity status
//       const user = await User.findById(userId).session(session);
//       if (!user?.customerDetails?.address) {
//         await session.abortTransaction();
//         return res.status(400).json({
//           error: "No address found. Please update your profile with a valid address."
//         });
//       }

//       // Check user activity status
//       const userActivity = await UserActivity.findOne({ user: userId }).session(session);
//       let userReactivated = false;

//       if (!user.isActive && userActivity) {
//         const lastPeriod = userActivity.activityPeriods[userActivity.activityPeriods.length - 1];
//         if (lastPeriod?.status === 'inactive') {
//           const inactiveDays = Math.ceil((new Date() - lastPeriod.startDate) / (1000 * 60 * 60 * 24));
//           if (inactiveDays >= 30) {
//             lastPeriod.endDate = new Date();
//             userActivity.activityPeriods.push({
//               startDate: new Date(),
//               status: 'active'
//             });
//             await userActivity.save({ session });
//             user.isActive = true;
//             await user.save({ session });
//             userReactivated = true;
//             logger.info(`User ${userId} reactivated after ${inactiveDays} days of inactivity`);
//           }
//         }
//       }

//       // Get and validate cart
//       const cart = await Cart.findOne({ user: userId })
//         .populate("products.product")
//         .session(session);

//       if (!cart?.products?.length) {
//         await session.abortTransaction();
//         return res.status(400).json({ error: "Cart is empty" });
//       }

//       // Validate products and calculate total
//       const orderProducts = [];
//       let totalAmount = 0;
//       const productTypes = new Set();

//       for (const item of cart.products) {
//         const product = await Product.findById(item.product._id).session(session);
        
//         if (!product?.isActive) {
//           await session.abortTransaction();
//           return res.status(400).json({ 
//             error: `Product not found or inactive: ${item.product.name}`
//           });
//         }

//         if (product.quantity < item.quantity) {
//           await session.abortTransaction();
//           return res.status(400).json({
//             error: `Not enough stock for ${product.name}`,
//             availableStock: product.quantity,
//             requestedQuantity: item.quantity
//           });
//         }

//         const price = product.discountedPrice || product.originalPrice;
//         totalAmount += price * item.quantity;
        
//         orderProducts.push({
//           product: product._id,
//           quantity: item.quantity,
//           price: price
//         });

//         productTypes.add(product.type);
//       }

//       // Handle COD orders
//       if (paymentMethod === 'COD') {
//         const order = new Order({
//           user: userId,
//           products: orderProducts,
//           totalAmount,
//           totalAmountWithDelivery: totalAmount,
//           deliveryCharge: 0,
//           paymentMethod: 'COD',
//           type: [...productTypes][0],
//           shippingAddress: user.customerDetails.address,
//           firmName: user.customerDetails.firmName,
//           gstNumber: user.customerDetails.gstNumber,
//           paymentStatus: 'pending',
//           orderStatus: 'pending',
//           userStatus: user.isActive ? 'active' : 'inactive',
//           userReactivated
//         });

//         await order.save({ session });

//         // Update product quantities
//         for (const item of orderProducts) {
//           await Product.findByIdAndUpdate(
//             item.product,
//             { $inc: { quantity: -item.quantity } },
//             { session }
//           );
//         }

//         await Cart.findByIdAndDelete(cart._id, { session });
//         await session.commitTransaction();

//         logger.info(`COD order created successfully for user ${userId}`);
//         return res.status(201).json({
//           success: true,
//           message: "COD order placed successfully",
//           order
//         });
//       }

//       // Handle online payments
//       const receiptId = `rcpt_${Date.now().toString().slice(-8)}_${userId.toString().slice(-4)}`;
      
//       const razorpayOrder = await razorpay.orders.create({
//         amount: Math.round(totalAmount * 100),
//         currency: 'INR',
//         receipt: receiptId,
//         payment_capture: 1,
//         notes: {
//           userId: userId.toString(),
//           cartId: cart._id.toString(),
//           paymentMethod,
//           productType: [...productTypes][0],
//           userStatus: user.isActive ? 'active' : 'inactive',
//           userReactivated: userReactivated.toString()
//         }
//       });

//       await session.commitTransaction();

//       logger.info(`Razorpay order created successfully for user ${userId}`);
//       res.status(200).json({
//         success: true,
//         orderId: razorpayOrder.id,
//         amount: totalAmount,
//         currency: 'INR',
//         keyId: process.env.RAZORPAY_LIVE_KEY_ID,
//         cartDetails: {
//           items: cart.products.length,
//           total: totalAmount
//         },
//         userDetails: {
//           name: user.name,
//           email: user.email,
//           phone: user.phoneNumber,
//           status: user.isActive ? 'active' : 'inactive'
//         }
//       });

//     } catch (error) {
//       await session.abortTransaction();
//       logger.error("Order creation error:", {
//         error: error.message,
//         userId: req.user._id,
//         stack: error.stack
//       });
      
//       res.status(500).json({
//         error: "Unable to process order at this time"
//       });
//     } finally {
//       session.endSession();
//     }
//   },

//   verifyPayment: async (req, res) => {
//     const session = await mongoose.startSession();
//     session.startTransaction();

//     try {
//       const {
//         razorpay_order_id,
//         razorpay_payment_id,
//         razorpay_signature
//       } = req.body;

//       // Verify payment signature
//       const sign = razorpay_order_id + '|' + razorpay_payment_id;
//       const expectedSign = crypto
//         .createHmac('sha256', process.env.RAZORPAY_LIVE_KEY_SECRET)
//         .update(sign)
//         .digest('hex');

//       if (razorpay_signature !== expectedSign) {
//         await session.abortTransaction();
//         logger.warn('Invalid payment signature detected', {
//           orderId: razorpay_order_id,
//           paymentId: razorpay_payment_id
//         });
//         return res.status(400).json({ 
//           error: 'Invalid payment signature',
//           success: false
//         });
//       }

//       // Monitor payment status
//       const payment = await monitorPaymentStatus(razorpay_payment_id, razorpay_order_id);
//       const razorpayOrder = await razorpay.orders.fetch(razorpay_order_id);

//       // Verify payment details
//       if (payment.status !== 'captured' || 
//           payment.order_id !== razorpay_order_id || 
//           payment.amount !== razorpayOrder.amount) {
//         await session.abortTransaction();
//         logger.error('Payment verification failed', {
//           paymentId: razorpay_payment_id,
//           orderId: razorpay_order_id,
//           status: payment.status
//         });
//         return res.status(400).json({ 
//           error: 'Payment verification failed',
//           success: false
//         });
//       }

//       const { userId, cartId, paymentMethod, productType } = razorpayOrder.notes;

//       // Process order creation
//       const [user, cart] = await Promise.all([
//         User.findById(userId).session(session),
//         Cart.findById(cartId).populate('products.product').session(session)
//       ]);

//       if (!user || !cart) {
//         await session.abortTransaction();
//         return res.status(404).json({
//           error: 'Required data not found',
//           success: false
//         });
//       }

//       // Create order with retry mechanism
//       const order = await retry(async () => {
//         const newOrder = new Order({
//           user: userId,
//           products: cart.products.map(item => ({
//             product: item.product._id,
//             quantity: item.quantity,
//             price: item.product.discountedPrice || item.product.originalPrice
//           })),
//           totalAmount: razorpayOrder.amount / 100,
//           paymentMethod,
//           type: productType,
//           shippingAddress: user.customerDetails.address,
//           firmName: user.customerDetails.firmName,
//           gstNumber: user.customerDetails.gstNumber,
//           paymentStatus: 'completed',
//           orderStatus: 'processing',
//           userStatus: user.isActive ? 'active' : 'inactive'
//         });

//         return newOrder.save({ session });
//       });

//       // Create payment record
//       const paymentRecord = new Payment({
//         user: userId,
//         amount: razorpayOrder.amount / 100,
//         paymentIntentId: razorpay_payment_id,
//         status: 'completed',
//         orderDetails: order._id
//       });
//       await paymentRecord.save({ session });

//       // Update product quantities and clear cart
//       await Promise.all([
//         ...cart.products.map(item => 
//           Product.findByIdAndUpdate(
//             item.product._id,
//             { $inc: { quantity: -item.quantity } },
//             { session }
//           )
//         ),
//         Cart.findByIdAndDelete(cartId, { session })
//       ]);

//       await session.commitTransaction();

//       logger.info('Payment verified and order created successfully', {
//         orderId: order._id,
//         paymentId: razorpay_payment_id
//       });

//       res.status(200).json({
//         success: true,
//         orderId: order._id,
//         message: 'Payment verified and order created successfully'
//       });

//     } catch (error) {
//       await session.abortTransaction();
//       logger.error('Payment Verification Error:', {
//         error: error.message,
//         stack: error.stack
//       });
      
//       res.status(500).json({ 
//         error: 'Unable to verify payment at this time',
//         success: false
//       });
//     } finally {
//       session.endSession();
//     }
//   },

//   // Webhook handler for asynchronous payment updates
//   webhook: async (req, res) => {
//     try {
//       const signature = req.headers['x-razorpay-signature'];
      
//       // Verify webhook signature
//       razorpay.webhooks.verify(
//         req.body.toString(),
//         signature,
//         process.env.RAZORPAY_WEBHOOK_SECRET
//       );
      
//       const event = req.body;
      
//       switch(event.event) {
//         case 'payment.captured':
//           await handlePaymentSuccess(event.payload);
//           break;
//         case 'payment.failed':
//           await handlePaymentFailure(event.payload);
//           break;
//         // Add more event handlers as needed
//       }
      
//       res.json({ received: true });
//     } catch (error) {
//       logger.error('Webhook Error:', {
//         error: error.message,
//         stack: error.stack
//       });
//       res.status(400).send('Webhook signature verification failed');
//     }
//   }
// };

// async function handlePaymentSuccess(payload) {
//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//     const { order_id, payment_id } = payload;
    
//     // Update order and payment status
//     await Promise.all([
//       Order.findOneAndUpdate(
//         { razorpayOrderId: order_id },
//         { 
//           paymentStatus: 'completed',
//           orderStatus: 'processing',
//           lastUpdated: new Date()
//         },
//         { session }
//       ),
//       Payment.findOneAndUpdate(
//         { paymentIntentId: payment_id },
//         { 
//           status: 'completed',
//           lastUpdated: new Date()
//         },
//         { session }
//       )
//     ]);

//     await session.commitTransaction();
//     logger.info('Payment success webhook processed', { orderId: order_id, paymentId: payment_id });
//   } catch (error) {
//     await session.abortTransaction();
//     logger.error('Payment success webhook processing failed:', {
//       error: error.message,
//       payload
//     });
//     throw error;
//   } finally {
//     session.endSession();
//   }
// }

// async function handlePaymentFailure(payload) {
//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//     const { order_id, payment_id, error_code, error_description } = payload;
    
//     // Get order details
//     const order = await Order.findOne({ razorpayOrderId: order_id }).session(session);
//     if (!order) {
//       throw new Error('Order not found');
//     }

//     // Restore product quantities
//     const restorePromises = order.products.map(item =>
//       Product.findByIdAndUpdate(
//         item.product,
//         { $inc: { quantity: item.quantity } },
//         { session }
//       )
//     );

//     // Update order and payment status
//     const updatePromises = [
//       Order.findOneAndUpdate(
//         { razorpayOrderId: order_id },
//         { 
//           paymentStatus: 'failed',
//           orderStatus: 'cancelled',
//           failureReason: `${error_code}: ${error_description}`,
//           lastUpdated: new Date()
//         },
//         { session }
//       ),
//       Payment.findOneAndUpdate(
//         { paymentIntentId: payment_id },
//         { 
//           status: 'failed',
//           errorCode: error_code,
//           errorDescription: error_description,
//           lastUpdated: new Date()
//         },
//         { session }
//       )
//     ];

//     await Promise.all([...restorePromises, ...updatePromises]);
//     await session.commitTransaction();

//     // Send notification to user about payment failure
//     await sendPaymentFailureNotification(order.user, order_id, error_description);
    
//     logger.info('Payment failure webhook processed', {
//       orderId: order_id,
//       paymentId: payment_id,
//       errorCode: error_code
//     });
//   } catch (error) {
//     await session.abortTransaction();
//     logger.error('Payment failure webhook processing failed:', {
//       error: error.message,
//       payload
//     });
//     throw error;
//   } finally {
//     session.endSession();
//   }
// }

// // Utility function to send payment failure notification
// async function sendPaymentFailureNotification(userId, orderId, errorDescription) {
//   try {
//     const user = await User.findById(userId);
//     if (!user) return;

//     // You can implement your notification service here
//     // Example: Email notification
//     await sendEmail({
//       to: user.email,
//       subject: 'Payment Failed',
//       template: 'payment-failure',
//       data: {
//         userName: user.name,
//         orderId,
//         errorMessage: errorDescription,
//         supportEmail: process.env.SUPPORT_EMAIL
//       }
//     });

//     // Example: SMS notification
//     if (user.phoneNumber) {
//       await sendSMS({
//         to: user.phoneNumber,
//         message: `Payment failed for order ${orderId}. Please check your email for details.`
//       });
//     }
//   } catch (error) {
//     logger.error('Failed to send payment failure notification:', {
//       error: error.message,
//       userId,
//       orderId
//     });
//   }
// }
