const Product = require("../models/Product");
const Order = require("../models/Order");
const User = require("../models/User");
const Cart = require("../models/Cart");

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

  // createOrder: async (req, res) => {
  //   try {
  //     const userId = req.user._id;
  //     const { paymentMethod } = req.body;

  //     // 1. Validate user and address
  //     const user = await User.findById(userId);
  //     if (!user?.customerDetails?.address) {
  //       return res.status(400).json({
  //         error:
  //           "No address found. Please update your profile with a valid address.",
  //       });
  //     }

  //     // 2. Get cart with populated product details
  //     const cart = await Cart.findOne({ user: userId }).populate(
  //       "products.product"
  //     );

  //     if (!cart || !cart.products.length) {
  //       return res.status(400).json({ error: "Cart is empty" });
  //     }

  //     // 3. Validate stock for all products with detailed error messages
  //     for (const cartItem of cart.products) {
  //       const product = await Product.findById(cartItem.product._id);

  //       if (!product) {
  //         return res.status(400).json({
  //           error: `Product not found: ${cartItem.product._id}`,
  //         });
  //       }

  //       if (product.quantity < cartItem.quantity) {
  //         return res.status(400).json({
  //           error: `Not enough stock for ${product.name}`,
  //           product: product.name,
  //           availableStock: product.quantity,
  //           requestedQuantity: cartItem.quantity,
  //         });
  //       }
  //     }

  //     // 4. Calculate prices and create order products array
  //     const orderProducts = cart.products.map((item) => {
  //       const currentPrice =
  //         item.product.discountedPrice &&
  //         item.product.discountedPrice < item.product.originalPrice
  //           ? item.product.discountedPrice
  //           : item.product.originalPrice;

  //       return {
  //         product: item.product._id,
  //         quantity: item.quantity,
  //         price: currentPrice,
  //       };
  //     });

  //     // 5. Calculate total amount
  //     const totalAmount = orderProducts.reduce((total, item) => {
  //       return total + item.price * item.quantity;
  //     }, 0);

  //     // 6. Create the order - Now explicitly setting status to 'pending'
  //     const order = new Order({
  //       user: userId,
  //       products: orderProducts,
  //       totalAmount,
  //       paymentMethod,
  //       shippingAddress: user.customerDetails.address,
  //       firmName: user.customerDetails.firmName,
  //       gstNumber: user.customerDetails.gstNumber,
  //       paymentStatus: paymentMethod === "COD" ? "pending" : "completed",
  //       orderStatus: "pending", // Explicitly set to pending
  //       statusHistory: [
  //         {
  //           // Initialize status history
  //           status: "pending",
  //           updatedBy: userId,
  //           updatedAt: new Date(),
  //         },
  //       ],
  //     });

  //     await order.save();

  //     // 7. Update product quantities and clear cart
  //     for (const item of cart.products) {
  //       await Product.findByIdAndUpdate(
  //         item.product._id,
  //         { $inc: { quantity: -item.quantity } },
  //         { new: true }
  //       );
  //     }

  //     await Cart.findByIdAndDelete(cart._id);

  //     res.status(201).json({
  //       message:
  //         "Order created successfully and is pending for reception review",
  //       order,
  //       nextStep:
  //         "Your order is pending and will be processed by our reception team.",
  //     });
  //   } catch (error) {
  //     console.error("Order creation error:", error);
  //     res.status(500).json({
  //       error: "Error creating order",
  //       details: error.message,
  //     });
  //   }
  // },


  createOrder: async (req, res) => {
    try {
      const userId = req.user._id;
      const { paymentMethod } = req.body;

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

      // Validate stock and ensure products are of the same type
      const productTypes = new Set();
      for (const cartItem of cart.products) {
        const product = await Product.findById(cartItem.product._id);

        if (!product) {
          return res.status(400).json({ error: `Product not found: ${cartItem.product._id}` });
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

      if (productTypes.size > 1) {
        return res.status(400).json({
          error: "Cart contains products of multiple types. Please order one type at a time.",
        });
      }

      const [orderType] = productTypes;

      // Calculate prices and create order products array
      const orderProducts = cart.products.map((item) => {
        const currentPrice =
          item.product.discountedPrice && item.product.discountedPrice < item.product.originalPrice
            ? item.product.discountedPrice
            : item.product.originalPrice;

        return {
          product: item.product._id,
          quantity: item.quantity,
          price: currentPrice,
        };
      });

      // Calculate total amount
      const totalAmount = orderProducts.reduce((total, item) => {
        return total + item.price * item.quantity;
      }, 0);

      // Create the order
      const order = new Order({
        user: userId,
        products: orderProducts,
        totalAmount,
        paymentMethod,
        type: orderType, // Set the order type
        shippingAddress: user.customerDetails.address,
        firmName: user.customerDetails.firmName,
        gstNumber: user.customerDetails.gstNumber,
        paymentStatus: paymentMethod === "COD" ? "pending" : "completed",
        orderStatus: "pending",
        statusHistory: [
          {
            status: "pending",
            updatedBy: userId,
            updatedAt: new Date(),
          },
        ],
      });

      await order.save();

      // Update product quantities and clear cart
      for (const item of cart.products) {
        await Product.findByIdAndUpdate(
          item.product._id,
          { $inc: { quantity: -item.quantity } },
          { new: true }
        );
      }

      await Cart.findByIdAndDelete(cart._id);

      res.status(201).json({
        message: "Order created successfully.",
        order,
      });
    } catch (error) {
      console.error("Order creation error:", error);
      res.status(500).json({ error: "Error creating order", details: error.message });
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
