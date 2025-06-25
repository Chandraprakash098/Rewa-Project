
const Cart = require('../models/Cart');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const mongoose= require("mongoose");

const cartController = {
  // Add to cart
  
//   addToCart: async (req, res) => {
//     try {
//       const { product: productId, quantity: quantityStr } = req.body;
//       const userId = req.user._id;
  
//       if (!productId || !quantityStr) {
//         return res.status(400).json({ error: 'Product ID and quantity are required' });
//       }
  
//       // Convert quantity to a number
//       const quantity = parseInt(quantityStr, 10);
//       if (isNaN(quantity) || quantity <= 0) {
//         return res.status(400).json({ error: 'Quantity must be a positive number' });
//       }

//       if (quantity < 200) {
//         return res.status(400).json({ 
//           error: 'Minimum order quantity is 200 units',
//           minimumRequired: 200,
//           requestedQuantity: quantity
//         });
//       }
  
//       // Check if product exists and is active
//       const product = await Product.findById(productId);
//       if (!product || !product.isActive) {
//         return res.status(404).json({ error: 'Product not found or inactive' });
//       }
  
      
  
//       // Check offer status
//       const now = new Date();
//       const isOfferValid = product.discountedPrice != null && 
//                           product.validFrom && 
//                           product.validTo && 
//                           now >= new Date(product.validFrom) && 
//                           now <= new Date(product.validTo);
//       const price = isOfferValid ? product.discountedPrice : product.originalPrice;
  
//       // Debugging logs
//       console.log('Product:', product.toObject());
//       console.log('Now:', now);
//       console.log('validFrom:', product.validFrom, 'validTo:', product.validTo);
//       console.log('isOfferValid:', isOfferValid);
//       console.log('Price:', price);
  
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
//         cart.products[existingProductIndex].quantity += quantity; // Now performs numeric addition
//       } else {
//         cart.products.push({
//           product: productId,
//           quantity: quantity
//         });
//       }
  
//       await cart.save();
  
//       // Populate and format cart response
//       const populatedCart = await Cart.findById(cart._id).populate('products.product');
//       const formattedCart = {
//         _id: populatedCart._id,
//         user: populatedCart.user,
//         products: populatedCart.products
//           .filter(item => item.product) // Filter out invalid products
//           .map(item => {
//             const product = item.product;
//             const isOfferValid = product.discountedPrice != null && 
//                                 product.validFrom && 
//                                 product.validTo && 
//                                 now >= new Date(product.validFrom) && 
//                                 now <= new Date(product.validTo);
//             const price = isOfferValid ? product.discountedPrice : product.originalPrice;
  
//             return {
//               product: {
//                 _id: product._id,
//                 name: product.name,
//                 price: price,
//                 category: product.category,
//                 ...(isOfferValid && {
//                   discountedPrice: product.discountedPrice,
//                   discountPercentage: Math.round(((product.originalPrice - product.discountedPrice) / product.originalPrice) * 100),
//                   discountTag: `${Math.round(((product.originalPrice - product.discountedPrice) / product.originalPrice) * 100)}% OFF`,
//                   offerEndsIn: product.validTo
//                 }),
//                 originalPrice: product.originalPrice,
//                 image: product.image
//               },
//               quantity: item.quantity,
//               subtotal: price * item.quantity
//             };
//           }),
//         total: populatedCart.products
//           .filter(item => item.product) // Filter out invalid products
//           .reduce((sum, item) => {
//             const product = item.product;
//             const isOfferValid = product.discountedPrice != null && 
//                                 product.validFrom && 
//                                 product.validTo && 
//                                 now >= new Date(product.validFrom) && 
//                                 now <= new Date(product.validTo);
//             const price = isOfferValid ? product.discountedPrice : product.originalPrice;
//             return sum + (price * item.quantity);
//           }, 0)
//       };
  
//       res.status(200).json({ cart: formattedCart });
//     } catch (error) {
//       console.error('Add to cart error:', error);
//       res.status(500).json({ error: 'Error adding to cart' });
//     }
//   },
  

//   getCart: async (req, res) => {
//     try {
//       const userId = req.user._id;
//       const cart = await Cart.findOne({ user: userId }).populate('products.product');
      
//       if (!cart) {
//         return res.json({ cart: { products: [], total: 0 } });
//       }
  
//       // Format cart response
//       const now = new Date();
//       const formattedCart = {
//         _id: cart._id,
//         user: cart.user,
//         products: cart.products
//           .filter(item => item.product) // Filter out items with null/undefined products
//           .map(item => {
//             const product = item.product;
//             const isOfferValid =
//               product.discountedPrice != null &&
//               product.validFrom &&
//               product.validTo &&
//               now >= new Date(product.validFrom) &&
//               now <= new Date(product.validTo);
//             const price = isOfferValid ? product.discountedPrice : product.originalPrice;
  
//             return {
//               product: {
//                 _id: product._id,
//                 name: product.name,
//                 price: price,
//                 category: product.category,
//                 ...(isOfferValid && {
//                   discountedPrice: product.discountedPrice,
//                   discountPercentage: Math.round(
//                     ((product.originalPrice - product.discountedPrice) / product.originalPrice) * 100
//                   ),
//                   discountTag: `${Math.round(
//                     ((product.originalPrice - product.discountedPrice) / product.originalPrice) * 100
//                   )}% OFF`,
//                   offerEndsIn: product.validTo,
//                 }),
//                 originalPrice: product.originalPrice,
//                 image: product.image,
//               },
//               quantity: item.quantity,
//               subtotal: price * item.quantity,
//             };
//           }),
//         total: cart.products
//           .filter(item => item.product) // Filter out items with null/undefined products
//           .reduce((sum, item) => {
//             const product = item.product;
//             const isOfferValid =
//               product.discountedPrice != null &&
//               product.validFrom &&
//               product.validTo &&
//               now >= new Date(product.validFrom) &&
//               now <= new Date(product.validTo);
//             const price = isOfferValid ? product.discountedPrice : product.originalPrice;
//             return sum + price * item.quantity;
//           }, 0),
//       };
  
//       res.json({ cart: formattedCart });
//     } catch (error) {
//       console.error('Get cart error:', error);
//       res.status(500).json({ error: 'Error fetching cart' });
//     }
//   },

//   // Remove from cart (unchanged, included for completeness)
//   removeFromCart: async (req, res) => {
//     try {
//       const { product: productId } = req.body;
//       const userId = req.user._id;

//       if (!productId) {
//         return res.status(400).json({ error: 'Product ID is required' });
//       }

//       const cart = await Cart.findOne({ user: userId });
//       if (!cart) {
//         return res.status(404).json({ error: 'Cart not found' });
//       }

//       cart.products = cart.products.filter(
//         item => item.product.toString() !== productId
//       );

//       await cart.save();

//       const populatedCart = await Cart.findById(cart._id).populate('products.product');
//       const now = new Date();
//       const formattedCart = {
//         _id: populatedCart._id,
//         user: populatedCart.user,
//         products: populatedCart.products.map(item => {
//           const product = item.product;
//           const isOfferValid = product.discountedPrice != null && 
//                               product.validFrom && 
//                               product.validTo && 
//                               now >= new Date(product.validFrom) && 
//                               now <= new Date(product.validTo);
//           const price = isOfferValid ? product.discountedPrice : product.originalPrice;

//           return {
//             product: {
//               _id: product._id,
//               name: product.name,
//               price: price,
//               category: product.category,
//               ...(isOfferValid && {
//                 discountedPrice: product.discountedPrice,
//                 discountPercentage: Math.round(((product.originalPrice - product.discountedPrice) / product.originalPrice) * 100),
//                 discountTag: `${Math.round(((product.originalPrice - product.discountedPrice) / product.originalPrice) * 100)}% OFF`,
//                 offerEndsIn: product.validTo
//               }),
//               originalPrice: product.originalPrice,
//               image: product.image
//             },
//             quantity: item.quantity,
//             subtotal: price * item.quantity
//           };
//         }),
//         total: populatedCart.products.reduce((sum, item) => {
//           const product = item.product;
//           const isOfferValid = product.discountedPrice != null && 
//                               product.validFrom && 
//                               product.validTo && 
//                               now >= new Date(product.validFrom) && 
//                               now <= new Date(product.validTo);
//           const price = isOfferValid ? product.discountedPrice : product.originalPrice;
//           return sum + (price * item.quantity);
//         }, 0)
//       };

//       res.status(200).json({ cart: formattedCart });
//     } catch (error) {
//       console.error('Remove from cart error:', error);
//       res.status(500).json({ error: 'Error removing product from cart' });
//     }
//   }
// };


// addToCart: async (req, res) => {
//   try {
//     const { product: productId, boxes: boxesStr } = req.body;
//     const userId = req.user._id;

//     if (!productId || !boxesStr) {
//       return res.status(400).json({ error: 'Product ID and boxes are required' });
//     }

//     const boxes = parseInt(boxesStr, 10);
//     if (isNaN(boxes) || boxes < 230) {
//       return res.status(400).json({
//         error: 'Minimum 230 boxes are required',
//         minimumRequired: 230,
//         requestedBoxes: boxes
//       });
//     }

//     const product = await Product.findById(productId);
//     if (!product || !product.isActive) {
//       return res.status(404).json({ error: 'Product not found or inactive' });
//     }

//     const now = new Date();
//     const isOfferValid = product.discountedPrice != null &&
//                         product.validFrom &&
//                         product.validTo &&
//                         now >= new Date(product.validFrom) &&
//                         now <= new Date(product.validTo);
//     const price = isOfferValid ? product.discountedPrice : product.originalPrice;

//     console.log('Product:', product.toObject());
//     console.log('Now:', now);
//     console.log('validFrom:', product.validFrom, 'validTo:', product.validTo);
//     console.log('isOfferValid:', isOfferValid);
//     console.log('Price:', price);

//     let cart = await Cart.findOne({ user: userId });
//     if (!cart) {
//       cart = new Cart({
//         user: userId,
//         products: []
//       });
//     }

//     const existingProductIndex = cart.products.findIndex(
//       item => item.product.toString() === productId
//     );

//     if (existingProductIndex !== -1) {
//       cart.products[existingProductIndex].boxes += boxes;
//     } else {
//       cart.products.push({
//         product: productId,
//         boxes: boxes
//       });
//     }

//     await cart.save();

//     const populatedCart = await Cart.findById(cart._id).populate('products.product');
//     const formattedCart = {
//       _id: populatedCart._id,
//       user: populatedCart.user,
//       products: populatedCart.products
//         .filter(item => item.product)
//         .map(item => {
//           const product = item.product;
//           const isOfferValid = product.discountedPrice != null &&
//                               product.validFrom &&
//                               product.validTo &&
//                               now >= new Date(product.validFrom) &&
//                               now <= new Date(product.validTo);
//           const price = isOfferValid ? product.discountedPrice : product.originalPrice;

//           return {
//             product: {
//               _id: product._id,
//               name: product.name,
//               price: price,
//               category: product.category,
//               ...(isOfferValid && {
//                 discountedPrice: product.discountedPrice,
//                 discountPercentage: Math.round(((product.originalPrice - product.discountedPrice) / product.originalPrice) * 100),
//                 discountTag: `${Math.round(((product.originalPrice - product.discountedPrice) / product.originalPrice) * 100)}% OFF`,
//                 offerEndsIn: product.validTo
//               }),
//               originalPrice: product.originalPrice,
//               image: product.image,
//               bottlesPerBox: product.bottlesPerBox
//             },
//             boxes: item.boxes,
//             subtotal: price * item.boxes
//           };
//         }),
//       total: populatedCart.products
//         .filter(item => item.product)
//         .reduce((sum, item) => {
//           const product = item.product;
//           const isOfferValid = product.discountedPrice != null &&
//                               product.validFrom &&
//                               product.validTo &&
//                               now >= new Date(product.validFrom) &&
//                               now <= new Date(product.validTo);
//           const price = isOfferValid ? product.discountedPrice : product.originalPrice;
//           return sum + (price * item.boxes);
//         }, 0)
//     };

//     res.status(200).json({ cart: formattedCart });
//   } catch (error) {
//     console.error('Add to cart error:', error);
//     res.status(500).json({ error: 'Error adding to cart' });
//   }
// },


// addToCart: async (req, res) => {
//     try {
//       const { product: productId, boxes: boxesStr } = req.body;
//       const userId = req.user._id;

//       // Log the incoming request body
//       console.log('Request body:', req.body);

//       if (!productId || !boxesStr) {
//         return res.status(400).json({ error: 'Product ID and boxes are required' });
//       }

//       const boxes = parseInt(boxesStr, 10);
//       console.log('Parsed boxes:', boxes);

//       if (isNaN(boxes) || boxes < 230) {
//         return res.status(400).json({
//           error: 'Minimum 230 boxes are required',
//           minimumRequired: 230,
//           requestedBoxes: boxes
//         });
//       }

//       const product = await Product.findById(productId);
//       if (!product || !product.isActive) {
//         return res.status(404).json({ error: 'Product not found or inactive' });
//       }

//       const now = new Date();
//       const isOfferValid = product.discountedPrice != null &&
//                           product.validFrom &&
//                           product.validTo &&
//                           now >= new Date(product.validFrom) &&
//                           now <= new Date(product.validTo);
//       const price = isOfferValid ? product.discountedPrice : product.originalPrice;

//       console.log('Product:', product.toObject());
//       console.log('Now:', now);
//       console.log('validFrom:', product.validFrom, 'validTo:', product.validTo);
//       console.log('isOfferValid:', isOfferValid);
//       console.log('Price:', price);

//       let cart = await Cart.findOne({ user: userId });
//       if (!cart) {
//         cart = new Cart({
//           user: userId,
//           products: []
//         });
//       }

//       // Log the current cart state before modification
//       console.log('Current cart products:', cart.products);

//       const existingProductIndex = cart.products.findIndex(
//         item => item.product.toString() === productId
//       );

//       if (existingProductIndex !== -1) {
//         cart.products[existingProductIndex].boxes += boxes;
//       } else {
//         cart.products.push({
//           product: productId,
//           boxes: boxes
//         });
//       }

//       // Log the cart products after modification
//       console.log('Updated cart products:', cart.products);

//       // Validate cart products before saving
//       for (const item of cart.products) {
//         if (!item.product || item.boxes == null || isNaN(item.boxes)) {
//           return res.status(400).json({
//             error: 'Invalid cart data: product ID or boxes missing',
//             invalidItem: item
//           });
//         }
//       }

//       await cart.save();

//       const populatedCart = await Cart.findById(cart._id).populate('products.product');
//       const formattedCart = {
//         _id: populatedCart._id,
//         user: populatedCart.user,
//         products: populatedCart.products
//           .filter(item => item.product)
//           .map(item => {
//             const product = item.product;
//             const isOfferValid = product.discountedPrice != null &&
//                                 product.validFrom &&
//                                 product.validTo &&
//                                 now >= new Date(product.validFrom) &&
//                                 now <= new Date(product.validTo);
//             const price = isOfferValid ? product.discountedPrice : product.originalPrice;

//             return {
//               product: {
//                 _id: product._id,
//                 name: product.name,
//                 price: price,
//                 category: product.category,
//                 ...(isOfferValid && {
//                   discountedPrice: product.discountedPrice,
//                   discountPercentage: Math.round(((product.originalPrice - product.discountedPrice) / product.originalPrice) * 100),
//                   discountTag: `${Math.round(((product.originalPrice - product.discountedPrice) / product.originalPrice) * 100)}% OFF`,
//                   offerEndsIn: product.validTo
//                 }),
//                 originalPrice: product.originalPrice,
//                 image: product.image,
//                 bottlesPerBox: product.bottlesPerBox
//               },
//               boxes: item.boxes,
//               subtotal: price * item.boxes
//             };
//           }),
//         total: populatedCart.products
//           .filter(item => item.product)
//           .reduce((sum, item) => {
//             const product = item.product;
//             const isOfferValid = product.discountedPrice != null &&
//                                 product.validFrom &&
//                                 product.validTo &&
//                                 now >= new Date(product.validFrom) &&
//                                 now <= new Date(product.validTo);
//             const price = isOfferValid ? product.discountedPrice : product.originalPrice;
//             return sum + (price * item.boxes);
//           }, 0)
//       };

//       res.status(200).json({ cart: formattedCart });
//     } catch (error) {
//       console.error('Add to cart error:', error);
//       res.status(500).json({ error: 'Error adding to cart', details: error.message });
//     }
//   },

addToCart: async (req, res) => {
    try {
      const { product: productId, boxes: boxesStr } = req.body;
      const userId = req.user._id;

      console.log('Request body:', req.body);

      if (!productId || !boxesStr) {
        return res.status(400).json({ error: 'Product ID and boxes are required' });
      }

      if (!mongoose.Types.ObjectId.isValid(productId)) {
        return res.status(400).json({ error: 'Invalid product ID format' });
      }

      const boxes = parseInt(boxesStr, 10);
      console.log('Parsed boxes:', boxes);

      if (isNaN(boxes) || boxes < 230) {
        return res.status(400).json({
          error: 'Minimum 230 boxes are required',
          minimumRequired: 230,
          requestedBoxes: boxes
        });
      }

      const product = await Product.findById(productId);
      if (!product || !product.isActive) {
        return res.status(404).json({ error: 'Product not found or inactive' });
      }

      const now = new Date();
      const isOfferValid = product.discountedPrice != null &&
                          product.validFrom &&
                          product.validTo &&
                          now >= new Date(product.validFrom) &&
                          now <= new Date(product.validTo);
      const price = isOfferValid ? product.discountedPrice : product.originalPrice;

      console.log('Product:', product.toObject());
      console.log('Now:', now);
      console.log('validFrom:', product.validFrom, 'validTo:', product.validTo);
      console.log('isOfferValid:', isOfferValid);
      console.log('Price:', price);

      let cart = await Cart.findOne({ user: userId });
      if (!cart) {
        cart = new Cart({
          user: userId,
          products: []
        });
      }

      cart.products = cart.products.filter(item => 
        item.product && 
        item.boxes != null && 
        !isNaN(item.boxes) && 
        item.boxes >= 230
      );

      console.log('Current cart products (after cleanup):', cart.products);

      const existingProductIndex = cart.products.findIndex(
        item => item.product.toString() === productId
      );

      if (existingProductIndex !== -1) {
        cart.products[existingProductIndex].boxes += boxes;
      } else {
        cart.products.push({
          product: productId,
          boxes: boxes
        });
      }

      console.log('Updated cart products:', cart.products);

      for (const item of cart.products) {
        if (!item.product || item.boxes == null || isNaN(item.boxes) || item.boxes < 230) {
          return res.status(400).json({
            error: 'Invalid cart data: product ID or boxes invalid',
            invalidItem: item
          });
        }
      }

      await cart.save();

      const populatedCart = await Cart.findById(cart._id).populate('products.product');
      const formattedCart = {
        _id: populatedCart._id,
        user: populatedCart.user,
        products: populatedCart.products
          .filter(item => item.product)
          .map(item => {
            const product = item.product;
            const isOfferValid = product.discountedPrice != null &&
                                product.validFrom &&
                                product.validTo &&
                                now >= new Date(product.validFrom) &&
                                now <= new Date(product.validTo);
            const price = isOfferValid ? product.discountedPrice : product.originalPrice;

            return {
              product: {
                _id: product._id,
                name: product.name,
                price: price,
                category: product.category,
                ...(isOfferValid && {
                  discountedPrice: product.discountedPrice,
                  discountPercentage: Math.round(((product.originalPrice - product.discountedPrice) / product.originalPrice) * 100),
                  discountTag: `${Math.round(((product.originalPrice - product.discountedPrice) / product.originalPrice) * 100)}% OFF`,
                  offerEndsIn: product.validTo
                }),
                originalPrice: product.originalPrice,
                image: product.image,
                bottlesPerBox: product.bottlesPerBox
              },
              boxes: item.boxes,
              subtotal: price * item.boxes
            };
          }),
        total: populatedCart.products
          .filter(item => item.product)
          .reduce((sum, item) => {
            const product = item.product;
            const isOfferValid = product.discountedPrice != null &&
                                product.validFrom &&
                                product.validTo &&
                                now >= new Date(product.validFrom) &&
                                now <= new Date(product.validTo);
            const price = isOfferValid ? product.discountedPrice : product.originalPrice;
            return sum + (price * item.boxes);
          }, 0)
      };

      res.status(200).json({ cart: formattedCart });
    } catch (error) {
      console.error('Add to cart error:', error);
      res.status(500).json({ error: 'Error adding to cart', details: error.message });
    }
  },


getCart: async (req, res) => {
  try {
    const userId = req.user._id;
    const cart = await Cart.findOne({ user: userId }).populate('products.product');

    if (!cart) {
      return res.json({ cart: { products: [], total: 0 } });
    }

    const now = new Date();
    const formattedCart = {
      _id: cart._id,
      user: cart.user,
      products: cart.products
        .filter(item => item.product)
        .map(item => {
          const product = item.product;
          const isOfferValid =
            product.discountedPrice != null &&
            product.validFrom &&
            product.validTo &&
            now >= new Date(product.validFrom) &&
            now <= new Date(product.validTo);
          const price = isOfferValid ? product.discountedPrice : product.originalPrice;

          return {
            product: {
              _id: product._id,
              name: product.name,
              price: price,
              category: product.category,
              ...(isOfferValid && {
                discountedPrice: product.discountedPrice,
                discountPercentage: Math.round(
                  ((product.originalPrice - product.discountedPrice) / product.originalPrice) * 100
                ),
                discountTag: `${Math.round(
                  ((product.originalPrice - product.discountedPrice) / product.originalPrice) * 100
                )}% OFF`,
                offerEndsIn: product.validTo,
              }),
              originalPrice: product.originalPrice,
              image: product.image,
              bottlesPerBox: product.bottlesPerBox
            },
            boxes: item.boxes,
            subtotal: price * item.boxes,
          };
        }),
      total: cart.products
        .filter(item => item.product)
        .reduce((sum, item) => {
          const product = item.product;
          const isOfferValid =
            product.discountedPrice != null &&
            product.validFrom &&
            product.validTo &&
            now >= new Date(product.validFrom) &&
            now <= new Date(product.validTo);
          const price = isOfferValid ? product.discountedPrice : product.originalPrice;
          return sum + price * item.boxes;
        }, 0),
    };

    res.json({ cart: formattedCart });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ error: 'Error fetching cart' });
  }
},

removeFromCart: async (req, res) => {
  try {
    const { product: productId } = req.body;
    const userId = req.user._id;

    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required' });
    }

    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({ error: 'Cart not found' });
    }

    cart.products = cart.products.filter(
      item => item.product.toString() !== productId
    );

    await cart.save();

    const populatedCart = await Cart.findById(cart._id).populate('products.product');
    const now = new Date();
    const formattedCart = {
      _id: populatedCart._id,
      user: populatedCart.user,
      products: populatedCart.products.map(item => {
        const product = item.product;
        const isOfferValid = product.discountedPrice != null &&
                            product.validFrom &&
                            product.validTo &&
                            now >= new Date(product.validFrom) &&
                            now <= new Date(product.validTo);
        const price = isOfferValid ? product.discountedPrice : product.originalPrice;

        return {
          product: {
            _id: product._id,
            name: product.name,
            price: price,
            category: product.category,
            ...(isOfferValid && {
              discountedPrice: product.discountedPrice,
              discountPercentage: Math.round(((product.originalPrice - product.discountedPrice) / product.originalPrice) * 100),
              discountTag: `${Math.round(((product.originalPrice - product.discountedPrice) / product.originalPrice) * 100)}% OFF`,
              offerEndsIn: product.validTo
            }),
            originalPrice: product.originalPrice,
            image: product.image,
            bottlesPerBox: product.bottlesPerBox
          },
          boxes: item.boxes,
          subtotal: price * item.boxes
        };
      }),
      total: populatedCart.products.reduce((sum, item) => {
        const product = item.product;
        const isOfferValid = product.discountedPrice != null &&
                            product.validFrom &&
                            product.validTo &&
                            now >= new Date(product.validFrom) &&
                            now <= new Date(product.validTo);
        const price = isOfferValid ? product.discountedPrice : product.originalPrice;
        return sum + (price * item.boxes);
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

