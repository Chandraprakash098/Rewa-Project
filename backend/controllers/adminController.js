// const cloudinary = require('../config/cloudinary');
// const User = require('../models/User');
// const Product = require('../models/Product');
// const Order = require('../models/Order');

// const adminController = {
//   // User Management
//   getAllUsers: async (req, res) => {
//     try {
//       const users = await User.find({ role: 'user' }).select('-password');
//       res.json({ users });
//     } catch (error) {
//       res.status(500).json({ error: 'Error fetching users' });
//     }
//   },

//   toggleUserStatus: async (req, res) => {
//     try {
//       const user = await User.findById(req.params.userId);
//       if (!user) return res.status(404).json({ error: 'User not found' });
      
//       user.isActive = !user.isActive;
//       await user.save();
      
//       res.json({ message: 'User status updated', isActive: user.isActive });
//     } catch (error) {
//       res.status(500).json({ error: 'Error updating user status' });
//     }
//   },

//   // // Product Management
//   // createProduct: async (req, res) => {
//   //   try {
//   //     const { name, description, price, quantity, isOffer, offerPrice } = req.body;
//   //     const image = req.file ? req.file.path : null;

//   //     const product = new Product({
//   //       name,
//   //       description,
//   //       price,
//   //       quantity,
//   //       image,
//   //       isOffer,
//   //       offerPrice
//   //     });

//   //     await product.save();
//   //     res.status(201).json({ product });
//   //   } catch (error) {
//   //     res.status(500).json({ error: 'Error creating product' });
//   //   }
//   // },

//   // updateProduct: async (req, res) => {
//   //   try {
//   //     const updates = req.body;
//   //     if (req.file) {
//   //       updates.image = req.file.path;
//   //     }

//   //     const product = await Product.findByIdAndUpdate(
//   //       req.params.productId,
//   //       updates,
//   //       { new: true }
//   //     );

//   //     if (!product) return res.status(404).json({ error: 'Product not found' });
//   //     res.json({ product });
//   //   } catch (error) {
//   //     res.status(500).json({ error: 'Error updating product' });
//   //   }
//   // },

//   createProduct : async (req, res) => {
//     try {
//       console.log("File received:", req.file);
//       console.log("Request body:", req.body);
  
//       const { name, description, price, quantity, isOffer, offerPrice } = req.body;
//       let imageUrl = null;
  
//       if (req.file) {
//         try {
//           // Read the file from disk
//           const imageBuffer = require('fs').readFileSync(req.file.path);
//           const b64 = Buffer.from(imageBuffer).toString('base64');
//           const dataURI = `data:${req.file.mimetype};base64,${b64}`;
  
//           console.log("Attempting Cloudinary upload...");
  
//           const result = await cloudinary.uploader.upload(dataURI, {
//             folder: 'products',
//             resource_type: 'auto'
//           });
  
//           console.log("Cloudinary result:", result);
//           imageUrl = result.secure_url;
  
//           // Clean up: Delete the file from local storage after upload
//           require('fs').unlinkSync(req.file.path);
//         } catch (uploadError) {
//           console.error('Cloudinary upload error:', uploadError);
//           return res.status(500).json({ error: 'Error uploading image' });
//         }
//       } else {
//         console.log("No file received in request");
//       }
  
//       const product = new Product({
//         name,
//         description,
//         price,
//         quantity,
//         image: imageUrl,
//         isOffer,
//         offerPrice
//       });
  
//       await product.save();
//       res.status(201).json({ product });
//     } catch (error) {
//       console.error('Error creating product:', error);
//       res.status(500).json({ error: 'Error creating product' });
//     }
//   },

//   updateProduct: async (req, res) => {
//     try {
//       const updates = req.body;
      
//       if (req.file) {
//         // Convert buffer to base64
//         const b64 = Buffer.from(req.file.buffer).toString('base64');
//         const dataURI = `data:${req.file.mimetype};base64,${b64}`;
        
//         // Upload to Cloudinary
//         const result = await cloudinary.uploader.upload(dataURI, {
//           folder: 'products',
//           resource_type: 'auto'
//         });
        
//         updates.image = result.secure_url;
        
//         // Optionally: Delete old image from Cloudinary if exists
//         const oldProduct = await Product.findById(req.params.productId);
//         if (oldProduct && oldProduct.image) {
//           const publicId = oldProduct.image.split('/').pop().split('.')[0];
//           await cloudinary.uploader.destroy(`products/${publicId}`);
//         }
//       }

//       const product = await Product.findByIdAndUpdate(
//         req.params.productId,
//         updates,
//         { new: true }
//       );

//       if (!product) return res.status(404).json({ error: 'Product not found' });
//       res.json({ product });
//     } catch (error) {
//       console.error('Error updating product:', error);
//       res.status(500).json({ error: 'Error updating product' });
//     }
//   },


//   // Order Management
//   getAllOrders: async (req, res) => {
//     try {
//       const { status, paymentMethod, startDate, endDate } = req.query;
//       let query = {};

//       if (status) query.status = status;
//       if (paymentMethod) query.paymentMethod = paymentMethod;
//       if (startDate && endDate) {
//         query.createdAt = {
//           $gte: new Date(startDate),
//           $lte: new Date(endDate)
//         };
//       }

//       const orders = await Order.find(query)
//         .populate('user', 'name customerDetails.firmName')
//         .populate('products.product', 'name price');

//       res.json({ orders });
//     } catch (error) {
//       res.status(500).json({ error: 'Error fetching orders' });
//     }
//   },

//   updateOrderStatus: async (req, res) => {
//     try {
//       const { status, deliveryNote } = req.body;
//       const order = await Order.findById(req.params.orderId);

//       if (!order) return res.status(404).json({ error: 'Order not found' });

//       order.status = status;
//       if (deliveryNote) {
//         order.deliveryNote = {
//           ...deliveryNote,
//           createdAt: new Date()
//         };
//       }

//       await order.save();
//       res.json({ order });
//     } catch (error) {
//       res.status(500).json({ error: 'Error updating order status' });
//     }
//   },

//   // Dashboard Statistics
//   getDashboardStats: async (req, res) => {
//     try {
//       const stats = {
//         users: await User.countDocuments({ role: 'user' }),
//         activeUsers: await User.countDocuments({ role: 'user', isActive: true }),
//         products: await Product.countDocuments(),
//         lowStock: await Product.countDocuments({ quantity: { $lt: 10 } }),
//         pendingOrders: await Order.countDocuments({ status: 'pending' }),
//         completedOrders: await Order.countDocuments({ status: 'completed' })
//       };

//       res.json({ stats });
//     } catch (error) {
//       res.status(500).json({ error: 'Error fetching dashboard stats' });
//     }
//   }
// };

// module.exports = adminController;






const cloudinary = require('../config/cloudinary');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');

const adminController = {
  

  getAllUsers : async (req, res) => {
    try {
      const users = await User.find({ role: 'user' })
        .select('name email phoneNumber customerDetails.firmName isActive createdAt')
        .sort({ createdAt: -1 });
      
      res.json({ 
        users: users.map(user => ({
          _id: user._id,
          name: user.name,
          email: user.email,
          phoneNumber: user.phoneNumber,
          firmName: user.customerDetails?.firmName,
          isActive: user.isActive,
          createdAt: user.createdAt
        }))
      });
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ error: 'Error fetching users' });
    }
  },

  

  toggleUserStatus : async (req, res) => {
    try {
      const { userId } = req.params;
      const user = await User.findById(userId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
  
      // Only allow toggling regular users, not admins
      if (user.role !== 'user') {
        return res.status(403).json({ error: 'Cannot modify admin user status' });
      }
  
      // Toggle the status
      user.isActive = !user.isActive;
      await user.save();
  
      res.json({ 
        message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
        userId: user._id,
        isActive: user.isActive 
      });
    } catch (error) {
      console.error('Error toggling user status:', error);
      res.status(500).json({ error: 'Error updating user status' });
    }
  },

  

  


  createProduct : async (req, res) => {
    try {
      const { 
        name, 
        type,
        category,
        description, 
        originalPrice, 
        discountedPrice, 
        quantity, 
        isOffer 
      } = req.body;
  
      // Validate category based on type
      const validCategories = Product.getCategoriesByType(type);
      if (!validCategories.includes(category)) {
        return res.status(400).json({ 
          error: `Invalid category for ${type}. Valid categories are: ${validCategories.join(', ')}` 
        });
      }
  
      let imageUrl = null;
  
      if (req.file) {
        const imageBuffer = require('fs').readFileSync(req.file.path);
        const b64 = Buffer.from(imageBuffer).toString('base64');
        const dataURI = `data:${req.file.mimetype};base64,${b64}`;
  
        const result = await cloudinary.uploader.upload(dataURI, {
          folder: 'products',
          resource_type: 'auto'
        });
  
        imageUrl = result.secure_url;
        require('fs').unlinkSync(req.file.path);
      }
  
      const product = new Product({
        name,
        type,
        category,
        description,
        originalPrice: Number(originalPrice),
        discountedPrice: discountedPrice ? Number(discountedPrice) : null,
        quantity,
        image: imageUrl,
        isOffer: Boolean(isOffer && discountedPrice && discountedPrice < originalPrice)
      });
  
      await product.save();
      res.status(201).json({ product });
    } catch (error) {
      console.error('Error creating product:', error);
      res.status(500).json({ error: error.message || 'Error creating product' });
    }
  },

  getCategories : async (req, res) => {
    try {
      const { type } = req.query;
      if (!type) {
        return res.status(400).json({ error: 'Type parameter is required' });
      }
      
      const categories = Product.getCategoriesByType(type);
      res.json({ categories });
    } catch (error) {
      res.status(500).json({ error: 'Error fetching categories' });
    }
  },

  getAllProducts :async (req, res) => {
    try {
      const products = await Product.find({});
      res.json({ products });
    } catch (error) {
      res.status(500).json({ error: 'Error fetching products' });
    }
  },
  
  deleteProduct :async (req, res) => {
    try {
      const product = await Product.findByIdAndDelete(req.params.productId);
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
      res.json({ message: 'Product deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Error deleting product' });
    }
  },

  updateProduct: async (req, res) => {
    try {
      const updates = {
        ...req.body,
        originalPrice: req.body.originalPrice ? Number(req.body.originalPrice) : undefined,
        discountedPrice: req.body.discountedPrice ? Number(req.body.discountedPrice) : null
      };

      // Update isOffer based on whether there's a valid discount
      if (updates.originalPrice || updates.discountedPrice) {
        const currentProduct = await Product.findById(req.params.productId);
        const finalOriginalPrice = updates.originalPrice || currentProduct.originalPrice;
        const finalDiscountedPrice = updates.discountedPrice;
        
        updates.isOffer = Boolean(finalDiscountedPrice && finalDiscountedPrice < finalOriginalPrice);
      }
      
      if (req.file) {
        const b64 = Buffer.from(req.file.buffer).toString('base64');
        const dataURI = `data:${req.file.mimetype};base64,${b64}`;
        
        const result = await cloudinary.uploader.upload(dataURI, {
          folder: 'products',
          resource_type: 'auto'
        });
        
        updates.image = result.secure_url;
        
        const oldProduct = await Product.findById(req.params.productId);
        if (oldProduct && oldProduct.image) {
          const publicId = oldProduct.image.split('/').pop().split('.')[0];
          await cloudinary.uploader.destroy(`products/${publicId}`);
        }
      }

      const product = await Product.findByIdAndUpdate(
        req.params.productId,
        updates,
        { new: true }
      );

      if (!product) return res.status(404).json({ error: 'Product not found' });
      res.json({ product });
    } catch (error) {
      console.error('Error updating product:', error);
      res.status(500).json({ error: 'Error updating product' });
    }
  },


  getPreviewOrders: async (req, res) => {
    try {
      const orders = await Order.find({
        orderStatus: 'preview'
      })
      .populate('user', 'name customerDetails.firmName customerDetails.userCode')
      .populate('products.product')
      .populate('statusHistory.updatedBy', 'name role')
      .sort({ createdAt: -1 });

      res.json({ orders });
    } catch (error) {
      res.status(500).json({ error: 'Error fetching preview orders' });
    }
  },

  processPreviewOrder: async (req, res) => {
    try {
      const { orderId } = req.params;
      const order = await Order.findById(orderId);

      if (!order || order.orderStatus !== 'preview') {
        return res.status(400).json({ error: 'Invalid preview order' });
      }

      order._updatedBy = req.user._id;
      order.orderStatus = 'processing';
      await order.save();

      res.json({ message: 'Order moved to processing', order });
    } catch (error) {
      res.status(500).json({ error: 'Error processing order' });
    }
  },

  // getAllOrders: async (req, res) => {
  //   try {
  //     const orders = await Order.find({})
  //       .populate('user', 'name customerDetails.firmName customerDetails.userCode customerDetails.userCode.email')
  //       .populate('products.product')
  //       .populate('statusHistory.updatedBy', 'name role')
  //       .sort({ createdAt: -1 });

  //     res.json({ orders });
  //   } catch (error) {
  //     res.status(500).json({ error: 'Error fetching orders' });
  //   }
  // },

  getAllOrders : async (req, res) => {
    try {
      const orders = await Order.find({})
        .select('orderId firmName gstNumber shippingAddress paymentStatus paymentMethod orderStatus createdAt')
        .populate('user', 'name customerDetails.firmName customerDetails.userCode')
        .sort({ createdAt: -1 });
  
      res.json({ orders });
    } catch (error) {
      res.status(500).json({ error: 'Error fetching orders' });
    }
  },

  

  updateOrderStatus : async (req, res) => {
    try {
      const { orderStatus, deliveryNote } = req.body;
      const order = await Order.findById(req.params.orderId);
  
      if (!order) return res.status(404).json({ error: 'Order not found' });
  
      // Validate that the provided status is valid according to the enum
      if (!['processing', 'confirmed', 'shipped', 'delivered', 'cancelled'].includes(orderStatus)) {
        return res.status(400).json({ error: 'Invalid order status' });
      }
  
      order.orderStatus = orderStatus;  // Updated to use correct field name
      if (deliveryNote) {
        order.deliveryNote = {
          ...deliveryNote,
          createdAt: new Date()
        };
      }
  
      await order.save();
      res.json({ order });
    } catch (error) {
      console.error('Error updating order status:', error);
      res.status(500).json({ error: 'Error updating order status' });
    }
  },




// getDashboardStats : async (req, res) => {
//   try {
//     const stats = {
//       users: {
//         total: await User.countDocuments({ role: 'user' }),
//         active: await User.countDocuments({ role: 'user', isActive: true }),
//         inactive: await User.countDocuments({ role: 'user', isActive: false })
//       },
//       products: {
//         total: await Product.countDocuments(),
//         bottles: await Product.countDocuments({ type: 'Bottle' }),
//         rawMaterials: await Product.countDocuments({ type: 'Raw Material' })
//       },
//       orders: {
//         pending: await Order.countDocuments({ orderStatus: 'processing' }),
//         confirmed: await Order.countDocuments({ orderStatus: 'confirmed' }),
//         shipped: await Order.countDocuments({ orderStatus: 'shipped' }),
//         delivered: await Order.countDocuments({ orderStatus: 'delivered' }),
//         cancelled: await Order.countDocuments({ orderStatus: 'cancelled' })
//       }
//     };

//     res.json({ stats });
//   } catch (error) {
//     console.error('Error fetching dashboard stats:', error);
//     res.status(500).json({ error: 'Error fetching dashboard stats' });
//   }
// },

getDashboardStats : async (req, res) => {
  try {
    // Get user stats
    const users = {
      total: await User.countDocuments({ role: 'user' }),
      active: await User.countDocuments({ role: 'user', isActive: true }),
      inactive: await User.countDocuments({ role: 'user', isActive: false })
    };

    // Get product stats
    const products = {
      total: await Product.countDocuments(),
      bottles: await Product.countDocuments({ type: 'Bottle' }),
      rawMaterials: await Product.countDocuments({ type: 'Raw Material' })
    };

    // Get order stats with all possible statuses
    const orders = {
      pending: await Order.countDocuments({ orderStatus: 'pending' }),
      preview: await Order.countDocuments({ orderStatus: 'preview' }),
      processing: await Order.countDocuments({ orderStatus: 'processing' }),
      confirmed: await Order.countDocuments({ orderStatus: 'confirmed' }),
      shipped: await Order.countDocuments({ orderStatus: 'shipped' }),
      delivered: await Order.countDocuments({ orderStatus: 'delivered' }),
      cancelled: await Order.countDocuments({ orderStatus: 'cancelled' })
    };

    // Calculate orders requiring attention (pending > 6 hours)
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
    const ordersRequiringAttention = await Order.countDocuments({
      orderStatus: 'pending',
      createdAt: { $lte: sixHoursAgo }
    });

    // Get recent order activity
    const recentOrderActivity = await Order.find({})
      .sort({ updatedAt: -1 })
      .limit(5)
      .select('orderId orderStatus statusHistory')
      .populate('statusHistory.updatedBy', 'name role');

    // Send complete stats
    const stats = {
      users,
      products,
      orders,
      // alerts: {
      //   ordersRequiringAttention,
      // },
      // recentActivity: recentOrderActivity
    };

    res.json({ stats });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Error fetching dashboard stats' });
  }
},

checkUserStatus : async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user || !user.isActive) {
      return res.status(403).json({ 
        error: 'Your account is currently inactive. Please contact admin for support.' 
      });
    }
    
    next();
  } catch (error) {
    res.status(500).json({ error: 'Error checking user status' });
  }
}

};


 
  

module.exports = adminController;