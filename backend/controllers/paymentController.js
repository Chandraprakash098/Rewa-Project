const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Payment = require('../models/Payment');
const Cart = require('../models/Cart');
const Order = require('../models/Order');
const User = require('../models/User'); // Add this to get user's default address

const paymentController = {
  createPaymentIntent: async (req, res) => {
    try {
      const userId = req.user._id;
      
      // Get cart details with populated product information
      const cart = await Cart.findOne({ user: userId }).populate({
        path: 'products.product',
        select: 'originalPrice discountedPrice quantity'
      });

      if (!cart || cart.products.length === 0) {
        return res.status(400).json({ error: 'Cart is empty' });
      }

      // Calculate total amount with validation
      let totalAmount = 0;
      for (const item of cart.products) {
        const product = item.product;

        // Validate product exists and has required price fields
        if (!product || typeof product.originalPrice !== 'number') {
          return res.status(400).json({ 
            error: 'Invalid product data in cart',
            productId: item.product?._id,
            details: 'Missing required price information'
          });
        }

        // Check product stock
        if (product.quantity < item.quantity) {
          return res.status(400).json({ 
            error: 'Insufficient stock',
            productId: product._id,
            availableQuantity: product.quantity,
            requestedQuantity: item.quantity
          });
        }

        // Calculate price (use discounted price if available, otherwise original price)
        const price = (product.discountedPrice && product.discountedPrice < product.originalPrice) 
          ? product.discountedPrice 
          : product.originalPrice;

        if (isNaN(price) || isNaN(item.quantity)) {
          return res.status(400).json({ 
            error: 'Invalid price or quantity',
            product: product._id,
            price: price,
            quantity: item.quantity
          });
        }

        totalAmount += price * item.quantity;
      }

      // Validate total amount
      if (isNaN(totalAmount) || totalAmount <= 0) {
        return res.status(400).json({ 
          error: 'Invalid total amount', 
          totalAmount 
        });
      }

      const amountInSmallestUnit = Math.round(totalAmount * 100);

      // Create payment intent with Stripe
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInSmallestUnit,
        currency: 'inr',
        metadata: {
          userId: userId.toString(),
          cartId: cart._id.toString()
        }
      });

      res.json({
        clientSecret: paymentIntent.client_secret,
        totalAmount,
        amountInSmallestUnit
      });

    } catch (error) {
      console.error('Payment Intent Error:', error);
      res.status(500).json({ 
        error: 'Error creating payment intent',
        details: error.message 
      });
    }
  },

  handlePaymentWebhook: async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      await handleSuccessfulPayment(paymentIntent);
    }

    res.json({ received: true });
  }
};

async function handleSuccessfulPayment(paymentIntent) {
  const { userId, cartId } = paymentIntent.metadata;
  
  try {
    // Get user's default shipping address
    const user = await User.findById(userId).populate('defaultAddress');
    if (!user || !user.defaultAddress) {
      throw new Error('No shipping address found for user');
    }

    // Create payment record
    const payment = new Payment({
      user: userId,
      amount: paymentIntent.amount / 100,
      paymentIntentId: paymentIntent.id,
      status: 'completed'
    });
    await payment.save();

    // Get cart with populated product information
    const cart = await Cart.findById(cartId).populate('products.product');
    
    // Calculate prices and create order products array
    const orderProducts = cart.products.map(item => {
      // Explicitly calculate the price
      const price = (item.product.discountedPrice && item.product.discountedPrice < item.product.originalPrice)
        ? item.product.discountedPrice
        : item.product.originalPrice;

      if (!price || isNaN(price)) {
        throw new Error(`Invalid price for product ${item.product._id}`);
      }

      return {
        product: item.product._id,
        quantity: item.quantity,
        price: price // Explicitly set the price
      };
    });

    // Calculate total amount
    const totalAmount = orderProducts.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);

    // Create order with all required fields
    const order = new Order({
      user: userId,
      products: orderProducts,
      totalAmount: totalAmount,
      paymentMethod: 'Debit Card', // Or get this from paymentIntent metadata
      paymentStatus: 'completed',
      shippingAddress: user.defaultAddress._id,
      orderStatus: 'processing'
    });
    await order.save();

    // Update product quantities
    for (const item of cart.products) {
      await Product.findByIdAndUpdate(item.product._id, {
        $inc: { quantity: -item.quantity }
      });
    }

    // Clear cart
    await Cart.findByIdAndDelete(cartId);
  } catch (error) {
    console.error('Error in handleSuccessfulPayment:', error);
    // Implement error handling, retry logic, or notification system here
    throw error; // Re-throw to be handled by the webhook handler
  }
}

module.exports = paymentController;

// const Razorpay = require('razorpay');
// const Payment = require('../models/Payment');
// const Cart = require('../models/Cart');
// const Order = require('../models/Order');
// const crypto = require('crypto');

// // Initialize Razorpay
// const razorpay = new Razorpay({
//   key_id: process.env.RAZORPAY_KEY_ID,
//   key_secret: process.env.RAZORPAY_KEY_SECRET
// });

// const paymentController = {
//   // Create order for online payment methods
//   createRazorpayOrder: async (req, res) => {
//     try {
//       const userId = req.user._id;
//       const { paymentMethod } = req.body;

//       // Validate payment method
//       const validPaymentMethods = ['UPI', 'netBanking', 'debitCard', 'creditCard'];
//       if (!validPaymentMethods.includes(paymentMethod)) {
//         return res.status(400).json({ error: 'Invalid payment method' });
//       }

//       // Fetch cart details
//       const cart = await Cart.findOne({ user: userId }).populate('products.product');
//       if (!cart || cart.products.length === 0) {
//         return res.status(400).json({ error: 'Cart is empty' });
//       }

//       // Calculate total amount
//       const totalAmount = cart.products.reduce((total, item) => {
//         const price = item.product.isOffer ? item.product.offerPrice : item.product.price;
//         return total + price * item.quantity;
//       }, 0);

//       if (totalAmount <= 0) {
//         return res.status(400).json({ error: 'Total amount must be greater than zero' });
//       }

//       // Create Razorpay order
//       const razorpayOrder = await razorpay.orders.create({
//         amount: Math.round(totalAmount * 100), // Convert to paise
//         currency: 'INR',
//         receipt: `order_${userId}_${Date.now()}`,
//         notes: {
//           userId: userId.toString(),
//           cartId: cart._id.toString(),
//           paymentMethod
//         }
//       });

//       res.json({
//         success: true,
//         orderId: razorpayOrder.id,
//         amount: totalAmount,
//         currency: 'INR',
//         keyId: process.env.RAZORPAY_KEY_ID
//       });
//     } catch (error) {
//       console.error('Razorpay Order Error:', error.message);
//       res.status(500).json({ error: 'Error creating payment order' });
//     }
//   },

//   // Create COD order
//   createCODOrder: async (req, res) => {
//     try {
//       const userId = req.user._id;

//       // Fetch cart details
//       const cart = await Cart.findOne({ user: userId }).populate('products.product');
//       if (!cart || cart.products.length === 0) {
//         return res.status(400).json({ error: 'Cart is empty' });
//       }

//       // Calculate total amount
//       const totalAmount = cart.products.reduce((total, item) => {
//         const price = item.product.isOffer ? item.product.offerPrice : item.product.price;
//         return total + price * item.quantity;
//       }, 0);

//       if (totalAmount <= 0) {
//         return res.status(400).json({ error: 'Total amount must be greater than zero' });
//       }

//       // Create order
//       const orderProducts = cart.products.map(item => ({
//         product: item.product._id,
//         quantity: item.quantity,
//         price: item.product.isOffer ? item.product.offerPrice : item.product.price
//       }));

//       const order = new Order({
//         user: userId,
//         products: orderProducts,
//         totalAmount,
//         paymentMethod: 'COD',
//         paymentStatus: 'pending',
//         status: 'processing'
//       });
//       await order.save();

//       // Clear cart
//       await Cart.findByIdAndDelete(cart._id);

//       res.json({
//         success: true,
//         orderId: order._id,
//         message: 'COD order created successfully'
//       });
//     } catch (error) {
//       console.error('COD Order Error:', error.message);
//       res.status(500).json({ error: 'Error creating COD order' });
//     }
//   },

//   // Verify payment signature
//   verifyPayment: async (req, res) => {
//     try {
//       const {
//         razorpay_order_id,
//         razorpay_payment_id,
//         razorpay_signature
//       } = req.body;

//       // Validate signature
//       const sign = razorpay_order_id + '|' + razorpay_payment_id;
//       const expectedSign = crypto
//         .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
//         .update(sign)
//         .digest('hex');

//       if (razorpay_signature !== expectedSign) {
//         return res.status(400).json({ error: 'Invalid payment signature' });
//       }

//       // Fetch Razorpay order details
//       const razorpayOrder = await razorpay.orders.fetch(razorpay_order_id);
//       const { userId, cartId, paymentMethod } = razorpayOrder.notes;

//       // Fetch cart
//       const cart = await Cart.findById(cartId).populate('products.product');
//       if (!cart) {
//         return res.status(400).json({ error: 'Cart not found' });
//       }

//       // Create payment record
//       const payment = new Payment({
//         user: userId,
//         amount: razorpayOrder.amount / 100,
//         paymentIntentId: razorpay_payment_id,
//         status: 'completed'
//       });
//       await payment.save();

//       // Create order
//       const orderProducts = cart.products.map(item => ({
//         product: item.product._id,
//         quantity: item.quantity,
//         price: item.product.isOffer ? item.product.offerPrice : item.product.price
//       }));

//       const order = new Order({
//         user: userId,
//         products: orderProducts,
//         totalAmount: razorpayOrder.amount / 100,
//         paymentMethod,
//         paymentStatus: 'completed',
//         status: 'processing'
//       });
//       await order.save();

//       // Clear cart
//       await Cart.findByIdAndDelete(cartId);

//       res.json({
//         success: true,
//         orderId: order._id,
//         message: 'Payment verified and order created successfully'
//       });
//     } catch (error) {
//       console.error('Payment Verification Error:', error.message);
//       res.status(500).json({ error: 'Error verifying payment' });
//     }
//   }
// };

// module.exports = paymentController;
