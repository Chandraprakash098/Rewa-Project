const Product = require("../models/Product");
const Order = require("../models/Order");
const User = require("../models/User");
const Cart = require("../models/Cart");
const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

const userController = {
  getAllProducts: async (req, res) => {
    try {
      const { type, category } = req.query;
      let query = { isActive: true };

      if (type) {
        query.type = type;

        if (category) {
          const validCategories = Product.getCategoriesByType(type);
          if (!validCategories.includes(category)) {
            return res
              .status(400)
              .json({ error: "Invalid category for the selected type" });
          }
          query.category = category;
        }
      }

      const products = await Product.find(query);
      res.json({ products });
    } catch (error) {
      res.status(500).json({ error: "Error fetching products" });
    }
  },

  getOffers: async (req, res) => {
    try {
      const offers = await Product.find({
        isActive: true,
        discountedPrice: { $exists: true, $ne: null },
        $expr: { $lt: ["$discountedPrice", "$originalPrice"] },
      });

      res.json({
        offers: offers.map((offer) => ({
          ...offer.toJSON(),
          discountTag: `${offer.discountPercentage}% OFF`,
        })),
      });
    } catch (error) {
      res.status(500).json({ error: "Error fetching offers" });
    }
  },



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
          error: "No address found. Please update your profile with a valid address.",
        });
      }

      // Get cart with populated product details
      const cart = await Cart.findOne({ user: userId }).populate("products.product");
      if (!cart || !cart.products.length) {
        return res.status(400).json({ error: "Cart is empty" });
      }

      // Validate stock and ensure products are active
      const productTypes = new Set();
      for (const cartItem of cart.products) {
        const product = await Product.findById(cartItem.product._id);

        if (!product || !product.isActive) {
          return res.status(400).json({ 
            error: `Product not found or inactive: ${cartItem.product.name}` 
          });
        }

        if (product.quantity < cartItem.quantity) {
          return res.status(400).json({
            error: `Not enough stock for ${product.name}`,
            product: product.name,
            availableStock: product.quantity,
            requestedQuantity: cartItem.quantity,
          });
        }

        productTypes.add(product.type);
      }

      // Calculate order details
      const orderProducts = cart.products.map((item) => {
        const currentPrice = item.product.discountedPrice && 
          item.product.discountedPrice < item.product.originalPrice
          ? item.product.discountedPrice 
          : item.product.originalPrice;

        return {
          product: item.product._id,
          quantity: item.quantity,
          price: currentPrice,
        };
      });

      const totalAmount = orderProducts.reduce((total, item) => {
        return total + item.price * item.quantity;
      }, 0);

      // Handle COD orders directly
      if (paymentMethod === 'COD') {
        const order = new Order({
          user: userId,
          products: orderProducts,
          totalAmount,
          paymentMethod: 'COD',
          type: [...productTypes][0], // Get the first product type
          shippingAddress: user.customerDetails.address,
          firmName: user.customerDetails.firmName,
          gstNumber: user.customerDetails.gstNumber,
          paymentStatus: 'pending',
          orderStatus: 'pending',
          statusHistory: [{
            status: 'pending',
            updatedBy: userId,
            updatedAt: new Date()
          }]
        });

        await order.save();

        // Update product quantities
        for (const item of cart.products) {
          await Product.findByIdAndUpdate(
            item.product._id,
            { $inc: { quantity: -item.quantity } }
          );
        }

        // Clear cart
        await Cart.findByIdAndDelete(cart._id);

        return res.status(201).json({
          success: true,
          message: "COD order placed successfully",
          order
        });
      }

      // Handle online payment methods
      // Generate a shorter receipt ID (max 40 chars)
      const timestamp = Date.now().toString().slice(-8);
      const shortUserId = userId.toString().slice(-4);
      const receiptId = `rcpt_${timestamp}_${shortUserId}`;
      
      // Create Razorpay order
      const razorpayOrder = await razorpay.orders.create({
        amount: Math.round(totalAmount * 100), // Convert to paise
        currency: 'INR',
        receipt: receiptId,
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

  getOrderHistory: async (req, res) => {
    try {
      const orders = await Order.find({ user: req.user._id })
        .populate("products.product", "name price image")
        .sort({ createdAt: -1 });
      res.json({ orders });
    } catch (error) {
      res.status(500).json({ error: "Error fetching order history" });
    }
  },

  // Profile Management
  updateProfile: async (req, res) => {
    try {
      const updates = {
        name: req.body.name,
        phoneNumber: req.body.phoneNumber,
        "customerDetails.firmName": req.body.firmName,
        "customerDetails.gstNumber": req.body.gstNumber,
        "customerDetails.panNumber": req.body.panNumber,
        "customerDetails.address": req.body.address,
      };

      // Remove undefined values
      Object.keys(updates).forEach(
        (key) => updates[key] === undefined && delete updates[key]
      );

      const user = await User.findByIdAndUpdate(req.user._id, updates, {
        new: true,
      }).select("-password");

      res.json({ user });
    } catch (error) {
      res.status(500).json({ error: "Error updating profile" });
    }
  },

  changePassword: async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const user = await User.findById(req.user._id);

      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({ error: "Current password is incorrect" });
      }

      user.password = newPassword;
      await user.save();

      res.json({ message: "Password updated successfully" });
    } catch (error) {
      res.status(500).json({ error: "Error changing password" });
    }
  },

  // Add this to userController:
  getProfile: async (req, res) => {
    try {
      // Find user by ID and exclude password field
      const user = await User.findById(req.user._id).select("-password");

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({
        user: {
          name: user.name,
          email: user.email,
          phoneNumber: user.phoneNumber,
          customerDetails: {
            firmName: user.customerDetails?.firmName,
            gstNumber: user.customerDetails?.gstNumber,
            panNumber: user.customerDetails?.panNumber,
            address: user.customerDetails?.address,
          },
          createdAt: user.createdAt,
        },
      });
    } catch (error) {
      res.status(500).json({ error: "Error fetching profile" });
    }
  },
};

module.exports = userController;
