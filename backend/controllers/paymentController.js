// const Razorpay = require('razorpay');
// const Payment = require('../models/Payment');
// const Cart = require('../models/Cart');
// const Order = require('../models/Order');
// const User = require('../models/User');
// const Product = require('../models/Product');
// const crypto = require('crypto');

// const razorpay = new Razorpay({
//   key_id: process.env.RAZORPAY_KEY_ID,
//   key_secret: process.env.RAZORPAY_KEY_SECRET
// });

// const paymentController = {
//   createOrder: async (req, res) => {
//     try {
//       const userId = req.user._id;
//       const { paymentMethod } = req.body;

//       // Validate payment method
//       const validPaymentMethods = ['UPI', 'netBanking', 'debitCard', 'COD'];
//       if (!validPaymentMethods.includes(paymentMethod)) {
//         return res.status(400).json({
//           error: 'Invalid payment method',
//           validMethods: validPaymentMethods
//         });
//       }

//       // Validate user and address
//       const user = await User.findById(userId);
//       if (!user?.customerDetails?.address) {
//         return res.status(400).json({
//           error: "No address found. Please update your profile with a valid address."
//         });
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

//       for (const item of cart.products) {
//         const product = await Product.findById(item.product._id);
        
//         if (!product || !product.isActive) {
//           return res.status(400).json({ 
//             error: `Product not found or inactive: ${item.product.name}` 
//           });
//         }

//         if (product.quantity < item.quantity) {
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
//           totalAmountWithDelivery: totalAmount, // Add this line
//           deliveryCharge: 0, // Add this line to explicitly set delivery charge to 0
//           paymentMethod: 'COD',
//           type: [...productTypes][0],
//           shippingAddress: user.customerDetails.address,
//           firmName: user.customerDetails.firmName,
//           gstNumber: user.customerDetails.gstNumber,
//           paymentStatus: 'pending',
//           orderStatus: 'pending'
//         });

//         await order.save();

//         // Update product quantities and clear cart
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
//           productType: [...productTypes][0]
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
//           phone: user.phoneNumber
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


//   verifyPayment: async (req, res) => {
//     try {
//       const {
//         razorpay_order_id,
//         razorpay_payment_id,
//         razorpay_signature // This might be undefined
//       } = req.body;
  
//       // Fetch the order details from Razorpay
//       const razorpayOrder = await razorpay.orders.fetch(razorpay_order_id);
  
//       // If signature is not provided, we'll do a manual verification
//       if (!razorpay_signature) {
//         try {
//           // Verify payment via Razorpay API
//           const payment = await razorpay.payments.fetch(razorpay_payment_id);
          
//           // Check if payment is associated with the order
//           if (payment.order_id !== razorpay_order_id || payment.status !== 'captured') {
//             return res.status(400).json({ 
//               error: 'Payment verification failed',
//               details: 'Invalid payment or order status'
//             });
//           }
//         } catch (apiVerificationError) {
//           console.error('Razorpay API Verification Error:', apiVerificationError);
//           return res.status(400).json({ 
//             error: 'Payment verification failed',
//             details: apiVerificationError.message
//           });
//         }
//       } else {
//         // Signature-based verification
//         const sign = razorpay_order_id + '|' + razorpay_payment_id;
//         const expectedSign = crypto
//           .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
//           .update(sign)
//           .digest('hex');
  
//         // Log for debugging
//         console.log('Received Signature:', razorpay_signature);
//         console.log('Expected Signature:', expectedSign);
  
//         // Verify signature
//         if (razorpay_signature !== expectedSign) {
//           return res.status(400).json({ 
//             error: 'Invalid payment signature',
//             details: {
//               received: razorpay_signature,
//               expected: expectedSign
//             }
//           });
//         }
//       }
  
//       // Extract order details
//       const { userId, cartId, paymentMethod, productType } = razorpayOrder.notes;
  
//       // Get cart and create order (existing logic)
//       const cart = await Cart.findById(cartId).populate('products.product');
//       if (!cart) {
//         return res.status(400).json({ error: 'Cart not found' });
//       }
  
//       // Create order and payment records
//       const order = new Order({
//         user: userId,
//         products: cart.products.map(item => ({
//           product: item.product._id,
//           quantity: item.quantity,
//           price: item.product.discountedPrice || item.product.originalPrice
//         })),
//         totalAmount: razorpayOrder.amount / 100,
//         paymentMethod,
//         type: productType,
//         shippingAddress: req.user.customerDetails.address,
//         firmName: req.user.customerDetails.firmName,
//         gstNumber: req.user.customerDetails.gstNumber,
//         paymentStatus: 'completed',
//         orderStatus: 'processing'
//       });
  
//       await order.save();
  
//       const payment = new Payment({
//         user: userId,
//         amount: razorpayOrder.amount / 100,
//         paymentIntentId: razorpay_payment_id,
//         status: 'completed'
//       });
//       await payment.save();
  
//       // Update product quantities
//       for (const item of cart.products) {
//         await Product.findByIdAndUpdate(
//           item.product._id,
//           { $inc: { quantity: -item.quantity } }
//         );
//       }
  
//       // Clear cart
//       await Cart.findByIdAndDelete(cartId);
  
//       res.json({
//         success: true,
//         orderId: order._id,
//         message: 'Payment verified and order created successfully'
//       });
  
//     } catch (error) {
//       console.error('Full Payment Verification Error:', error);
//       res.status(500).json({ 
//         error: 'Error verifying payment',
//         details: error.message
//       });
//     }
//   }
// };

// module.exports = paymentController;







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

const paymentController = {
   createOrder : async (req, res) => {
    try {
      const userId = req.user._id;
      const { paymentMethod } = req.body;

      if (req.isReceptionAccess) {
        console.log(`Order created by reception ${req.receptionUser._id} for user ${userId}`);
      }
  
      // Validate payment method
      const validPaymentMethods = ['UPI', 'netBanking', 'debitCard', 'COD'];
      if (!validPaymentMethods.includes(paymentMethod)) {
        return res.status(400).json({
          error: 'Invalid payment method',
          validMethods: validPaymentMethods
        });
      }
  
      // Validate user and check activity status
      const user = await User.findById(userId);
      if (!user?.customerDetails?.address) {
        return res.status(400).json({
          error: "No address found. Please update your profile with a valid address."
        });
      }
  
      // Check if user is currently inactive
      if (!user.isActive) {
        // Get user's activity history
        const userActivity = await UserActivity.findOne({ user: userId });
        if (userActivity) {
          const lastPeriod = userActivity.activityPeriods[userActivity.activityPeriods.length - 1];
          
          // If user has been inactive for more than 10 days
          if (lastPeriod && lastPeriod.status === 'inactive') {
            const inactiveDays = Math.ceil((new Date() - lastPeriod.startDate) / (1000 * 60 * 60 * 24));
            
            if (inactiveDays >= 30) {
              // Update user activity status
              lastPeriod.endDate = new Date();
              userActivity.activityPeriods.push({
                startDate: new Date(),
                status: 'active'
              });
              await userActivity.save();
  
              // Reactivate user
              user.isActive = true;
              await user.save();
  
              // Log the reactivation
              console.log(`User ${userId} reactivated after ${inactiveDays} days of inactivity due to new order`);
            }
          }
        }
      }
  
      // Get cart with populated product details
      const cart = await Cart.findOne({ user: userId }).populate("products.product");
      if (!cart || !cart.products.length) {
        return res.status(400).json({ error: "Cart is empty" });
      }
  
      // Validate products and calculate total
      const orderProducts = [];
      let totalAmount = 0;
      const productTypes = new Set();
  
      for (const item of cart.products) {
        const product = await Product.findById(item.product._id);
        
        if (!product || !product.isActive) {
          return res.status(400).json({ 
            error: `Product not found or inactive: ${item.product.name}` 
          });
        }
  
        if (product.quantity < item.quantity) {
          return res.status(400).json({
            error: `Not enough stock for ${product.name}`,
            availableStock: product.quantity,
            requestedQuantity: item.quantity
          });
        }
  
        const price = product.discountedPrice || product.originalPrice;
        totalAmount += price * item.quantity;
        
        orderProducts.push({
          product: product._id,
          quantity: item.quantity,
          price: price
        });
  
        productTypes.add(product.type);
      }
  
      // Handle COD orders
      if (paymentMethod === 'COD') {
        const order = new Order({
          user: userId,
          products: orderProducts,
          totalAmount,
          totalAmountWithDelivery: totalAmount,
          deliveryCharge: 0,
          paymentMethod: 'COD',
          type: [...productTypes][0],
          shippingAddress: user.customerDetails.address,
          firmName: user.customerDetails.firmName,
          gstNumber: user.customerDetails.gstNumber,
          paymentStatus: 'pending',
          orderStatus: 'pending',
          userStatus: user.isActive ? 'active' : 'inactive' // Add user status to order
        });
  
        await order.save();
  
        // Update product quantities and clear cart
        for (const item of orderProducts) {
          await Product.findByIdAndUpdate(
            item.product,
            { $inc: { quantity: -item.quantity } }
          );
        }
        await Cart.findByIdAndDelete(cart._id);
  
        return res.status(201).json({
          success: true,
          message: "COD order placed successfully",
          order
        });
      }
  
      // Handle online payments
      const receiptId = `rcpt_${Date.now().toString().slice(-8)}_${userId.toString().slice(-4)}`;
      
      const razorpayOrder = await razorpay.orders.create({
        amount: Math.round(totalAmount * 100),
        currency: 'INR',
        receipt: receiptId,
        payment_capture: 1,
        notes: {
          userId: userId.toString(),
          cartId: cart._id.toString(),
          paymentMethod,
          productType: [...productTypes][0],
          userStatus: user.isActive ? 'active' : 'inactive' // Add user status to payment notes
        }
      });
  
      res.status(200).json({
        success: true,
        orderId: razorpayOrder.id,
        amount: totalAmount,
        currency: 'INR',
        keyId: process.env.RAZORPAY_KEY_ID,
        cartDetails: {
          items: cart.products.length,
          total: totalAmount
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


  // verifyPayment : async (req, res) => {
  //   try {
  //     const {
  //       razorpay_order_id,
  //       razorpay_payment_id,
  //       razorpay_signature
  //     } = req.body;
  
  //     // Fetch the order details from Razorpay
  //     const razorpayOrder = await razorpay.orders.fetch(razorpay_order_id);
  
  //     // Verify payment signature or status
  //     if (!razorpay_signature) {
  //       try {
  //         const payment = await razorpay.payments.fetch(razorpay_payment_id);
  //         if (payment.order_id !== razorpay_order_id || payment.status !== 'captured') {
  //           return res.status(400).json({ 
  //             error: 'Payment verification failed',
  //             details: 'Invalid payment or order status'
  //           });
  //         }
  //       } catch (apiVerificationError) {
  //         console.error('Razorpay API Verification Error:', apiVerificationError);
  //         return res.status(400).json({ 
  //           error: 'Payment verification failed',
  //           details: apiVerificationError.message
  //         });
  //       }
  //     } else {
  //       const sign = razorpay_order_id + '|' + razorpay_payment_id;
  //       const expectedSign = crypto
  //         .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
  //         .update(sign)
  //         .digest('hex');
  
  //       if (razorpay_signature !== expectedSign) {
  //         return res.status(400).json({ 
  //           error: 'Invalid payment signature'
  //         });
  //       }
  //     }
  
  //     // Extract order details
  //     const { userId, cartId, paymentMethod, productType } = razorpayOrder.notes;
  
  //     // Get user and check activity status
  //     const user = await User.findById(userId);
  //     const userActivity = await UserActivity.findOne({ user: userId });
      
  //     let userActivityStatus = user.isActive ? 'active' : 'inactive';
  //     let inactiveDays = 0;
  //     let wasReactivated = false;
  
  //     // Calculate inactive days if user is inactive
  //     if (!user.isActive && userActivity) {
  //       const lastPeriod = userActivity.activityPeriods[userActivity.activityPeriods.length - 1];
  //       if (lastPeriod && lastPeriod.status === 'inactive') {
  //         inactiveDays = Math.ceil((new Date() - lastPeriod.startDate) / (1000 * 60 * 60 * 24));
          
  //         // Check if user should be reactivated
  //         if (inactiveDays >= 10) {
  //           // Update activity record
  //           lastPeriod.endDate = new Date();
  //           userActivity.activityPeriods.push({
  //             startDate: new Date(),
  //             status: 'active'
  //           });
  //           await userActivity.save();
  
  //           // Reactivate user
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
  //       return res.status(400).json({ error: 'Cart not found' });
  //     }
  
  //     // Create order with activity status
  //     const order = new Order({
  //       user: userId,
  //       products: cart.products.map(item => ({
  //         product: item.product._id,
  //         quantity: item.quantity,
  //         price: item.product.discountedPrice || item.product.originalPrice
  //       })),
  //       totalAmount: razorpayOrder.amount / 100,
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
  
  //     // Create payment record with activity status
  //     const payment = new Payment({
  //       user: userId,
  //       amount: razorpayOrder.amount / 100,
  //       paymentIntentId: razorpay_payment_id,
  //       status: 'completed',
  //       userActivityStatus,
  //       orderDetails: order._id
  //     });
  //     await payment.save();
  
  //     // Update product quantities
  //     for (const item of cart.products) {
  //       await Product.findByIdAndUpdate(
  //         item.product._id,
  //         { $inc: { quantity: -item.quantity } }
  //       );
  //     }
  
  //     // Clear cart
  //     await Cart.findByIdAndDelete(cartId);
  
  //     res.json({
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
  //     console.error('Full Payment Verification Error:', error);
  //     res.status(500).json({ 
  //       error: 'Error verifying payment',
  //       details: error.message
  //     });
  //   }
  // }
 


  verifyPayment: async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        } = req.body;

        // First verify the payment signature
        const sign = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSign = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(sign)
            .digest('hex');

        if (razorpay_signature !== expectedSign) {
            return res.status(400).json({ 
                error: 'Invalid payment signature',
                success: false
            });
        }

        // Fetch the payment details from Razorpay
        const payment = await razorpay.payments.fetch(razorpay_payment_id);
        
        // Fetch the order details from Razorpay
        const razorpayOrder = await razorpay.orders.fetch(razorpay_order_id);

        // Comprehensive payment verification
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

        // Verify payment amount matches order amount
        if (payment.amount !== razorpayOrder.amount) {
            return res.status(400).json({ 
                error: 'Payment amount mismatch',
                success: false
            });
        }

        // Extract order details from Razorpay order notes
        const { userId, cartId, paymentMethod, productType } = razorpayOrder.notes;

        // Get user and check activity status
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

        // Calculate inactive days if user is inactive
        if (!user.isActive && userActivity) {
            const lastPeriod = userActivity.activityPeriods[userActivity.activityPeriods.length - 1];
            if (lastPeriod && lastPeriod.status === 'inactive') {
                inactiveDays = Math.ceil((new Date() - lastPeriod.startDate) / (1000 * 60 * 60 * 24));
                
                // Check if user should be reactivated
                if (inactiveDays >= 10) {
                    // Update activity record
                    lastPeriod.endDate = new Date();
                    userActivity.activityPeriods.push({
                        startDate: new Date(),
                        status: 'active'
                    });
                    await userActivity.save();

                    // Reactivate user
                    user.isActive = true;
                    await user.save();
                    
                    userActivityStatus = 'active';
                    wasReactivated = true;
                }
            }
        }

        // Get cart and create order
        const cart = await Cart.findById(cartId).populate('products.product');
        if (!cart) {
            return res.status(400).json({ 
                error: 'Cart not found',
                success: false
            });
        }

        // Create order with activity status
        const order = new Order({
            user: userId,
            products: cart.products.map(item => ({
                product: item.product._id,
                quantity: item.quantity,
                price: item.product.discountedPrice || item.product.originalPrice
            })),
            totalAmount: razorpayOrder.amount / 100,
            paymentMethod,
            type: productType,
            shippingAddress: user.customerDetails.address,
            firmName: user.customerDetails.firmName,
            gstNumber: user.customerDetails.gstNumber,
            paymentStatus: 'completed',
            orderStatus: 'processing',
            userActivityStatus,
            inactiveDays,
            reactivatedWithOrder: wasReactivated
        });

        await order.save();

        // Create payment record with activity status
        const paymentRecord = new Payment({
            user: userId,
            amount: razorpayOrder.amount / 100,
            paymentIntentId: razorpay_payment_id,
            status: 'completed',
            userActivityStatus,
            orderDetails: order._id
        });
        await paymentRecord.save();

        // Update product quantities
        for (const item of cart.products) {
            await Product.findByIdAndUpdate(
                item.product._id,
                { $inc: { quantity: -item.quantity } }
            );
        }

        // Clear cart
        await Cart.findByIdAndDelete(cartId);

        // Send success response
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