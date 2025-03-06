
// const Cart = require('../models/Cart')
// const User= require('../models/User')
// const Product = require('../models/Product');
// const Order = require('../models/Order');

// const cartController = {
//   // Add to cart
//   addToCart: async (req, res) => {
//     try {
//       const { product: productId, quantity } = req.body;
//       const userId = req.user._id;

//       if (!productId || !quantity) {
//         return res.status(400).json({ error: 'Product ID and quantity are required' });
//       }

//       // Check if product exists
//       const product = await Product.findById(productId);
//       if (!product) {
//         return res.status(404).json({ error: 'Product not found' });
//       }

//       // // Check if product has enough stock
//       // if (product.quantity < quantity) {
//       //   return res.status(400).json({ error: 'Not enough stock available' });
//       // }

//       // Find or create cart
//       let cart = await Cart.findOne({ user: userId });
      
//       if (!cart) {
//         cart = new Cart({
//           user: userId,
//           products: []
//         });
//       }

//       // Check if product already exists in cart
//       const existingProductIndex = cart.products.findIndex(
//         item => item.product.toString() === productId
//       );

//       if (existingProductIndex !== -1) {
//         // Update quantity if product exists
//         cart.products[existingProductIndex].quantity += quantity;
//       } else {
//         // Add new product if it doesn't exist
//         cart.products.push({
//           product: productId,
//           quantity: quantity
//         });
//       }

//       await cart.save();

//       // Populate product details before sending response
//       const populatedCart = await Cart.findById(cart._id).populate('products.product');

//       res.status(200).json({ cart: populatedCart });
//     } catch (error) {
//       console.error('Add to cart error:', error);
//       res.status(500).json({ error: 'Error adding to cart' });
//     }
//   },

//   // Get cart
//   getCart: async (req, res) => {
//     try {
//       const userId = req.user._id;
//       const cart = await Cart.findOne({ user: userId }).populate('products.product');
      
//       if (!cart) {
//         return res.json({ cart: { products: [] } });
//       }

//       res.json({ cart });
//     } catch (error) {
//       console.error('Get cart error:', error);
//       res.status(500).json({ error: 'Error fetching cart' });
//     }
//   },

//   // // Clear cart
//   // clearCart: async (req, res) => {
//   //   try {
//   //     const userId = req.user._id;
//   //     await Cart.findOneAndDelete({ user: userId });
//   //     res.json({ message: 'Cart cleared successfully' });
//   //   } catch (error) {
//   //     console.error('Clear cart error:', error);
//   //     res.status(500).json({ error: 'Error clearing cart' });
//   //   }
//   // },


//   removeFromCart: async (req, res) => {
//     try {
//       const { product: productId } = req.body;
//       const userId = req.user._id;

//       if (!productId) {
//         return res.status(400).json({ error: 'Product ID is required' });
//       }

//       // Find the user's cart
//       const cart = await Cart.findOne({ user: userId });

//       if (!cart) {
//         return res.status(404).json({ error: 'Cart not found' });
//       }

//       // Remove the specific product from the cart
//       cart.products = cart.products.filter(
//         item => item.product.toString() !== productId
//       );

//       // Save the updated cart
//       await cart.save();

//       // Populate product details before sending response
//       const populatedCart = await Cart.findById(cart._id).populate('products.product');

//       res.status(200).json({ cart: populatedCart });
//     } catch (error) {
//       console.error('Remove from cart error:', error);
//       res.status(500).json({ error: 'Error removing product from cart' });
//     }
//   }
// };

// module.exports = cartController;



const Cart = require('../models/Cart');
const User = require('../models/User');
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

      // Check if product exists and is active
      const product = await Product.findById(productId);
      if (!product || !product.isActive) {
        return res.status(404).json({ error: 'Product not found or inactive' });
      }

      // Check stock availability (uncommented and aligned with paymentController)
      if (product.quantity < quantity) {
        return res.status(400).json({ 
          error: `Not enough stock available for ${product.name}`,
          availableStock: product.quantity,
          requestedQuantity: quantity
        });
      }

      // Check offer status
      const now = new Date();
      const isOfferValid = product.discountedPrice && 
                          product.validFrom && 
                          product.validTo && 
                          now >= product.validFrom && 
                          now <= product.validTo;
      const price = isOfferValid ? product.discountedPrice : product.originalPrice;

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

      // Populate and format cart response
      const populatedCart = await Cart.findById(cart._id).populate('products.product');
      const formattedCart = {
        _id: populatedCart._id,
        user: populatedCart.user,
        products: populatedCart.products.map(item => {
          const product = item.product;
          const isOfferValid = product.discountedPrice && 
                              product.validFrom && 
                              product.validTo && 
                              now >= product.validFrom && 
                              now <= product.validTo;
          const price = isOfferValid ? product.discountedPrice : product.originalPrice;

          return {
            product: {
              _id: product._id,
              name: product.name,
              price: price,
              ...(isOfferValid && {
                discountedPrice: product.discountedPrice,
                discountPercentage: Math.round(((product.originalPrice - product.discountedPrice) / product.originalPrice) * 100),
                discountTag: `${Math.round(((product.originalPrice - product.discountedPrice) / product.originalPrice) * 100)}% OFF`,
                offerEndsIn: product.validTo
              }),
              originalPrice: product.originalPrice,
              image: product.image
            },
            quantity: item.quantity,
            subtotal: price * item.quantity
          };
        }),
        total: populatedCart.products.reduce((sum, item) => {
          const product = item.product;
          const isOfferValid = product.discountedPrice && 
                              product.validFrom && 
                              product.validTo && 
                              now >= product.validFrom && 
                              now <= product.validTo;
          const price = isOfferValid ? product.discountedPrice : product.originalPrice;
          return sum + (price * item.quantity);
        }, 0)
      };

      res.status(200).json({ cart: formattedCart });
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
        return res.json({ cart: { products: [], total: 0 } });
      }

      // Format cart response
      const now = new Date();
      const formattedCart = {
        _id: cart._id,
        user: cart.user,
        products: cart.products.map(item => {
          const product = item.product;
          const isOfferValid = product.discountedPrice && 
                              product.validFrom && 
                              product.validTo && 
                              now >= product.validFrom && 
                              now <= product.validTo;
          const price = isOfferValid ? product.discountedPrice : product.originalPrice;

          return {
            product: {
              _id: product._id,
              name: product.name,
              price: price,
              ...(isOfferValid && {
                discountedPrice: product.discountedPrice,
                discountPercentage: Math.round(((product.originalPrice - product.discountedPrice) / product.originalPrice) * 100),
                discountTag: `${Math.round(((product.originalPrice - product.discountedPrice) / product.originalPrice) * 100)}% OFF`,
                offerEndsIn: product.validTo
              }),
              originalPrice: product.originalPrice,
              image: product.image
            },
            quantity: item.quantity,
            subtotal: price * item.quantity
          };
        }),
        total: cart.products.reduce((sum, item) => {
          const product = item.product;
          const isOfferValid = product.discountedPrice && 
                              product.validFrom && 
                              product.validTo && 
                              now >= product.validFrom && 
                              now <= product.validTo;
          const price = isOfferValid ? product.discountedPrice : product.originalPrice;
          return sum + (price * item.quantity);
        }, 0)
      };

      res.json({ cart: formattedCart });
    } catch (error) {
      console.error('Get cart error:', error);
      res.status(500).json({ error: 'Error fetching cart' });
    }
  },

  // Remove from cart
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

      await cart.save();

      // Populate and format cart response
      const populatedCart = await Cart.findById(cart._id).populate('products.product');
      const now = new Date();
      const formattedCart = {
        _id: populatedCart._id,
        user: populatedCart.user,
        products: populatedCart.products.map(item => {
          const product = item.product;
          const isOfferValid = product.discountedPrice && 
                              product.validFrom && 
                              product.validTo && 
                              now >= product.validFrom && 
                              now <= product.validTo;
          const price = isOfferValid ? product.discountedPrice : product.originalPrice;

          return {
            product: {
              _id: product._id,
              name: product.name,
              price: price,
              ...(isOfferValid && {
                discountedPrice: product.discountedPrice,
                discountPercentage: Math.round(((product.originalPrice - product.discountedPrice) / product.originalPrice) * 100),
                discountTag: `${Math.round(((product.originalPrice - product.discountedPrice) / product.originalPrice) * 100)}% OFF`,
                offerEndsIn: product.validTo
              }),
              originalPrice: product.originalPrice,
              image: product.image
            },
            quantity: item.quantity,
            subtotal: price * item.quantity
          };
        }),
        total: populatedCart.products.reduce((sum, item) => {
          const product = item.product;
          const isOfferValid = product.discountedPrice && 
                              product.validFrom && 
                              product.validTo && 
                              now >= product.validFrom && 
                              now <= product.validTo;
          const price = isOfferValid ? product.discountedPrice : product.originalPrice;
          return sum + (price * item.quantity);
        }, 0)
      };

      res.status(200).json({ cart: formattedCart });
    } catch (error) {
      console.error('Remove from cart error:', error);
      res.status(500).json({ error: 'Error removing product from cart' });
    }
  }
};

module.exports = cartController;