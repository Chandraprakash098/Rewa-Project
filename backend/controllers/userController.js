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


//   getAllProducts: async (req, res) => {
//     try {
//         const { type, category } = req.query;
//         let query = { isActive: true };

//         if (type) {
//             query.type = type;

//             if (category) {
//                 const validCategories = Product.getCategoriesByType(type);
//                 if (!validCategories.includes(category)) {
//                     return res.status(400).json({ 
//                         error: "Invalid category for the selected type" 
//                     });
//                 }
//                 query.category = category;
//             }
//         }

//         // For users, exclude stockRemarks and only select necessary fields
//         const products = await Product.find(query)
//             .select('-stockRemarks')
//             .lean();

//         // Format the response for users (only basic product information)
//         const formattedProducts = products.map(product => {
//             const { 
//                 _id, 
//                 name, 
//                 type, 
//                 category, 
//                 description, 
//                 originalPrice, 
//                 discountedPrice,
//                 quantity,
//                 image,
//                 validFrom,
//                 validTo,
//                 isActive,
//                 createdAt
//             } = product;

//             return {
//                 _id,
//                 name,
//                 type,
//                 category,
//                 description,
//                 originalPrice,
//                 discountedPrice,
//                 quantity,
//                 image,
//                 validFrom,
//                 validTo,
//                 isActive,
//                 createdAt,
//                 // Include virtual fields if needed
//                 price: product.price,
//                 discountTag: product.discountTag,
//                 offerEndsIn: product.offerEndsIn,
//                 isOffer: product.isOffer
//             };
//         });

//         res.json({ products: formattedProducts });
//     } catch (error) {
//         console.error('Error in user getAllProducts:', error);
//         res.status(500).json({ error: "Error fetching products" });
//     }
// },

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

      return {
        _id: product._id,
        name: product.name,
        type: product.type,
        category: product.category,
        description: product.description,
        originalPrice: product.originalPrice,
        price: isOfferValid ? product.discountedPrice : product.originalPrice,
        quantity: product.quantity,
        image: product.image,
        validFrom: product.validFrom,
        validTo: product.validTo,
        isActive: product.isActive,
        createdAt: product.createdAt,
        ...(isOfferValid && {
          discountedPrice: product.discountedPrice,
          discountTag: `${Math.round(((product.originalPrice - product.discountedPrice) / product.originalPrice) * 100)}% OFF`,
          offerEndsIn: product.validTo,
          isOffer: true
        })
      };
    });

    res.json({ products: formattedProducts });
  } catch (error) {
    console.error('Error in user getAllProducts:', error);
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
};

module.exports = userController;
