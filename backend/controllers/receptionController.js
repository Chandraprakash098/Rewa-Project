const User = require('../models/User');
const Order = require('../models/Order');
const fs = require('fs').promises;
const path = require('path');
const jwt = require('jsonwebtoken');
const Attendance = require('../models/Attendance')
const cloudinary = require('../config/cloudinary');
const Product= require('../models/Product');
const streamifier = require('streamifier');


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

const getMiscellaneousUser = async (email) => {
  const user = await User.findOne({ 
    email, 
    role: 'miscellaneous'
  });
  if (!user) {
    throw new Error('Miscellaneous user not found');
  }
  return user;
};

const isAhmedabadOrGandhinagar = (pinCode) => {
  // Ahmedabad pin codes: 380001 to 382481
  // Gandhinagar pin codes: 382010 to 382855
  const pin = Number(pinCode);
  return (pin >= 380001 && pin <= 382481) || (pin >= 382010 && pin <= 382855);
};

const calculateDeliveryCharge = (boxes, deliveryChoice, pinCode) => {
  if (deliveryChoice === 'companyPickup' || !isAhmedabadOrGandhinagar(pinCode)) {
    return 0; // No delivery charge for company pickup or non-Ahmedabad/Gandhinagar
  }
  return boxes >= 230 && boxes <= 299 ? boxes * 2 : boxes * 3;
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
   
  
    getAllUsers : async (req, res) => {
      try {
        const users = await User.find({ role: 'user' })
          .select('name email phoneNumber customerDetails.firmName customerDetails.userCode isActive createdAt')
          .sort({ createdAt: -1 });
        
        res.json({ 
          users: users.map(user => ({
            // _id: user._id,
            userCode: user.customerDetails?.userCode,
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


   

  // Order Management
  // getCurrentOrders: async (req, res) => {
  //   try {
  //     const orders = await Order.find({
  //       status: { $in: ['pending', 'processing'] }
  //     })
  //     .populate('user', 'name customerDetails.firmName customerDetails.userCode')
  //     .populate('products.product', 'name price')
  //     .sort({ createdAt: -1 });

  //     res.json({ orders });
  //   } catch (error) {
  //     res.status(500).json({ error: 'Error fetching current orders' });
  //   }
  // },

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

  getUserPanelAccess: async (req, res) => {
    try {
      const { userCode } = req.body;
  
      if (!userCode) {
        return res.status(400).json({ error: 'User code is required' });
      }
  
      // Find the customer user
      const customerUser = await User.findOne({ 
        'customerDetails.userCode': userCode,
        role: 'user',
        isActive: true 
      });
  
      if (!customerUser) {
        return res.status(404).json({ error: 'Customer not found or inactive' });
      }
  
      // Generate special token for reception user panel access
      const token = jwt.sign(
        {
          userId: req.user._id,         // Reception user ID
          customerId: customerUser._id,  // Customer user ID
          isReceptionAccess: true
        },
        process.env.JWT_SECRET,
        { expiresIn: '4h' }
      );
  
      res.json({
        success: true,
        token,
        customer: {
          name: customerUser.name,
          email: customerUser.email,
          firmName: customerUser.customerDetails.firmName,
          userCode: customerUser.customerDetails.userCode,
          address: customerUser.customerDetails.address
        }
      });
    } catch (error) {
      console.error('Get user panel access error:', error);
      res.status(500).json({
        error: 'Error generating user panel access',
        details: error.message
      });
    }
  },

  getUserProducts: async (req, res) => {
    try {
      if (!req.isReceptionAccess) {
        return res.status(403).json({ error: 'Invalid access type' });
      }

      const products = await Product.find({ isActive: true })
        .select('name description type category originalPrice discountedPrice quantity image validFrom validTo')
        .lean();

      const formattedProducts = products.map(product => {
        const isValidOffer = product.discountedPrice && 
                           product.validFrom && 
                           product.validTo && 
                           new Date() >= product.validFrom && 
                           new Date() <= product.validTo;

        return {
          _id: product._id,
          name: product.name,
          description: product.description,
          type: product.type,
          category: product.category,
          price: isValidOffer ? product.discountedPrice : product.originalPrice,
          quantity: product.quantity,
          image: product.image
        };
      });

      res.json({
        products: formattedProducts,
        customerInfo: {
          name: req.customerUser.name,
          firmName: req.customerUser.customerDetails.firmName,
          userCode: req.customerUser.customerDetails.userCode
        }
      });
    } catch (error) {
      console.error('Error fetching products:', error);
      res.status(500).json({
        error: 'Error fetching products',
        details: error.message
      });
    }
  },




// createOrderAsReception: async (req, res) => {
//   try {
//     if (!req.isReceptionAccess) {
//       return res.status(403).json({ error: 'Invalid access type' });
//     }

//     const { products, paymentMethod, name, mobileNo } = req.body;

//     if (!products?.length) {
//       return res.status(400).json({ error: 'Products are required' });
//     }

//     if (req.isMiscellaneous && (!name || !mobileNo)) {
//       return res.status(400).json({ error: 'Name and mobile number are required for miscellaneous orders' });
//     }

//     let totalAmount = 0;
//     const orderProducts = [];
//     const productTypes = new Set();

//     // Validate and process products
//     for (const item of products) {
//       if (!item.productId || !item.quantity || item.price === undefined) {
//         return res.status(400).json({
//           error: `Invalid product data: ${JSON.stringify(item)}`
//         });
//       }

//       const product = await Product.findOne({
//         _id: item.productId,
//         isActive: true
//       });

//       if (!product) {
//         return res.status(404).json({
//           error: `Product not found: ${item.productId}`
//         });
//       }

//       const quantity = Number(item.quantity);
//       if (quantity < 1) {
//         return res.status(400).json({
//           error: `Invalid quantity for ${product.name}`
//         });
//       }

//       const price = Number(item.price);
//       if (isNaN(price) || price < 0) {
//         return res.status(400).json({
//           error: `Invalid price for ${product.name}`
//         });
//       }

//       totalAmount += price * quantity;

//       orderProducts.push({
//         product: product._id,
//         quantity,
//         price
//       });

//       productTypes.add(product.type);

//       // Update product quantity
//       product.quantity -= quantity;
//       await product.save();
//     }

//     // Create order with miscellaneous flag if applicable
//     const orderData = new Order({
//       user: req.customerUser._id,
//       products: orderProducts,
//       totalAmount,
//       totalAmountWithDelivery: totalAmount,
//       paymentMethod,
//       paymentStatus: paymentMethod === 'COD' ? 'pending' : 'completed',
//       orderStatus: 'pending',
//       createdByReception: req.user._id,
//       type: [...productTypes][0]
//     });

//     // Add required fields based on user type
//     if (req.customerUser.role === 'miscellaneous') {
//       orderData.firmName = `${name} (Miscellaneous)`;
//       orderData.shippingAddress = 'Walk-in Customer';
//       orderData.isMiscellaneous = true;

//       // Update miscellaneous user with provided mobileNo
//       req.customerUser.phoneNumber = mobileNo;
//       req.customerUser.name = name;
//       req.customerUser.customerDetails.firmName = `${name} (Miscellaneous)`;
//       await req.customerUser.save();
//     } else {
//       orderData.firmName = req.customerUser.customerDetails.firmName;
//       orderData.shippingAddress = req.customerUser.customerDetails.address;
//       orderData.gstNumber = req.customerUser.customerDetails.gstNumber;
//     }

//     const order = new Order(orderData);
//     await order.save();

//     res.status(201).json({
//       message: 'Order created successfully',
//       order: {
//         ...order.toObject(),
//         createdBy: {
//           reception: req.user.name,
//           customer: req.customerUser.role === 'miscellaneous' ? 
//             `${name} (Miscellaneous)` : 
//             req.customerUser.customerDetails.firmName
//         }
//       }
//     });
//   } catch (error) {
//     console.error('Error creating order:', error);
//     res.status(500).json({
//       error: 'Error creating order',
//       details: error.message
//     });
//   }
// },


createOrderAsReception: async (req, res) => {
  try {
    if (!req.isReceptionAccess) {
      return res.status(403).json({ error: 'Invalid access type' });
    }

    const { products, paymentMethod, name, mobileNo, shippingAddress, deliveryChoice } = req.body;

    if (!products?.length) {
      return res.status(400).json({ error: 'Products are required' });
    }

    if (req.isMiscellaneous && (!name || !mobileNo)) {
      return res.status(400).json({ error: 'Name and mobile number are required for miscellaneous orders' });
    }

    if (!shippingAddress || !shippingAddress.address || !shippingAddress.city || !shippingAddress.state || !shippingAddress.pinCode) {
      return res.status(400).json({ error: 'Complete shipping address with pin code is required' });
    }

    if (!/^\d{6}$/.test(shippingAddress.pinCode)) {
      return res.status(400).json({ error: 'Pin code must be 6 digits' });
    }

    if (!['homeDelivery', 'companyPickup'].includes(deliveryChoice)) {
      return res.status(400).json({ error: 'Invalid delivery choice' });
    }

    let totalAmount = 0;
    const orderProducts = [];
    const productTypes = new Set();

    for (const item of products) {
      if (!item.productId || !item.boxes || item.price === undefined) {
        return res.status(400).json({
          error: `Invalid product data: ${JSON.stringify(item)}`
        });
      }

      const product = await Product.findOne({
        _id: item.productId,
        isActive: true
      });

      if (!product) {
        return res.status(404).json({
          error: `Product not found: ${item.productId}`
        });
      }

      const boxes = Number(item.boxes);
      if (boxes < 230) {
        return res.status(400).json({
          error: `Minimum 230 boxes required for ${product.name}`
        });
      }

      const price = Number(item.price);
      if (isNaN(price) || price < 0) {
        return res.status(400).json({
          error: `Invalid price for ${product.name}`
        });
      }

      totalAmount += price * boxes;

      orderProducts.push({
        product: product._id,
        boxes,
        price
      });

      productTypes.add(product.type);

      // product.boxes -= boxes;
      product.boxes = (product.boxes || 0) - boxes;

      product.stockRemarks.push({
        message: `Deducted ${boxes} boxes for order`,
        updatedBy: req.user._id,
        boxes: -boxes,
        changeType: 'order'
      });
      await product.save();
      
    }

    const deliveryCharge = calculateDeliveryCharge(
      orderProducts.reduce((sum, item) => sum + item.boxes, 0),
      deliveryChoice,
      shippingAddress.pinCode
    );

    const orderData = new Order({
      user: req.customerUser._id,
      products: orderProducts,
      totalAmount,
      deliveryCharge,
      totalAmountWithDelivery: totalAmount + deliveryCharge,
      paymentMethod,
      paymentStatus: paymentMethod === 'COD' ? 'pending' : 'completed',
      orderStatus: isAhmedabadOrGandhinagar(shippingAddress.pinCode) ? 'pending' : 'preview',
      createdByReception: req.user._id,
      type: [...productTypes][0],
      shippingAddress,
      deliveryChoice,
      firmName: req.customerUser.customerDetails.firmName,
      gstNumber: req.customerUser.customerDetails.gstNumber
    });

    if (req.customerUser.role === 'miscellaneous') {
      orderData.firmName = `${name} (Miscellaneous)`;
      orderData.shippingAddress = shippingAddress;
      orderData.isMiscellaneous = true;

      req.customerUser.phoneNumber = mobileNo;
      req.customerUser.name = name;
      req.customerUser.customerDetails.firmName = `${name} (Miscellaneous)`;
      await req.customerUser.save();
    }

    const order = new Order(orderData);
    await order.save();

    res.status(201).json({
      message: 'Order created successfully',
      order: {
        ...order.toObject(),
        createdBy: {
          reception: req.user.name,
          customer: req.customerUser.role === 'miscellaneous' ?
            `${name} (Miscellaneous)` :
            req.customerUser.customerDetails.firmName
        }
      }
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({
      error: 'Error creating order',
      details: error.message
    });
  }
},


  getOrderHistory : async (req, res) => {
    try {
      const thirtyFiveDaysAgo = new Date();
      thirtyFiveDaysAgo.setDate(thirtyFiveDaysAgo.getDate() - 35);
  
      const orders = await Order.find({
        createdAt: { $gte: thirtyFiveDaysAgo }
      })
        .select('orderId firmName gstNumber email shippingAddress paymentStatus paymentMethod orderStatus createdAt type totalAmount products isMiscellaneous')
        .populate('user', 'name phoneNumber email role customerDetails.firmName customerDetails.userCode')
        .populate('products.product', 'name type quantity')
        .populate('createdByReception', 'name')
        .sort({ createdAt: -1 });
  
      const formattedOrders = orders.map(order => ({
        ...order.toObject(),
        orderSource: order.createdByReception ? 
          (order.user.role === 'miscellaneous' ?
            `Created by ${order.createdByReception.name} for ${order.user.name} (Miscellaneous)` :
            `Created by ${order.createdByReception.name} for ${order.user.customerDetails?.firmName || order.user.name}`) :
          `Direct order by ${order.user.customerDetails?.firmName || order.user.name}`
      }));
  
      res.json({ orders: formattedOrders });
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
      .populate('user', 'name email phoneNumber customerDetails.firmName customerDetails.userCode')
      .populate('products.product', 'name price quantity')
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




checkIn : async (req, res) => {
  try {
      const { selectedDate } = req.body;

      if (!req.file) {
          return res.status(400).json({ error: 'Please upload a check-in image' });
      }

      if (!selectedDate) {
          return res.status(400).json({ error: 'Please select a date for check-in' });
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
          return res.status(400).json({ error: 'Already checked in for this date' });
      }

      // Upload buffer to Cloudinary using stream
      const uploadPromise = new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
              {
                  folder: 'check-in-photos',
                  resource_type: 'image'
              },
              (error, result) => {
                  if (error) reject(error);
                  else resolve(result);
              }
          );
          
          streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
      });

      const cloudinaryResponse = await uploadPromise;

      // Create new attendance record
      const attendance = new Attendance({
          user: req.user._id,
          panel: 'dispatch',
          checkInTime: new Date(),
          selectedDate: checkInDate,
          status: 'present',
          checkInImage: cloudinaryResponse.secure_url
      });

      await attendance.save();

      res.json({ message: 'Check-in successful', attendance });
  } catch (error) {
      console.error('Check-in error:', error);
      res.status(500).json({ error: 'Error during check-in', details: error.message });
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



// addDeliveryCharge: async (req, res) => {
//   try {
//     const { orderId, deliveryCharge } = req.body;

//     // Validate input
//     if (!orderId || deliveryCharge === undefined || deliveryCharge < 0) {
//       return res.status(400).json({ 
//         error: 'Invalid order ID or delivery charge' 
//       });
//     }

//     // Convert deliveryCharge to number explicitly
//     const numericDeliveryCharge = Number(deliveryCharge);
//     if (isNaN(numericDeliveryCharge)) {
//       return res.status(400).json({ 
//         error: 'Delivery charge must be a valid number' 
//       });
//     }

//     // Find the order
//     const order = await Order.findById(orderId);
//     if (!order) {
//       return res.status(404).json({ error: 'Order not found' });
//     }

//     // Check order status
//     if (order.orderStatus !== 'pending' && order.orderStatus !== 'preview') {
//       return res.status(400).json({ 
//         error: 'Can only add delivery charge to pending or preview orders' 
//       });
//     }

//     // Ensure totalAmount is a number and update with delivery charge
//     const baseAmount = Number(order.totalAmount) || 0;
//     order.deliveryCharge = numericDeliveryCharge;
//     order.totalAmountWithDelivery = baseAmount + numericDeliveryCharge;
//     order.deliveryChargeAddedBy = req.user._id;
//     order.orderStatus = 'processing';

//     await order.save();

//     res.json({ 
//       message: 'Delivery charge added successfully', 
//       order 
//     });
//   } catch (error) {
//     console.error('Error adding delivery charge:', error);
//     res.status(500).json({ 
//       error: 'Error adding delivery charge', 
//       details: error.message 
//     });
//   }
// },


// addDeliveryCharge: async (req, res) => {
//   try {
//     const { orderId, deliveryCharge } = req.body;

//     if (!orderId || deliveryCharge === undefined) {
//       return res.status(400).json({ error: 'Order ID and delivery charge are required' });
//     }
//     if (deliveryCharge < 0) {
//       return res.status(400).json({ error: 'Delivery charge cannot be negative' });
//     }

//     const order = await Order.findById(orderId);
//     if (!order) {
//       return res.status(404).json({ error: 'Order not found' });
//     }

//     // Check if order is for a non-local pin code
//     const LOCAL_PIN_CODES = ['380001', '380002', '380003', '380004', '380005', '380006', '380007', '380008', '380009', '380013', '380014', '380015', '380016', '380018', '380019', '380021', '380022', '380023', '380024', '380026', '380027', '380028', '380049', '380050', '380051', '380052', '380053', '380054', '380055', '380058', '380059', '380060', '380061', '380063', '382006', '382007', '382010', '382011', '382016', '382021', '382024', '382028', '382030', '382033', '382041', '382042', '382043', '382044', '382045', '382047', '382110', '382115', '382120', '382130', '382140', '382145', '382150', '382155', '382165', '382170', '382210', '382213', '382220', '382225', '382230', '382240', '382245', '382250', '382255', '382260', '382265', '382308', '382315', '382320', '382325', '382330', '382335', '382340', '382345', '382350', '382355', '382405', '382410', '382415', '382421', '382422', '382423', '382424', '382425', '382426', '382427', '382428', '382430', '382433', '382435', '382440', '382443', '382445', '382449', '382450', '382455', '382460', '382463', '382465', '382470', '382475', '382480', '382481'];
//     const isLocal = LOCAL_PIN_CODES.includes(order.shippingAddress.pinCode);
//     if (isLocal) {
//       return res.status(400).json({ error: 'Delivery charge can only be added for non-local orders' });
//     }

//     order.deliveryCharge = deliveryCharge;
//     order.totalAmountWithDelivery = order.total-amount + deliveryCharge;
//     order.deliveryChargeAddedBy = req.user._id;

//     await order.save();

//     res.json({ message: 'Delivery charge added successfully', order });
//   } catch (error) {
//     console.error('Add delivery charge error:', error);
//     res.status(500).json({ error: 'Error adding delivery charge' });
//   }
// },

addDeliveryCharge: async (req, res) => {
  try {
    const { orderId, deliveryCharge } = req.body;

    if (!orderId || deliveryCharge === undefined || deliveryCharge < 0) {
      return res.status(400).json({
        error: 'Invalid order ID or delivery charge'
      });
    }

    const numericDeliveryCharge = Number(deliveryCharge);
    if (isNaN(numericDeliveryCharge)) {
      return res.status(400).json({
        error: 'Delivery charge must be a valid number'
      });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // if (order.orderStatus !== 'preview') {
    //   return res.status(400).json({
    //     error: 'Can only add delivery charge to preview orders'
    //   });
    // }

    if (isAhmedabadOrGandhinagar(order.shippingAddress.pinCode)) {
      return res.status(400).json({
        error: 'Cannot manually add delivery charge for Ahmedabad/Gandhinagar orders'
      });
    }

    const baseAmount = Number(order.totalAmount) || 0;
    order.deliveryCharge = numericDeliveryCharge;
    order.totalAmountWithDelivery = baseAmount + numericDeliveryCharge;
    order.deliveryChargeAddedBy = req.user._id;
    order.orderStatus = 'processing';

    await order.save();

    res.json({
      message: 'Delivery charge added successfully',
      order
    });
  } catch (error) {
    console.error('Error adding delivery charge:', error);
    res.status(500).json({
      error: 'Error adding delivery charge',
      details: error.message
    });
  }
},

// getMiscellaneousPanelAccess: async (req, res) => {
//   try {
//     const { name, email } = req.body;

//     if (!name || !email) {
//       return res.status(400).json({ error: 'Name and email are required' });
//     }

//     // Find miscellaneous user by email only
//     let miscUser = await User.findOne({ 
//       email, 
//       role: 'miscellaneous'
//     });

//     if (!miscUser) {
//       // Generate a unique user code
//       const userCode = await generateUserCode();
      
//       miscUser = new User({
//         name: name,  // Use provided name for new user
//         email,
//         role: 'miscellaneous',
//         password: Math.random().toString(36).slice(-8),
//         phoneNumber: '0000000000',
//         isActive: true,
//         customerDetails: {
//           firmName: `${name} (Miscellaneous)`,
//           userCode: userCode,
//           address: 'Walk-in Customer'
//         }
//       });
//       await miscUser.save();
//     } else {
//       // Update only the name and firmName for existing user
//       miscUser.name = name;
//       miscUser.customerDetails.firmName = `${name} (Miscellaneous)`;
//       await miscUser.save();
//     }

//     // Generate special token for reception user panel access
//     const token = jwt.sign(
//       {
//         userId: req.user._id,
//         customerId: miscUser._id,
//         isReceptionAccess: true,
//         isMiscellaneous: true
//       },
//       process.env.JWT_SECRET,
//       { expiresIn: '4h' }
//     );

//     res.json({
//       success: true,
//       token,
//       customer: {
//         name: name,  // Return the provided name instead of stored name
//         email: miscUser.email,
//         firmName: `${name} (Miscellaneous)`,  // Use provided name in firm name
//         userCode: miscUser.customerDetails?.userCode
//       }
//     });
//   } catch (error) {
//     console.error('Get miscellaneous panel access error:', error);
//     res.status(500).json({
//       error: 'Error generating miscellaneous panel access',
//       details: error.message
//     });
//   }
// }

getMiscellaneousPanelAccess: async (req, res) => {
  try {
    const { name, email, mobileNo } = req.body;

    if (!name || !email || !mobileNo) {
      return res.status(400).json({ error: 'Name, email, and mobile number are required' });
    }

    // Validate mobile number (basic validation, adjust as needed)
    if (!/^\d{10}$/.test(mobileNo)) {
      return res.status(400).json({ error: 'Invalid mobile number. Must be 10 digits.' });
    }

    let miscUser = await User.findOne({ 
      email, 
      role: 'miscellaneous'
    });

    if (!miscUser) {
      const userCode = await generateUserCode();
      
      miscUser = new User({
        name,
        email,
        phoneNumber: mobileNo,
        role: 'miscellaneous',
        password: Math.random().toString(36).slice(-8),
        isActive: true,
        customerDetails: {
          firmName: `${name} (Miscellaneous)`,
          userCode,
          address: 'Walk-in Customer'
        }
      });
      await miscUser.save();
    } else {
      miscUser.name = name;
      miscUser.phoneNumber = mobileNo;
      miscUser.customerDetails.firmName = `${name} (Miscellaneous)`;
      await miscUser.save();
    }

    const token = jwt.sign(
      {
        userId: req.user._id,
        customerId: miscUser._id,
        isReceptionAccess: true,
        isMiscellaneous: true
      },
      process.env.JWT_SECRET,
      { expiresIn: '4h' }
    );

    res.json({
      success: true,
      token,
      customer: {
        name,
        email: miscUser.email,
        mobileNo,
        firmName: `${name} (Miscellaneous)`,
        userCode: miscUser.customerDetails?.userCode
      }
    });
  } catch (error) {
    console.error('Get miscellaneous panel access error:', error);
    res.status(500).json({
      error: 'Error generating miscellaneous panel access',
      details: error.message
    });
  }
}




};

module.exports = receptionController;