// const Cart = require('../models/Cart')
// const User= require('../models/User')
// const Product = require('../models/Product');
// const Order = require('../models/Order');

// const addToCart = async (req, res) => {
//     try {
//       const { productId, quantity } = req.body;
//       const userId = req.user._id;
  
//       // Find or create cart for the user
//       let cart = await Cart.findOne({ user: userId });
  
//       if (!cart) {
//         cart = new Cart({ user: userId, products: [] });
//       }
  
//       // Check if the product is already in the cart
//       const productIndex = cart.products.findIndex(item => item.product.toString() === productId);
  
//       if (productIndex >= 0) {
//         // Update quantity if product is already in cart
//         cart.products[productIndex].quantity += quantity;
//       } else {
//         // Add new product to cart
//         cart.products.push({ product: productId, quantity });
//       }
  
//       await cart.save();
//       res.status(200).json({ message: 'Product added to cart', cart });
//     } catch (error) {
//       res.status(500).json({ error: 'Error adding to cart' });
//     }
//   };
  
//   const getCart = async (req, res) => {
//     try {
//       const userId = req.user._id;
//       const cart = await Cart.findOne({ user: userId }).populate('products.product', 'name price image');
      
//       if (!cart) {
//         return res.status(404).json({ error: 'Cart is empty' });
//       }
  
//       res.json({ cart });
//     } catch (error) {
//       res.status(500).json({ error: 'Error fetching cart' });
//     }
//   };
  
//   const clearCart = async (req, res) => {
//     try {
//       const userId = req.user._id;
//       await Cart.findOneAndDelete({ user: userId });
//       res.json({ message: 'Cart cleared' });
//     } catch (error) {
//       res.status(500).json({ error: 'Error clearing cart' });
//     }
//   };

//   module.exports = {
//     addToCart,
//     getCart,
//     clearCart
//   };


const Cart = require('../models/Cart')
const User= require('../models/User')
const Product = require('../models/Product');
const Order = require('../models/Order');

const cartController = {
  // Add to cart
  addToCart: async (req, res) => {
    try {
      const { product: productId, quantity } = req.body;
      const userId = req.user._id;

      if (!productId || !quantity) {
        return res.status(400).json({ error: 'Product ID and quantity are required' });
      }

      // Check if product exists
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      // // Check if product has enough stock
      // if (product.quantity < quantity) {
      //   return res.status(400).json({ error: 'Not enough stock available' });
      // }

      // Find or create cart
      let cart = await Cart.findOne({ user: userId });
      
      if (!cart) {
        cart = new Cart({
          user: userId,
          products: []
        });
      }

      // Check if product already exists in cart
      const existingProductIndex = cart.products.findIndex(
        item => item.product.toString() === productId
      );

      if (existingProductIndex !== -1) {
        // Update quantity if product exists
        cart.products[existingProductIndex].quantity += quantity;
      } else {
        // Add new product if it doesn't exist
        cart.products.push({
          product: productId,
          quantity: quantity
        });
      }

      await cart.save();

      // Populate product details before sending response
      const populatedCart = await Cart.findById(cart._id).populate('products.product');

      res.status(200).json({ cart: populatedCart });
    } catch (error) {
      console.error('Add to cart error:', error);
      res.status(500).json({ error: 'Error adding to cart' });
    }
  },

  // Get cart
  getCart: async (req, res) => {
    try {
      const userId = req.user._id;
      const cart = await Cart.findOne({ user: userId }).populate('products.product');
      
      if (!cart) {
        return res.json({ cart: { products: [] } });
      }

      res.json({ cart });
    } catch (error) {
      console.error('Get cart error:', error);
      res.status(500).json({ error: 'Error fetching cart' });
    }
  },

  // // Clear cart
  // clearCart: async (req, res) => {
  //   try {
  //     const userId = req.user._id;
  //     await Cart.findOneAndDelete({ user: userId });
  //     res.json({ message: 'Cart cleared successfully' });
  //   } catch (error) {
  //     console.error('Clear cart error:', error);
  //     res.status(500).json({ error: 'Error clearing cart' });
  //   }
  // },


  removeFromCart: async (req, res) => {
    try {
      const { product: productId } = req.body;
      const userId = req.user._id;

      if (!productId) {
        return res.status(400).json({ error: 'Product ID is required' });
      }

      // Find the user's cart
      const cart = await Cart.findOne({ user: userId });

      if (!cart) {
        return res.status(404).json({ error: 'Cart not found' });
      }

      // Remove the specific product from the cart
      cart.products = cart.products.filter(
        item => item.product.toString() !== productId
      );

      // Save the updated cart
      await cart.save();

      // Populate product details before sending response
      const populatedCart = await Cart.findById(cart._id).populate('products.product');

      res.status(200).json({ cart: populatedCart });
    } catch (error) {
      console.error('Remove from cart error:', error);
      res.status(500).json({ error: 'Error removing product from cart' });
    }
  }
};

module.exports = cartController;