// const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
// const Payment = require('../models/Payment');
// const Cart = require('../models/Cart');
// const Order = require('../models/Order');
// const User = require('../models/User'); // Add this to get user's default address

// const paymentController = {
//   createPaymentIntent: async (req, res) => {
//     try {
//       const userId = req.user._id;
      
//       // Get cart details with populated product information
//       const cart = await Cart.findOne({ user: userId }).populate({
//         path: 'products.product',
//         select: 'originalPrice discountedPrice quantity'
//       });

//       if (!cart || cart.products.length === 0) {
//         return res.status(400).json({ error: 'Cart is empty' });
//       }

//       // Calculate total amount with validation
//       let totalAmount = 0;
//       for (const item of cart.products) {
//         const product = item.product;

//         // Validate product exists and has required price fields
//         if (!product || typeof product.originalPrice !== 'number') {
//           return res.status(400).json({ 
//             error: 'Invalid product data in cart',
//             productId: item.product?._id,
//             details: 'Missing required price information'
//           });
//         }

//         // Check product stock
//         if (product.quantity < item.quantity) {
//           return res.status(400).json({ 
//             error: 'Insufficient stock',
//             productId: product._id,
//             availableQuantity: product.quantity,
//             requestedQuantity: item.quantity
//           });
//         }

//         // Calculate price (use discounted price if available, otherwise original price)
//         const price = (product.discountedPrice && product.discountedPrice < product.originalPrice) 
//           ? product.discountedPrice 
//           : product.originalPrice;

//         if (isNaN(price) || isNaN(item.quantity)) {
//           return res.status(400).json({ 
//             error: 'Invalid price or quantity',
//             product: product._id,
//             price: price,
//             quantity: item.quantity
//           });
//         }

//         totalAmount += price * item.quantity;
//       }

//       // Validate total amount
//       if (isNaN(totalAmount) || totalAmount <= 0) {
//         return res.status(400).json({ 
//           error: 'Invalid total amount', 
//           totalAmount 
//         });
//       }

//       const amountInSmallestUnit = Math.round(totalAmount * 100);

//       // Create payment intent with Stripe
//       const paymentIntent = await stripe.paymentIntents.create({
//         amount: amountInSmallestUnit,
//         currency: 'inr',
//         metadata: {
//           userId: userId.toString(),
//           cartId: cart._id.toString()
//         }
//       });

//       res.json({
//         clientSecret: paymentIntent.client_secret,
//         totalAmount,
//         amountInSmallestUnit
//       });

//     } catch (error) {
//       console.error('Payment Intent Error:', error);
//       res.status(500).json({ 
//         error: 'Error creating payment intent',
//         details: error.message 
//       });
//     }
//   },

//   handlePaymentWebhook: async (req, res) => {
//     const sig = req.headers['stripe-signature'];
//     let event;

//     try {
//       event = stripe.webhooks.constructEvent(
//         req.body,
//         sig,
//         process.env.STRIPE_WEBHOOK_SECRET
//       );
//     } catch (err) {
//       return res.status(400).json({ error: err.message });
//     }

//     if (event.type === 'payment_intent.succeeded') {
//       const paymentIntent = event.data.object;
//       await handleSuccessfulPayment(paymentIntent);
//     }

//     res.json({ received: true });
//   }
// };

// async function handleSuccessfulPayment(paymentIntent) {
//   const { userId, cartId } = paymentIntent.metadata;
  
//   try {
//     // Get user's default shipping address
//     const user = await User.findById(userId).populate('defaultAddress');
//     if (!user || !user.defaultAddress) {
//       throw new Error('No shipping address found for user');
//     }

//     // Create payment record
//     const payment = new Payment({
//       user: userId,
//       amount: paymentIntent.amount / 100,
//       paymentIntentId: paymentIntent.id,
//       status: 'completed'
//     });
//     await payment.save();

//     // Get cart with populated product information
//     const cart = await Cart.findById(cartId).populate('products.product');
    
//     // Calculate prices and create order products array
//     const orderProducts = cart.products.map(item => {
//       // Explicitly calculate the price
//       const price = (item.product.discountedPrice && item.product.discountedPrice < item.product.originalPrice)
//         ? item.product.discountedPrice
//         : item.product.originalPrice;

//       if (!price || isNaN(price)) {
//         throw new Error(`Invalid price for product ${item.product._id}`);
//       }

//       return {
//         product: item.product._id,
//         quantity: item.quantity,
//         price: price // Explicitly set the price
//       };
//     });

//     // Calculate total amount
//     const totalAmount = orderProducts.reduce((total, item) => {
//       return total + (item.price * item.quantity);
//     }, 0);

//     // Create order with all required fields
//     const order = new Order({
//       user: userId,
//       products: orderProducts,
//       totalAmount: totalAmount,
//       paymentMethod: 'Debit Card', // Or get this from paymentIntent metadata
//       paymentStatus: 'completed',
//       shippingAddress: user.defaultAddress._id,
//       orderStatus: 'processing'
//     });
//     await order.save();

//     // Update product quantities
//     for (const item of cart.products) {
//       await Product.findByIdAndUpdate(item.product._id, {
//         $inc: { quantity: -item.quantity }
//       });
//     }

//     // Clear cart
//     await Cart.findByIdAndDelete(cartId);
//   } catch (error) {
//     console.error('Error in handleSuccessfulPayment:', error);
//     // Implement error handling, retry logic, or notification system here
//     throw error; // Re-throw to be handled by the webhook handler
//   }
// }

// module.exports = paymentController;
const Razorpay = require('razorpay');
const Payment = require('../models/Payment');
const Cart = require('../models/Cart');
const Order = require('../models/Order');
const User = require('../models/User');
const Product = require('../models/Product');
const crypto = require('crypto');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

const paymentController = {
  createOrder: async (req, res) => {
    try {
      const userId = req.user._id;
      const { paymentMethod } = req.body;

      // Validate payment method
      const validPaymentMethods = ['UPI', 'netBanking', 'debitCard', 'COD'];
      if (!validPaymentMethods.includes(paymentMethod)) {
        return res.status(400).json({
          error: 'Invalid payment method',
          validMethods: validPaymentMethods
        });
      }

      // Validate user and address
      const user = await User.findById(userId);
      if (!user?.customerDetails?.address) {
        return res.status(400).json({
          error: "No address found. Please update your profile with a valid address."
        });
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
          totalAmountWithDelivery: totalAmount, // Add this line
          deliveryCharge: 0, // Add this line to explicitly set delivery charge to 0
          paymentMethod: 'COD',
          type: [...productTypes][0],
          shippingAddress: user.customerDetails.address,
          firmName: user.customerDetails.firmName,
          gstNumber: user.customerDetails.gstNumber,
          paymentStatus: 'pending',
          orderStatus: 'pending'
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
          productType: [...productTypes][0]
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
          phone: user.phoneNumber
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
      console.log('Payment Verification Request Body:', req.body);
      const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
      } = req.body;

      // Validate signature
      const sign = razorpay_order_id + '|' + razorpay_payment_id;
      const expectedSign = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(sign)
        .digest('hex');

      if (razorpay_signature !== expectedSign) {
        return res.status(400).json({ error: 'Invalid payment signature' });
      }

      const razorpayOrder = await razorpay.orders.fetch(razorpay_order_id);
      const { userId, cartId, paymentMethod, productType } = razorpayOrder.notes;

      // Get cart and create order
      const cart = await Cart.findById(cartId).populate('products.product');
      if (!cart) {
        return res.status(400).json({ error: 'Cart not found' });
      }

      // Create order and payment records
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
        shippingAddress: req.user.customerDetails.address,
        firmName: req.user.customerDetails.firmName,
        gstNumber: req.user.customerDetails.gstNumber,
        paymentStatus: 'completed',
        orderStatus: 'processing'
      });

      await order.save();

      const payment = new Payment({
        user: userId,
        amount: razorpayOrder.amount / 100,
        paymentIntentId: razorpay_payment_id,
        status: 'completed'
      });
      await payment.save();

      // Update product quantities
      for (const item of cart.products) {
        await Product.findByIdAndUpdate(
          item.product._id,
          { $inc: { quantity: -item.quantity } }
        );
      }

      // Clear cart
      await Cart.findByIdAndDelete(cartId);

      res.json({
        success: true,
        orderId: order._id,
        message: 'Payment verified and order created successfully'
      });
    } catch (error) {
      console.error('Full Payment Verification Error:', error);
      res.status(500).json({ 
        error: 'Error verifying payment',
        details: error.message,
        fullError: error
      });
    }}
};

module.exports = paymentController;