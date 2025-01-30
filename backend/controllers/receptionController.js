const User = require('../models/User');
const Order = require('../models/Order');
const fs = require('fs').promises;
const path = require('path');
const jwt = require('jsonwebtoken');
const Attendance = require('../models/Attendance')
const cloudinary = require('../config/cloudinary');
const Product= require('../models/Product')


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
        totalAmountWithDelivery: totalAmount, // Initially set to total amount
        paymentMethod,
        shippingAddress: user.customerDetails.address,
        firmName: user.customerDetails.firmName,
        gstNumber: user.customerDetails.gstNumber,
        type: orderProducts[0].product.type, // Get the type of the first product
        paymentStatus: paymentMethod === 'COD' ? 'pending' : 'completed',
        orderStatus: 'pending'
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
      .populate('user', 'name phoneNumber customerDetails.firmName customerDetails.userCode')
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
  },


//new 
  getPendingOrders: async (req, res) => {
    try {
      const orders = await Order.find({
        orderStatus: 'pending'
      })
      .populate('user', 'name phoneNumber customerDetails.firmName customerDetails.userCode')
      .populate('products.product')
      .sort({ createdAt: -1 });

      res.json({ orders });
    } catch (error) {
      res.status(500).json({ error: 'Error fetching pending orders' });
    }
  },

  updateOrderStatus: async (req, res) => {
    try {
      const { orderId } = req.params;
      const { status } = req.body;

      if (status !== 'processing') {
        return res.status(400).json({ error: 'Reception can only set orders to processing status' });
      }

      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      if (order.orderStatus !== 'pending' && order.orderStatus !== 'preview') {
        return res.status(400).json({ error: 'Can only process pending or preview orders' });
      }

      order._updatedBy = req.user._id;
      order.orderStatus = status;
      await order.save();

      res.json({ message: 'Order status updated successfully', order });
    } catch (error) {
      res.status(500).json({ error: 'Error updating order status' });
    }
  },



// checkIn: async (req, res) => {
//   try {
//     // Check if an image was uploaded
//     if (!req.file) {
//       return res.status(400).json({ 
//         error: 'Please upload a check-in image' 
//       });
//     }

//     // Check if user is already checked in today
//     const today = new Date();
//     today.setHours(0, 0, 0, 0);

//     const existingAttendance = await Attendance.findOne({
//       user: req.user._id,
//       panel: 'reception',
//       date: { $gte: today },
//       status: 'checked-in'
//     });

//     if (existingAttendance) {
//       return res.status(400).json({ 
//         error: 'You are already checked in today' 
//       });
//     }

//     // Upload image to Cloudinary
//     const cloudinaryResponse = await cloudinary.uploader.upload(req.file.path, {
//       folder: 'check-in-photos',
//       resource_type: 'image'
//     });

//     // Create new attendance record
//     const attendance = new Attendance({
//       user: req.user._id,
//       panel: 'reception',
//       checkInTime: new Date(),
//       date: new Date(),
//       status: 'checked-in',
//       checkInImage: cloudinaryResponse.secure_url // Store Cloudinary image URL
//     });

//     await attendance.save();

//     res.json({ 
//       message: 'Check-in successful', 
//       attendance 
//     });
//   } catch (error) {
//     console.error('Check-in error:', error);
//     res.status(500).json({ 
//       error: 'Error during check-in', 
//       details: error.message 
//     });
//   }
// },

// // Check-out functionality remains the same
// checkOut: async (req, res) => {
//   try {
//     const today = new Date();
//     today.setHours(0, 0, 0, 0);

//     // Find the active check-in for today
//     const attendance = await Attendance.findOne({
//       user: req.user._id,
//       panel: 'reception',
//       date: { $gte: today },
//       status: 'checked-in'
//     });

//     if (!attendance) {
//       return res.status(400).json({ 
//         error: 'No active check-in found' 
//       });
//     }

//     // Update check-out time
//     attendance.checkOutTime = new Date();
//     attendance.status = 'checked-out';
//     await attendance.save();

//     res.json({ 
//       message: 'Check-out successful', 
//       attendance 
//     });
//   } catch (error) {
//     res.status(500).json({ 
//       error: 'Error during check-out', 
//       details: error.message 
//     });
//   }
// },



checkIn: async (req, res) => {
  try {
    const { selectedDate } = req.body;

    if (!req.file) {
      return res.status(400).json({
        error: 'Please upload a check-in image'
      });
    }

    if (!selectedDate) {
      return res.status(400).json({
        error: 'Please select a date for check-in'
      });
    }

    // Convert selectedDate to start of day
    const checkInDate = new Date(selectedDate);
    checkInDate.setHours(0, 0, 0, 0);

    // Check if already checked in for selected date
    const existingAttendance = await Attendance.findOne({
      user: req.user._id,
      panel: 'reception',
      selectedDate: checkInDate,
      $or: [{ status: 'checked-in' }, { status: 'present' }]
    });

    if (existingAttendance) {
      return res.status(400).json({
        error: 'Already checked in for this date'
      });
    }

    // Upload image to Cloudinary
    const cloudinaryResponse = await cloudinary.uploader.upload(req.file.path, {
      folder: 'check-in-photos',
      resource_type: 'image'
    });

    // Create new attendance record
    const attendance = new Attendance({
      user: req.user._id,
      panel: 'reception',
      checkInTime: new Date(),
      selectedDate: checkInDate,
      status: 'present',
      checkInImage: cloudinaryResponse.secure_url
    });

    await attendance.save();

    res.json({
      message: 'Check-in successful',
      attendance
    });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({
      error: 'Error during check-in',
      details: error.message
    });
  }
},

checkOut: async (req, res) => {
  try {
    const { selectedDate } = req.body;

    if (!selectedDate) {
      return res.status(400).json({
        error: 'Please select a date for check-out'
      });
    }

    const checkOutDate = new Date(selectedDate);
    checkOutDate.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({
      user: req.user._id,
      panel: 'reception',
      selectedDate: checkOutDate,
      status: 'present'
    });

    if (!attendance) {
      return res.status(400).json({
        error: 'No active check-in found for selected date'
      });
    }

    attendance.checkOutTime = new Date();
    attendance.status = 'checked-out';
    await attendance.save();

    res.json({
      message: 'Check-out successful',
      attendance
    });
  } catch (error) {
    res.status(500).json({
      error: 'Error during check-out',
      details: error.message
    });
  }
},



// Admin get attendance
getAttendance: async (req, res) => {
  try {
    const { startDate, endDate, panel, userId } = req.query;

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

    const attendance = await Attendance.find(query)
      .populate('user', 'name email customerDetails.firmName')
      .sort({ date: -1 });

    // Calculate summary statistics
    const summary = {
      totalRecords: attendance.length,
      totalHours: attendance.reduce((sum, record) => sum + (record.totalHours || 0), 0),
      averageHoursPerDay: attendance.reduce((sum, record) => sum + (record.totalHours || 0), 0) / (attendance.length || 1)
    };

    res.json({ 
      attendance, 
      summary 
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Error fetching attendance', 
      details: error.message 
    });
  }
},

addDeliveryCharge: async (req, res) => {
  try {
    const { orderId, deliveryCharge } = req.body;

    // Validate input
    if (!orderId || deliveryCharge === undefined || deliveryCharge < 0) {
      return res.status(400).json({ 
        error: 'Invalid order ID or delivery charge' 
      });
    }

    // Find the order
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check order status
    if (order.orderStatus !== 'pending' && order.orderStatus !== 'preview') {
      return res.status(400).json({ 
        error: 'Can only add delivery charge to pending or preview orders' 
      });
    }

    // Update order with delivery charge
    order.deliveryCharge = deliveryCharge;
    order.totalAmountWithDelivery = order.totalAmount + deliveryCharge;
    order.deliveryChargeAddedBy = req.user._id;
    order.orderStatus = 'processing'; // Move to processing after adding delivery charge

    await order.save();

    res.json({ 
      message: 'Delivery charge added successfully', 
      order 
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Error adding delivery charge', 
      details: error.message 
    });
  }
},


getUserAccessToken: async (req, res) => {
  try {
    const { userCode } = req.body;

    // Find user by userCode
    const user = await User.findOne({ 'customerDetails.userCode': userCode });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate a special token that includes both user and reception info
    const token = jwt.sign(
      { 
        userId: user._id,
        receptionId: req.user._id, // Original reception user's ID
        isReceptionAccess: true 
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' } // Short expiration for security
    );

    res.json({
      success: true,
      token,
      user: {
        name: user.name,
        email: user.email,
        firmName: user.customerDetails.firmName,
        userCode: user.customerDetails.userCode
      }
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Error generating user access token',
      details: error.message 
    });
  }
},

// Validate reception access
validateReceptionAccess: async (req, res) => {
  try {
    const { token } = req.body;
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if it's a reception access token
    if (!decoded.isReceptionAccess) {
      return res.status(401).json({ error: 'Invalid access token' });
    }

    // Find both user and reception
    const [user, reception] = await Promise.all([
      User.findById(decoded.userId),
      User.findById(decoded.receptionId)
    ]);

    if (!user || !reception || reception.role !== 'reception') {
      return res.status(401).json({ error: 'Invalid access' });
    }

    res.json({ 
      valid: true,
      user: {
        name: user.name,
        firmName: user.customerDetails.firmName,
        userCode: user.customerDetails.userCode
      }
    });
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}


};

module.exports = receptionController;