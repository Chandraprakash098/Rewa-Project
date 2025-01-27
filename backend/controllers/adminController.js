
const cloudinary = require('../config/cloudinary');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const MarketingActivity = require('../models/MarketingActivity');
const Attendance = require('../models/Attendance')
const UserActivity = require('../models/UserActivity')

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

  //new

  getUserActivityHistory: async (req, res) => {
    try {
      const { userId } = req.params;
      const { startDate, endDate } = req.query;

      // Validate user exists
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Get user activity records
      const activityHistory = await UserActivity.findOne({ user: userId });
      if (!activityHistory) {
        return res.status(404).json({ error: 'No activity history found' });
      }

      // Get orders within date range if specified
      let orderQuery = { user: userId };
      if (startDate && endDate) {
        orderQuery.createdAt = {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        };
      }
      const orders = await Order.find(orderQuery)
        .select('createdAt totalAmount orderStatus')
        .sort({ createdAt: -1 });

      // Calculate active/inactive periods
      const periods = activityHistory.activityPeriods.map(period => ({
        startDate: period.startDate,
        endDate: period.endDate || new Date(),
        status: period.status,
        duration: Math.ceil(
          (period.endDate || new Date() - period.startDate) / (1000 * 60 * 60 * 24)
        )
      }));

      res.json({
        userId,
        userName: user.name,
        currentStatus: user.isActive ? 'active' : 'inactive',
        activityPeriods: periods,
        orders: orders.map(order => ({
          orderId: order._id,
          date: order.createdAt,
          amount: order.totalAmount,
          status: order.orderStatus
        }))
      });
    } catch (error) {
      console.error('Error fetching user activity:', error);
      res.status(500).json({ error: 'Error fetching user activity history' });
    }
  },

  

  // toggleUserStatus : async (req, res) => {
  //   try {
  //     const { userId } = req.params;
  //     const user = await User.findById(userId);
      
  //     if (!user) {
  //       return res.status(404).json({ error: 'User not found' });
  //     }
  
  //     // Only allow toggling regular users, not admins
  //     if (user.role !== 'user') {
  //       return res.status(403).json({ error: 'Cannot modify admin user status' });
  //     }
  
  //     // Toggle the status
  //     user.isActive = !user.isActive;
  //     await user.save();
  
  //     res.json({ 
  //       message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
  //       userId: user._id,
  //       isActive: user.isActive 
  //     });
  //   } catch (error) {
  //     console.error('Error toggling user status:', error);
  //     res.status(500).json({ error: 'Error updating user status' });
  //   }
  // },

  toggleUserStatus: async (req, res) => {
    try {
      const { userId } = req.params;
      const user = await User.findById(userId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (user.role !== 'user') {
        return res.status(403).json({ error: 'Cannot modify admin user status' });
      }

      // Toggle the status
      const newStatus = !user.isActive;
      user.isActive = newStatus;

      // Update or create activity record
      let userActivity = await UserActivity.findOne({ user: userId });
      
      if (!userActivity) {
        userActivity = new UserActivity({
          user: userId,
          activityPeriods: [{
            startDate: user.createdAt,
            status: 'active'
          }]
        });
      }

      // Close the last period and start a new one
      const lastPeriod = userActivity.activityPeriods[userActivity.activityPeriods.length - 1];
      if (lastPeriod && !lastPeriod.endDate) {
        lastPeriod.endDate = new Date();
      }

      userActivity.activityPeriods.push({
        startDate: new Date(),
        status: newStatus ? 'active' : 'inactive'
      });

      // Save both user and activity records
      await Promise.all([
        user.save(),
        userActivity.save()
      ]);

      res.json({
        message: `User ${newStatus ? 'activated' : 'deactivated'} successfully`,
        userId: user._id,
        isActive: newStatus
      });
    } catch (error) {
      console.error('Error toggling user status:', error);
      res.status(500).json({ error: 'Error updating user status' });
    }
  },


  createProduct: async (req, res) => {
    try {
      const { 
        name, 
        type,
        category,
        description, 
        originalPrice, 
        discountedPrice, 
        quantity,
        validFrom,
        validTo
      } = req.body;
  
      // Validate category based on type
      const validCategories = Product.getCategoriesByType(type);
      if (!validCategories.includes(category)) {
        return res.status(400).json({ 
          error: `Invalid category for ${type}. Valid categories are: ${validCategories.join(', ')}` 
        });
      }
  
      // Validate offer dates if discount is provided
      if (discountedPrice) {
        if (!validFrom || !validTo) {
          return res.status(400).json({
            error: 'validFrom and validTo dates are required when setting a discounted price'
          });
        }
  
        const fromDate = new Date(validFrom);
        const toDate = new Date(validTo);
        const now = new Date();
  
        if (fromDate > toDate) {
          return res.status(400).json({
            error: 'validTo date must be after validFrom date'
          });
        }
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
        validFrom: validFrom || null,
        validTo: validTo || null
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


  // getAllProducts : async (req, res) => {
  //     try {
  //       const { type, category } = req.query;
  //       let query = { isActive: true };
        
  //       if (type) {
  //         query.type = type;
          
  //         if (category) {
  //           const validCategories = Product.getCategoriesByType(type);
  //           if (!validCategories.includes(category)) {
  //             return res.status(400).json({ error: 'Invalid category for the selected type' });
  //           }
  //           query.category = category;
  //         }
  //       }
        
  //       const products = await Product.find(query);
  //       res.json({ products });
  //     } catch (error) {
  //       res.status(500).json({ error: 'Error fetching products' });
  //     }
  //   },

  getAllProducts: async (req, res) => {
    try {
        const { type, category } = req.query;
        let query = { isActive: true };
        
        if (type) {
            query.type = type;
            
            if (category) {
                const validCategories = Product.getCategoriesByType(type);
                if (!validCategories.includes(category)) {
                    return res.status(400).json({ error: 'Invalid category for the selected type' });
                }
                query.category = category;
            }
        }
        
        const products = await Product.find(query)
            .populate({
                path: 'stockRemarks.updatedBy',
                select: 'name'
            })
            .sort({ 'stockRemarks.updatedAt': -1 });

        // Format the response with stock information for admin
        const formattedProducts = products.map(product => {
            const productObj = product.toObject({ virtuals: true });
            
            // Add stock update information if available
            if (productObj.stockRemarks && productObj.stockRemarks.length > 0) {
                productObj.stockUpdateInfo = {
                    lastUpdate: {
                        message: productObj.stockRemarks[0].message,
                        updatedBy: productObj.stockRemarks[0].updatedBy?.name || 'Unknown User',
                        updatedAt: productObj.stockRemarks[0].updatedAt,
                        quantity: productObj.stockRemarks[0].quantity,
                        changeType: productObj.stockRemarks[0].changeType
                    },
                    totalUpdates: productObj.stockRemarks.length
                };
            }
            
            return productObj;
        });

        res.json({ products: formattedProducts });
    } catch (error) {
        console.error('Error in admin getAllProducts:', error);
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
        discountedPrice: req.body.discountedPrice ? Number(req.body.discountedPrice) : null,
        validFrom: req.body.validFrom || null,
        validTo: req.body.validTo || null
      };
  
      // Validate offer dates if discount is being updated
      if (updates.discountedPrice !== undefined) {
        if (updates.discountedPrice && (!updates.validFrom || !updates.validTo)) {
          return res.status(400).json({
            error: 'validFrom and validTo dates are required when setting a discounted price'
          });
        }
  
        if (updates.validFrom && updates.validTo) {
          const fromDate = new Date(updates.validFrom);
          const toDate = new Date(updates.validTo);
  
          if (fromDate > toDate) {
            return res.status(400).json({
              error: 'validTo date must be after validFrom date'
            });
          }
        }
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
      .populate('user', 'name phoneNumber customerDetails.firmName customerDetails.userCode')
      .populate('products.product')
      .populate('statusHistory.updatedBy', 'name role')
      .sort({ createdAt: -1 });

      res.json({ orders });
    } catch (error) {
      res.status(500).json({ error: 'Error fetching preview orders' });
    }
  },

  // processPreviewOrder: async (req, res) => {
  //   try {
  //     const { orderId } = req.params;
  //     const order = await Order.findById(orderId);

  //     if (!order || order.orderStatus !== 'preview') {
  //       return res.status(400).json({ error: 'Invalid preview order' });
  //     }

  //     order._updatedBy = req.user._id;
  //     order.orderStatus = 'processing';
  //     await order.save();

  //     res.json({ message: 'Order moved to processing', order });
  //   } catch (error) {
  //     res.status(500).json({ error: 'Error processing order' });
  //   }
  // },


  processPreviewOrder: async (req, res) => {
    try {
      const { orderId } = req.params;
      console.log('Processing orderId:', orderId);
  
      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(400).json({ error: 'Order not found' });
      }
      if (order.orderStatus !== 'preview') {
        return res.status(400).json({ error: 'Invalid preview order status' });
      }
  
      console.log('Order found:', order);
  
      if (!req.user || !req.user._id) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
  
      // Ensure userActivityStatus is set
      order.userActivityStatus = order.userActivityStatus || 'active';
  
      order._updatedBy = req.user._id;
      order.orderStatus = 'processing';
  
      await order.save();
      console.log('Order updated to processing:', order);
  
      res.json({ message: 'Order moved to processing', order });
    } catch (error) {
      console.error('Error processing order:', error);
      res.status(500).json({ error: 'Error processing order', details: error.message });
    }
  },
  
  
  

  getAllOrders : async (req, res) => {
    try {
      const { type } = req.query;
      let query = {};
  
      // If type is provided and is valid, add it to the query
      if (type && ['Bottle', 'Raw Material', 'all'].includes(type)) {
        if (type !== 'all') {
          query.type = type;
        }
      }
  
      const orders = await Order.find(query)
        .select('orderId firmName gstNumber shippingAddress paymentStatus paymentMethod orderStatus createdAt type totalAmount products')
        .populate('user', 'name phoneNumber customerDetails.firmName customerDetails.userCode')
        .populate('products.product', 'name type')
        .sort({ createdAt: -1 });
  
      // Group orders by type for the response
      const groupedOrders = {
        all: orders,
        Bottle: orders.filter(order => order.type === 'Bottle'),
        'Raw Material': orders.filter(order => order.type === 'Raw Material')
      };
  
      // If type is specified, only return that type's orders
      const responseOrders = type ? (type === 'all' ? orders : groupedOrders[type]) : orders;
  
      res.json({ 
        orders: responseOrders,
        totalOrders: responseOrders.length,
        summary: {
          totalBottleOrders: groupedOrders['Bottle'].length,
          totalRawMaterialOrders: groupedOrders['Raw Material'].length,
          totalOrders: orders.length
        }
      });
  
    } catch (error) {
      console.error('Error in getAllOrders:', error);
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
},





//For Marketing

getAllMarketingActivities: async (req, res) => {
  try {
    const activities = await MarketingActivity.find({})
      .populate('marketingUser', 'name email customerDetails.firmName')
      .sort({ createdAt: -1 });

    res.json({ activities });
  } catch (error) {
    console.error('Error fetching marketing activities:', error);
    res.status(500).json({ error: 'Error fetching marketing activities' });
  }
},

// Review marketing activity
reviewMarketingActivity: async (req, res) => {
  try {
    const activity = await MarketingActivity.findById(req.params.activityId);
    
    if (!activity) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    activity.status = 'reviewed';
    activity.reviewedAt = new Date();
    activity.reviewedBy = req.user._id;
    
    await activity.save();

    res.json({ 
      message: 'Marketing activity reviewed successfully',
      activity 
    });
  } catch (error) {
    console.error('Error reviewing marketing activity:', error);
    res.status(500).json({ error: 'Error reviewing marketing activity' });
  }
},



//For panels Attendance except user

// getAllAttendance: async (req, res) => {
//   try {
//     const { startDate, endDate, panel, userId } = req.query;

//     let query = {};

//     // Add date range filter
//     if (startDate && endDate) {
//       query.date = {
//         $gte: new Date(startDate),
//         $lte: new Date(endDate)
//       };
//     }

//     // Add panel filter
//     if (panel) {
//       query.panel = panel;
//     }

//     // Add user filter
//     if (userId) {
//       query.user = userId;
//     }

//     const attendance = await Attendance.find(query)
//       .populate('user', 'name email customerDetails.firmName panel')
//       .sort({ date: -1 });

//     // Calculate summary statistics
//     const summary = {
//       totalRecords: attendance.length,
//       totalHours: attendance.reduce((sum, record) => sum + (record.totalHours || 0), 0),
//       averageHoursPerDay: attendance.reduce((sum, record) => sum + (record.totalHours || 0), 0) / (attendance.length || 1),
//       byPanel: attendance.reduce((acc, record) => {
//         acc[record.panel] = (acc[record.panel] || 0) + 1;
//         return acc;
//       }, {})
//     };

//     res.json({ 
//       attendance, 
//       summary 
//     });
//   } catch (error) {
//     console.error('Error fetching attendance:', error);
//     res.status(500).json({ error: 'Error fetching attendance' });
//   }
// },

// // Get summary of attendance for dashboard
// getAttendanceSummary: async (req, res) => {
//   try {
//     const today = new Date();
//     today.setHours(0, 0, 0, 0);

//     const summary = {
//       todayCheckIns: await Attendance.countDocuments({
//         date: { $gte: today },
//         status: 'checked-in'
//       }),
//       todayCheckOuts: await Attendance.countDocuments({
//         date: { $gte: today },
//         status: 'checked-out'
//       }),
//       activeUsers: await Attendance.distinct('user', {
//         date: { $gte: today },
//         status: 'checked-in'
//       }),
//       panelBreakdown: await Attendance.aggregate([
//         { 
//           $match: { 
//             date: { $gte: today } 
//           } 
//         },
//         { 
//           $group: { 
//             _id: '$panel', 
//             count: { $sum: 1 } 
//           } 
//         }
//       ])
//     };

//     res.json({ summary });
//   } catch (error) {
//     console.error('Error fetching attendance summary:', error);
//     res.status(500).json({ error: 'Error fetching attendance summary' });
//   }
// }


getAllAttendance: async (req, res) => {
  try {
    const { startDate, endDate, panel, userId, includeImages } = req.query;

    let query = {};

    // Add date range filter
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Add panel filter
    if (panel) {
      query.panel = panel;
    }

    // Add user filter
    if (userId) {
      query.user = userId;
    }

    // Prepare population and projection
    let populateOptions = {
      path: 'user', 
      select: 'name email customerDetails.firmName panel'
    };

    // If includeImages is true, we'll include the checkInImage
    let selectOptions = includeImages 
      ? 'user panel checkInTime checkOutTime date totalHours status checkInImage' 
      : 'user panel checkInTime checkOutTime date totalHours status';

    const attendance = await Attendance.find(query)
      .populate(populateOptions)
      .select(selectOptions)
      .sort({ date: -1 });

    // Calculate summary statistics
    const summary = {
      totalRecords: attendance.length,
      totalHours: attendance.reduce((sum, record) => sum + (record.totalHours || 0), 0),
      averageHoursPerDay: attendance.reduce((sum, record) => sum + (record.totalHours || 0), 0) / (attendance.length || 1),
      byPanel: attendance.reduce((acc, record) => {
        acc[record.panel] = (acc[record.panel] || 0) + 1;
        return acc;
      }, {})
    };

    res.json({ 
      attendance, 
      summary 
    });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({ error: 'Error fetching attendance', details: error.message });
  }
},

// Get summary of attendance for dashboard
getAttendanceSummary: async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const summary = {
      todayCheckIns: await Attendance.countDocuments({
        date: { $gte: today },
        status: 'checked-in'
      }),
      todayCheckOuts: await Attendance.countDocuments({
        date: { $gte: today },
        status: 'checked-out'
      }),
      activeUsers: await Attendance.distinct('user', {
        date: { $gte: today },
        status: 'checked-in'
      }),
      panelBreakdown: await Attendance.aggregate([
        { 
          $match: { 
            date: { $gte: today } 
          } 
        },
        { 
          $group: { 
            _id: '$panel', 
            count: { $sum: 1 } 
          } 
        }
      ]),
      // New method to get check-in images for today
      todayCheckInImages: await Attendance.find({
        date: { $gte: today },
        checkInImage: { $ne: null }
      }).select('user checkInImage date panel')
      .populate('user', 'name')
    };

    res.json({ summary });
  } catch (error) {
    console.error('Error fetching attendance summary:', error);
    res.status(500).json({ error: 'Error fetching attendance summary', details: error.message });
  }
},

// New method to get check-in images
getCheckInImages: async (req, res) => {
  try {
    const { startDate, endDate, panel, userId } = req.query;

    let query = {
      checkInImage: { $ne: null }
    };

    // Add date range filter
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Add panel filter
    if (panel) {
      query.panel = panel;
    }

    // Add user filter
    if (userId) {
      query.user = userId;
    }

    const checkInImages = await Attendance.find(query)
      .select('user checkInImage date panel')
      .populate('user', 'name email');

    res.json({ 
      checkInImages,
      total: checkInImages.length
    });
  } catch (error) {
    console.error('Error fetching check-in images:', error);
    res.status(500).json({ error: 'Error fetching check-in images', details: error.message });
  }
}

};


 
  

module.exports = adminController;