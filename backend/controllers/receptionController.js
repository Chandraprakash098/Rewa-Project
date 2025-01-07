const User = require('../models/User');
const Order = require('../models/Order');

const receptionController = {
  // User Management
  createCustomer: async (req, res) => {
    try {
      const {
        name,
        email,
        phoneNumber,
        password,
        firmName,
        gstNumber,
        panNumber,
        address
      } = req.body;

      // Check if email already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ error: 'Email already registered' });
      }

      const user = new User({
        name,
        email,
        phoneNumber,
        password,
        role: 'user',
        customerDetails: {
          firmName,
          gstNumber,
          panNumber,
          address
        }
      });

      if (req.file) {
        user.customerDetails.photo = req.file.path;
      }

      await user.save();

      // Remove password from response
      const userResponse = user.toObject();
      delete userResponse.password;

      res.status(201).json({ 
        message: 'Customer registered successfully',
        user: userResponse
      });
    } catch (error) {
      res.status(500).json({ error: 'Error creating customer' });
    }
  },

  // Order Management
  getCurrentOrders: async (req, res) => {
    try {
      const orders = await Order.find({
        status: { $in: ['pending', 'processing'] }
      })
      .populate('user', 'name customerDetails.firmName customerDetails.userCode')
      .populate('products.product', 'name price')
      .sort({ createdAt: -1 });

      res.json({ orders });
    } catch (error) {
      res.status(500).json({ error: 'Error fetching current orders' });
    }
  },

  getOrdersByUser: async (req, res) => {
    try {
      const { userCode } = req.params;
      
      // Find user by userCode
      const user = await User.findOne({ 'customerDetails.userCode': userCode });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const orders = await Order.find({ user: user._id })
        .populate('products.product', 'name price')
        .sort({ createdAt: -1 });

      res.json({ orders });
    } catch (error) {
      res.status(500).json({ error: 'Error fetching user orders' });
    }
  },

  createOrderForUser: async (req, res) => {
    try {
      const { userCode, products, paymentMethod } = req.body;

      // Find user by userCode
      const user = await User.findOne({ 'customerDetails.userCode': userCode });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Calculate total and verify products
      let totalAmount = 0;
      const orderProducts = [];

      for (const item of products) {
        const product = await Product.findById(item.productId);
        if (!product) {
          return res.status(404).json({ 
            error: `Product not found: ${item.productId}` 
          });
        }
        if (product.quantity < item.quantity) {
          return res.status(400).json({ 
            error: `Insufficient stock for ${product.name}` 
          });
        }

        const price = product.isOffer ? product.offerPrice : product.price;
        totalAmount += price * item.quantity;

        orderProducts.push({
          product: product._id,
          quantity: item.quantity,
          price: price
        });

        // Update product quantity
        product.quantity -= item.quantity;
        await product.save();
      }

      const order = new Order({
        user: user._id,
        products: orderProducts,
        totalAmount,
        paymentMethod,
        paymentStatus: paymentMethod === 'COD' ? 'pending' : 'completed'
      });

      await order.save();
      res.status(201).json({ order });
    } catch (error) {
      res.status(500).json({ error: 'Error creating order' });
    }
  },

  getOrderHistory: async (req, res) => {
    try {
      // Get orders from last 35 days
      const thirtyFiveDaysAgo = new Date();
      thirtyFiveDaysAgo.setDate(thirtyFiveDaysAgo.getDate() - 35);

      const orders = await Order.find({
        createdAt: { $gte: thirtyFiveDaysAgo }
      })
      .populate('user', 'name customerDetails.firmName customerDetails.userCode')
      .populate('products.product', 'name price')
      .sort({ createdAt: -1 });

      res.json({ orders });
    } catch (error) {
      res.status(500).json({ error: 'Error fetching order history' });
    }
  },

  searchUsers: async (req, res) => {
    try {
      const { query } = req.query;
      const users = await User.find({
        role: 'user',
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { 'customerDetails.firmName': { $regex: query, $options: 'i' } },
          { 'customerDetails.userCode': { $regex: query, $options: 'i' } }
        ]
      }).select('-password');

      res.json({ users });
    } catch (error) {
      res.status(500).json({ error: 'Error searching users' });
    }
  }
};

module.exports = receptionController;