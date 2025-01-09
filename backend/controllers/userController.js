const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');
const Cart = require('../models/Cart')

const userController = {
  // Product Browsing
  getAllProducts: async (req, res) => {
    try {
      const products = await Product.find({ isActive: true });
      res.json({ products });
    } catch (error) {
      res.status(500).json({ error: 'Error fetching products' });
    }
  },

  // getOffers: async (req, res) => {
  //   try {
  //     const offers = await Product.find({ 
  //       isActive: true, 
  //       isOffer: true 
  //     });
  //     res.json({ offers });
  //   } catch (error) {
  //     res.status(500).json({ error: 'Error fetching offers' });
  //   }
  // },

  getOffers: async (req, res) => {
    try {
      const offers = await Product.find({ 
        isActive: true,
        discountedPrice: { $exists: true, $ne: null },
        $expr: { $lt: ["$discountedPrice", "$originalPrice"] }
      });
      
      res.json({ 
        offers: offers.map(offer => ({
          ...offer.toJSON(),
          discountTag: `${offer.discountPercentage}% OFF`
        }))
      });
    } catch (error) {
      res.status(500).json({ error: 'Error fetching offers' });
    }
  },




createOrder: async (req, res) => {
    try {
      const { paymentMethod } = req.body;
      const userId = req.user._id;
    
      // Retrieve the cart for the user
      const cart = await Cart.findOne({ user: userId }).populate('products.product');
      if (!cart || cart.products.length === 0) {
        return res.status(400).json({ error: 'Cart is empty' });
      }
    
      let totalAmount = 0;
      const orderProducts = [];
    
      // Loop through the cart products and calculate totalAmount
      for (const item of cart.products) {
        const product = item.product;
        const price = product.isOffer ? product.offerPrice : product.price;
    
        // Ensure there is enough stock before proceeding
        if (product.quantity < item.quantity) {
          return res.status(400).json({ error: `Not enough stock for ${product.name}` });
        }
    
        totalAmount += price * item.quantity;
    
        orderProducts.push({
          product: product._id,
          quantity: item.quantity,
          price: price
        });
    
        // Update product quantity in the database
        product.quantity -= item.quantity;
        await product.save();
      }
    
      // Create the order
      const order = new Order({
        user: userId,
        products: orderProducts,
        totalAmount,
        paymentMethod,
        paymentStatus: paymentMethod === 'COD' ? 'pending' : 'completed'
      });
    
      await order.save();
      
      // Clear the cart after successful order creation
      await Cart.findOneAndDelete({ user: userId });
    
      res.status(201).json({ order });
    } catch (error) {
      console.error(error);  // Log the error for debugging
      res.status(500).json({ error: `Error creating order: ${error.message}` });
    }
},
  

  getOrderHistory: async (req, res) => {
    try {
      const orders = await Order.find({ user: req.user._id })
        .populate('products.product', 'name price image')
        .sort({ createdAt: -1 });
      res.json({ orders });
    } catch (error) {
      res.status(500).json({ error: 'Error fetching order history' });
    }
  },

  // Profile Management
  updateProfile: async (req, res) => {
    try {
      const updates = {
        name: req.body.name,
        phoneNumber: req.body.phoneNumber,
        'customerDetails.firmName': req.body.firmName,
        'customerDetails.gstNumber': req.body.gstNumber,
        'customerDetails.panNumber': req.body.panNumber,
        'customerDetails.address': req.body.address
      };

      // Remove undefined values
      Object.keys(updates).forEach(key => 
        updates[key] === undefined && delete updates[key]
      );

      const user = await User.findByIdAndUpdate(
        req.user._id,
        updates,
        { new: true }
      ).select('-password');

      res.json({ user });
    } catch (error) {
      res.status(500).json({ error: 'Error updating profile' });
    }
  },

  changePassword: async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const user = await User.findById(req.user._id);

      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }

      user.password = newPassword;
      await user.save();

      res.json({ message: 'Password updated successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Error changing password' });
    }
  }
};

module.exports = userController;