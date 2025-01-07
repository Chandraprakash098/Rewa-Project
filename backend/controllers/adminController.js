const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');

const adminController = {
  // User Management
  getAllUsers: async (req, res) => {
    try {
      const users = await User.find({ role: 'user' }).select('-password');
      res.json({ users });
    } catch (error) {
      res.status(500).json({ error: 'Error fetching users' });
    }
  },

  toggleUserStatus: async (req, res) => {
    try {
      const user = await User.findById(req.params.userId);
      if (!user) return res.status(404).json({ error: 'User not found' });
      
      user.isActive = !user.isActive;
      await user.save();
      
      res.json({ message: 'User status updated', isActive: user.isActive });
    } catch (error) {
      res.status(500).json({ error: 'Error updating user status' });
    }
  },

  // Product Management
  createProduct: async (req, res) => {
    try {
      const { name, description, price, quantity, isOffer, offerPrice } = req.body;
      const image = req.file ? req.file.path : null;

      const product = new Product({
        name,
        description,
        price,
        quantity,
        image,
        isOffer,
        offerPrice
      });

      await product.save();
      res.status(201).json({ product });
    } catch (error) {
      res.status(500).json({ error: 'Error creating product' });
    }
  },

  updateProduct: async (req, res) => {
    try {
      const updates = req.body;
      if (req.file) {
        updates.image = req.file.path;
      }

      const product = await Product.findByIdAndUpdate(
        req.params.productId,
        updates,
        { new: true }
      );

      if (!product) return res.status(404).json({ error: 'Product not found' });
      res.json({ product });
    } catch (error) {
      res.status(500).json({ error: 'Error updating product' });
    }
  },

  // Order Management
  getAllOrders: async (req, res) => {
    try {
      const { status, paymentMethod, startDate, endDate } = req.query;
      let query = {};

      if (status) query.status = status;
      if (paymentMethod) query.paymentMethod = paymentMethod;
      if (startDate && endDate) {
        query.createdAt = {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        };
      }

      const orders = await Order.find(query)
        .populate('user', 'name customerDetails.firmName')
        .populate('products.product', 'name price');

      res.json({ orders });
    } catch (error) {
      res.status(500).json({ error: 'Error fetching orders' });
    }
  },

  updateOrderStatus: async (req, res) => {
    try {
      const { status, deliveryNote } = req.body;
      const order = await Order.findById(req.params.orderId);

      if (!order) return res.status(404).json({ error: 'Order not found' });

      order.status = status;
      if (deliveryNote) {
        order.deliveryNote = {
          ...deliveryNote,
          createdAt: new Date()
        };
      }

      await order.save();
      res.json({ order });
    } catch (error) {
      res.status(500).json({ error: 'Error updating order status' });
    }
  },

  // Dashboard Statistics
  getDashboardStats: async (req, res) => {
    try {
      const stats = {
        users: await User.countDocuments({ role: 'user' }),
        activeUsers: await User.countDocuments({ role: 'user', isActive: true }),
        products: await Product.countDocuments(),
        lowStock: await Product.countDocuments({ quantity: { $lt: 10 } }),
        pendingOrders: await Order.countDocuments({ status: 'pending' }),
        completedOrders: await Order.countDocuments({ status: 'completed' })
      };

      res.json({ stats });
    } catch (error) {
      res.status(500).json({ error: 'Error fetching dashboard stats' });
    }
  }
};

module.exports = adminController;