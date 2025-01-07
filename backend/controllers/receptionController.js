const User = require('../models/User');
const Order = require('../models/Order');
const fs = require('fs').promises;
const path = require('path');
const jwt = require('jsonwebtoken');


const generateUserCode = async () => {
  let userCode;
  let isUnique = false;

  while (!isUnique) {
    userCode = `USER-${Math.floor(100000 + Math.random() * 900000)}`; // Example: OPT123456
    const existingUser = await User.findOne({ 'customerDetails.userCode': userCode });
    if (!existingUser) {
      isUnique = true;
    }
  }
  return userCode;
};

const receptionController = {
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

      // Validation checks
      if (!name || !firmName || !phoneNumber || !email || !password || !address) {
        if (req.file) {
          await fs.unlink(req.file.path);
        }
        return res.status(400).json({
          error: 'Missing required fields',
          details: {
            name: !name,
            firmName: !firmName,
            phoneNumber: !phoneNumber,
            email: !email,
            password: !password,
            address: !address,
          },
        });
      }

      // Check if email already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        if (req.file) {
          await fs.unlink(req.file.path);
        }
        return res.status(400).json({ error: 'Email already registered' });
      }

      // Generate unique user code
      const userCode = await generateUserCode();

      // Process photo if uploaded
      let photoUrl = null;
      if (req.file) {
        photoUrl = `/uploads/profile-photos/${req.file.filename}`;
        try {
          await fs.access(path.join(__dirname, '..', 'uploads/profile-photos', req.file.filename));
        } catch (err) {
          console.error('File access error:', err);
          return res.status(500).json({ error: 'File upload failed' });
        }
      }

      // Create new user
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
          address,
          photo: photoUrl,
          userCode
        }
      });

      await user.save();

      // Generate JWT token for immediate login if needed
      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
        expiresIn: '7d'
      });

      // Remove password from response
      const userResponse = user.toObject();
      delete userResponse.password;

      res.status(201).json({ 
        message: 'Customer registered successfully',
        user: userResponse,
        token,
        userCode: user.customerDetails.userCode
      });
    } catch (error) {
      console.error('Registration error:', error);
      if (req.file) {
        await fs.unlink(req.file.path).catch(console.error);
      }
      res.status(500).json({ 
        error: 'Error creating customer',
        details: error.message 
      });
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