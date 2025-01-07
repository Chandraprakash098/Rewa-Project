const Cart = require('../models/Cart')
const User= require('../models/User')
const Product = require('../models/Product');
const Order = require('../models/Order');

const addToCart = async (req, res) => {
    try {
      const { productId, quantity } = req.body;
      const userId = req.user._id;
  
      // Find or create cart for the user
      let cart = await Cart.findOne({ user: userId });
  
      if (!cart) {
        cart = new Cart({ user: userId, products: [] });
      }
  
      // Check if the product is already in the cart
      const productIndex = cart.products.findIndex(item => item.product.toString() === productId);
  
      if (productIndex >= 0) {
        // Update quantity if product is already in cart
        cart.products[productIndex].quantity += quantity;
      } else {
        // Add new product to cart
        cart.products.push({ product: productId, quantity });
      }
  
      await cart.save();
      res.status(200).json({ message: 'Product added to cart', cart });
    } catch (error) {
      res.status(500).json({ error: 'Error adding to cart' });
    }
  };
  
  const getCart = async (req, res) => {
    try {
      const userId = req.user._id;
      const cart = await Cart.findOne({ user: userId }).populate('products.product', 'name price image');
      
      if (!cart) {
        return res.status(404).json({ error: 'Cart is empty' });
      }
  
      res.json({ cart });
    } catch (error) {
      res.status(500).json({ error: 'Error fetching cart' });
    }
  };
  
  const clearCart = async (req, res) => {
    try {
      const userId = req.user._id;
      await Cart.findOneAndDelete({ user: userId });
      res.json({ message: 'Cart cleared' });
    } catch (error) {
      res.status(500).json({ error: 'Error clearing cart' });
    }
  };

  module.exports = {
    addToCart,
    getCart,
    clearCart
  };