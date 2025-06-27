const Product = require("../models/Product");
const Order = require("../models/Order");
const User = require("../models/User");
const Cart = require("../models/Cart");
const Razorpay = require('razorpay');
const crypto = require('crypto');
const Banner = require("../models/Banner");
const Payment= require("../models/Payment");

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
          return res.status(400).json({ error: "Invalid category for the selected type" });
        }
        query.category = category;
      }
    }

    const products = await Product.find(query)
      .select('-stockRemarks')
      .lean();

    const formattedProducts = products.map(product => {
      const now = new Date();
      const isOfferValid = product.discountedPrice &&
                          product.validFrom &&
                          product.validTo &&
                          now >= product.validFrom &&
                          now <= product.validTo;

      const baseProduct = {
        _id: product._id,
        name: product.name,
        type: product.type,
        category: product.category,
        description: product.description,
        originalPrice: product.originalPrice, // Price per box
        price: isOfferValid ? product.discountedPrice : product.originalPrice,
        boxes: product.boxes, // Changed from quantity
        bottlesPerBox: product.bottlesPerBox,
        image: product.image,
        validFrom: product.validFrom,
        validTo: product.validTo,
        isActive: product.isActive,
        createdAt: product.createdAt
      };

      if (isOfferValid) {
        return {
          ...baseProduct,
          discountedPrice: product.discountedPrice,
          discountPercentage: Math.round(((product.originalPrice - product.discountedPrice) / product.originalPrice) * 100),
          discountTag: `${Math.round(((product.originalPrice - product.discountedPrice) / product.originalPrice) * 100)}% OFF`,
          offerEndsIn: product.validTo,
          isOffer: true
        };
      }

      return baseProduct;
    });

    res.json({ products: formattedProducts });
  } catch (error) {
    console.error('Error in user getAllProducts:', error);
    res.status(500).json({ error: "Error fetching products" });
  }
},


  

  getOffers: async (req, res) => {
    try {
      const now = new Date();
      const offers = await Product.find({
        isActive: true,
        discountedPrice: { $exists: true, $ne: null },
        $expr: { $lt: ["$discountedPrice", "$originalPrice"] },
        validFrom: { $lte: now },
        validTo: { $gte: now }
      }).lean();

      const formattedOffers = offers.map(offer => {
        const discountPercentage = Math.round(((offer.originalPrice - offer.discountedPrice) / offer.originalPrice) * 100);
        return {
          ...offer,
          discountTag: `${discountPercentage}% OFF`,
          discountPercentage,
          boxes: offer.boxes, // Changed from quantity
          bottlesPerBox: offer.bottlesPerBox
        };
      });

      res.json({ offers: formattedOffers });
    } catch (error) {
      res.status(500).json({ error: "Error fetching offers" });
    }
  },

  // getOrderHistory: async (req, res) => {
  //   try {
  //     const orders = await Order.find({ user: req.user._id })
  //       .populate("products.product", "name price image")
  //       .sort({ createdAt: -1 });
  //     res.json({ orders });
  //   } catch (error) {
  //     res.status(500).json({ error: "Error fetching order history" });
  //   }
  // },


  getOrderHistory: async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .populate("products.product", "name price image")
      .sort({ createdAt: -1 })
      .lean(); // Use lean() for better performance

    // Fetch payment details for each order
    const ordersWithPayments = await Promise.all(
      orders.map(async (order) => {
        const payment = await Payment.findOne({ orderDetails: order._id })
          .populate('user', 'name email phoneNumber')
          .lean();
        return {
          ...order,
          paymentDetails: payment ? {
            _id: payment._id,
            user: payment.user,
            amount: payment.amount,
            paidAmount: payment.paidAmount,
            remainingAmount: payment.remainingAmount,
            status: payment.status,
            paymentHistory: payment.paymentHistory,
            orderDetails: payment.orderDetails,
            userActivityStatus: payment.userActivityStatus,
            createdAt: payment.createdAt
          } : null
        };
      })
    );

    res.json({ orders: ordersWithPayments });
  } catch (error) {
    console.error('Error fetching order history:', error);
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
            photo:user.customerDetails?.photo,
            address: user.customerDetails?.address,
          },
          createdAt: user.createdAt,
        },
      });
    } catch (error) {
      res.status(500).json({ error: "Error fetching profile" });
    }
  },

    // New method to get banners
    getBanners: async (req, res) => {
      try {
        const banners = await Banner.find({ isActive: true })
          .sort({ order: 1 }) // Sort by order for consistent display
          .select('image order');
        res.json({ banners });
      } catch (error) {
        console.error('Error fetching banners:', error);
        res.status(500).json({ error: 'Error fetching banners' });
      }
    }
};

module.exports = userController;


