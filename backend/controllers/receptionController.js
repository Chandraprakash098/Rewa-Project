const User = require('../models/User');
const Order = require('../models/Order');
const fs = require('fs').promises;
const path = require('path');
const jwt = require('jsonwebtoken');
const Attendance = require('../models/Attendance')
const cloudinary = require('../config/cloudinary');
const Product= require('../models/Product');
const Payment = require('../models/Payment');
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

      const validPaymentMethods = ['UPI', 'netBanking', 'COD'];
      if (!validPaymentMethods.includes(paymentMethod)) {
        return res.status(400).json({
          error: 'Invalid payment method',
          validMethods: validPaymentMethods
        });
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

        // orderProducts.push({
        //   product: product._id,
        //   boxes,
        //   price
        // });

        orderProducts.push({
          product: product._id,
          boxes,
          price,
          originalPrice: price // Store the price at order creation
        });

        productTypes.add(product.type);

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
        paymentStatus: paymentMethod === 'COD' ? 'pending' : 'pending',
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

      const payment = new Payment({
        user: req.customerUser._id,
        amount: totalAmount + deliveryCharge,
        status: paymentMethod === 'COD' ? 'pending' : 'pending',
        userActivityStatus: req.customerUser.isActive ? 'active' : 'inactive',
        orderDetails: order._id
      });
      await payment.save();

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
        },
        paymentId: payment._id,
        amount: totalAmount + deliveryCharge
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

  
getPendingPayments : async (req, res) => {
  try {
    const pendingPayments = await Payment.find({ status: 'pending' })
      .populate('user', 'name phoneNumber email customerDetails.firmName customerDetails.userCode')
      .populate({
        path: 'orderDetails',
        populate: {
          path: 'products.product',
          select: 'name type'
        }
      })
      .sort({ createdAt: -1 });

    const formattedPayments = pendingPayments.map(payment => {
      if (!payment.orderDetails) {
        console.warn(`Payment ${payment._id} has no valid orderDetails`);
        return {
          paymentId: payment._id,
          orderId: 'N/A',
          user: {
            name: payment.user?.name || 'N/A',
            firmName: payment.user?.customerDetails?.firmName || 'N/A',
            userCode: payment.user?.customerDetails?.userCode || 'N/A',
            phoneNumber: payment.user?.phoneNumber || 'N/A',
            email: payment.user?.email || 'N/A'
          },
          products: [],
          totalAmount: Number(payment.amount) || 0,
          paidAmount: Number(payment.paidAmount) || 0,
          remainingAmount: Number(payment.remainingAmount) || 0,
          paymentHistory: payment.paymentHistory.map(entry => ({
            ...entry.toObject(),
            submittedAmount: Number(entry.submittedAmount),
            verifiedAmount: Number(entry.verifiedAmount)
          })),
          deliveryCharge: 0,
          totalAmountWithDelivery: Number(payment.amount) || 0,
          paymentMethod: 'N/A',
          paymentStatus: payment.status,
          orderStatus: 'N/A',
          shippingAddress: {},
          firmName: payment.user?.customerDetails?.firmName || 'N/A',
          gstNumber: 'N/A',
          createdAt: payment.createdAt,
          updatedAt: payment.updatedAt
        };
      }

      return {
        paymentId: payment._id,
        orderId: payment.orderDetails._id,
        user: {
          name: payment.user?.name || 'N/A',
          firmName: payment.user?.customerDetails?.firmName || 'N/A',
          userCode: payment.user?.customerDetails?.userCode || 'N/A',
          phoneNumber: payment.user?.phoneNumber || 'N/A',
          email: payment.user?.email || 'N/A'
        },
        products: payment.orderDetails.products.map(p => ({
          productName: p.product?.name || 'N/A',
          productType: p.product?.type || 'N/A',
          boxes: Number(p.boxes) || 0,
          price: Number(p.price) || 0
        })),
        totalAmount: Number(payment.amount) || 0,
        paidAmount: Number(payment.paidAmount) || 0,
        remainingAmount: Number(payment.remainingAmount) || 0,
        paymentHistory: payment.paymentHistory.map(entry => ({
          ...entry.toObject(),
          submittedAmount: Number(entry.submittedAmount),
          verifiedAmount: Number(entry.verifiedAmount)
        })),
        deliveryCharge: Number(payment.orderDetails.deliveryCharge || 0),
        totalAmountWithDelivery: Number(payment.orderDetails.totalAmountWithDelivery) || 0,
        paymentMethod: payment.orderDetails.paymentMethod,
        paymentStatus: payment.orderDetails.paymentStatus,
        orderStatus: payment.orderDetails.orderStatus,
        shippingAddress: payment.orderDetails.shippingAddress,
        firmName: payment.orderDetails.firmName,
        gstNumber: payment.orderDetails.gstNumber || 'N/A',
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt
      };
    });

    res.json({
      count: formattedPayments.length,
      pendingPayments: formattedPayments
    });
  } catch (error) {
    console.error('Error fetching pending payments:', error);
    res.status(500).json({
      error: 'Error fetching pending payments',
      details: error.message
    });
  }
},

  

  // updateOrderStatus: async (req, res) => {
  //   try {
  //     const { orderId } = req.params;
  //     const { status } = req.body;

  //     if (status !== 'processing') {
  //       return res.status(400).json({ error: 'Reception can only set orders to processing status' });
  //     }

  //     const order = await Order.findById(orderId);
  //     if (!order) {
  //       return res.status(404).json({ error: 'Order not found' });
  //     }

  //     if (order.orderStatus !== 'pending' && order.orderStatus !== 'preview') {
  //       return res.status(400).json({ error: 'Can only process pending or preview orders' });
  //     }

  //     order._updatedBy = req.user._id;
  //     order.orderStatus = status;
  //     await order.save();

  //     res.json({ message: 'Order status updated successfully', order });
  //   } catch (error) {
  //     res.status(500).json({ error: 'Error updating order status' });
  //   }
  // },


  // updateOrderStatus: async (req, res) => {
  //   try {
  //     const { orderId } = req.params;
  //     const { status } = req.body;

  //     if (status !== 'processing') {
  //       return res.status(400).json({ error: 'Reception can only set orders to processing status' });
  //     }

  //     const order = await Order.findById(orderId).populate('products.product');
  //     if (!order) {
  //       return res.status(404).json({ error: 'Order not found' });
  //     }

  //     if (order.orderStatus !== 'pending' && order.orderStatus !== 'preview') {
  //       return res.status(400).json({ error: 'Can only process pending or preview orders' });
  //     }

  //     // Check for price updates
  //     let totalAmount = 0;
  //     let priceChanged = false;
  //     const priceUpdateHistory = [];

  //     for (const item of order.products) {
  //       const product = await Product.findById(item.product._id);
  //       if (!product || !product.isActive) {
  //         return res.status(400).json({ error: `Product ${item.product.name} is inactive or not found` });
  //       }

  //       const now = new Date();
  //       const isOfferValid = product.discountedPrice != null &&
  //                           product.validFrom &&
  //                           product.validTo &&
  //                           now >= new Date(product.validFrom) &&
  //                           now <= new Date(product.validTo);
  //       const currentPrice = isOfferValid ? product.discountedPrice : product.originalPrice;

  //       if (currentPrice !== item.price) {
  //         priceChanged = true;
  //         priceUpdateHistory.push({
  //           product: item.product._id,
  //           oldPrice: item.price,
  //           newPrice: currentPrice,
  //           updatedBy: req.user._id
  //         });
  //         item.price = currentPrice; // Update price in order
  //       }

  //       totalAmount += currentPrice * item.boxes;
  //     }

     

  //     if (priceChanged) {
  //       order.priceUpdated = true;
  //       order.priceUpdateHistory = priceUpdateHistory;
  //       order.totalAmount = totalAmount;
  //       order.totalAmountWithDelivery = totalAmount + (order.deliveryCharge || 0);

  //       // Update associated payment
  //       const payment = await Payment.findOne({ orderDetails: order._id });
  //       if (payment) {
  //         payment.amount = order.totalAmountWithDelivery;
  //         payment.remainingAmount = payment.amount - payment.paidAmount;
  //         await payment.save();
  //       }

  //       // TODO: Notify user about price change (e.g., via email or in-app notification)
  //       console.log(`Price updated for order ${order._id}. New total: ${order.totalAmount}`);
  //     }

  //     order._updatedBy = req.user._id;
  //     order.orderStatus = status;
  //     await order.save();

  //     res.json({
  //       message: 'Order status updated successfully',
  //       order,
  //       priceUpdated: priceChanged,
  //       priceUpdateDetails: priceChanged ? priceUpdateHistory : undefined
  //     });
  //   } catch (error) {
  //     console.error('Error updating order status:', error);
  //     res.status(500).json({ error: 'Error updating order status', details: error.message });
  //   }
  // },


  updateOrderStatus: async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    if (status !== 'processing') {
      return res.status(400).json({ error: 'Reception can only set orders to processing status' });
    }

    const order = await Order.findById(orderId).populate('products.product');
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.orderStatus !== 'pending' && order.orderStatus !== 'preview') {
      return res.status(400).json({ error: 'Can only process pending or preview orders' });
    }

    // Check for price updates
    let totalAmount = 0;
    let priceChanged = false;
    const priceUpdateHistory = [];

    for (const item of order.products) {
      const product = await Product.findById(item.product._id);
      if (!product || !product.isActive) {
        return res.status(400).json({ error: `Product ${item.product.name} is inactive or not found` });
      }

      const now = new Date();
      const isOfferValid = product.discountedPrice != null &&
                          product.validFrom &&
                          product.validTo &&
                          now >= new Date(product.validFrom) &&
                          now <= new Date(product.validTo);
      const currentPrice = isOfferValid ? product.discountedPrice : product.originalPrice;

      if (currentPrice !== item.price) {
        priceChanged = true;
        priceUpdateHistory.push({
          product: item.product._id,
          oldPrice: item.price,
          newPrice: currentPrice,
          updatedBy: req.user._id
        });
        item.price = currentPrice; // Update price in order
      }

      totalAmount += currentPrice * item.boxes;
    }

    if (priceChanged) {
      order.priceUpdated = true;
      order.priceUpdateHistory = priceUpdateHistory;
      order.totalAmount = totalAmount;
      order.totalAmountWithDelivery = totalAmount + (order.deliveryCharge || 0);

      // Update associated payment
      const payment = await Payment.findOne({ orderDetails: order._id });
      if (payment) {
        payment.amount = order.totalAmountWithDelivery;
        payment.remainingAmount = payment.amount - payment.paidAmount;
        await payment.save();
      }
    }

    order._updatedBy = req.user._id;
    order.orderStatus = status;
    await order.save();

    res.json({
      message: 'Order status updated successfully',
      order,
      priceUpdated: priceChanged,
      priceUpdateDetails: priceChanged ? priceUpdateHistory : undefined
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Error updating order status', details: error.message });
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
},

// getSubmittedPayments: async (req, res) => {
//     try {
//       const payments = await Payment.find({ status: 'submitted' })
//         .populate('user', 'name email phoneNumber customerDetails.firmName customerDetails.userCode')
//         .populate('orderDetails', 'totalAmountWithDelivery paymentMethod shippingAddress')
//         .sort({ createdAt: -1 });

//       res.json({ payments });
//     } catch (error) {
//       console.error('Error fetching submitted payments:', error);
//       res.status(500).json({
//         error: 'Error fetching submitted payments',
//         details: error.message
//       });
//     }
//   }

// getSubmittedPayments: async (req, res) => {
//   try {
//     const payments = await Payment.find({ status: 'submitted' })
//       .populate('user', 'name email phoneNumber customerDetails.firmName customerDetails.userCode')
//       .populate('orderDetails', 'totalAmountWithDelivery paymentMethod shippingAddress')
//       .sort({ createdAt: -1 });

//     // Format payments to ensure numeric values and include remainingAmount
//     const formattedPayments = payments.map(payment => ({
//       ...payment.toObject(),
//       amount: Number(payment.amount),
//       paidAmount: Number(payment.paidAmount),
//       remainingAmount: Number(payment.remainingAmount),
//       orderDetails: {
//         ...payment.orderDetails.toObject(),
//         totalAmountWithDelivery: Number(payment.orderDetails.totalAmountWithDelivery)
//       }
//     }));

//     res.json({ payments: formattedPayments });
//   } catch (error) {
//     console.error('Error fetching submitted payments:', error);
//     res.status(500).json({
//       error: 'Error fetching submitted payments',
//       details: error.message
//     });
//   }
// }


 getSubmittedPayments: async (req, res) => {
    try {
      const payments = await Payment.find({ status: 'submitted' })
        .populate('user', 'name email phoneNumber customerDetails.firmName customerDetails.userCode')
        .populate('orderDetails', 'totalAmountWithDelivery paymentMethod shippingAddress')
        .sort({ createdAt: -1 });

      const formattedPayments = payments.map(payment => ({
        ...payment.toObject(),
        amount: Number(payment.amount),
        paidAmount: Number(payment.paidAmount),
        remainingAmount: Number(payment.remainingAmount),
        paymentHistory: payment.paymentHistory.map(entry => ({
          ...entry.toObject(),
          submittedAmount: Number(entry.submittedAmount),
          verifiedAmount: Number(entry.verifiedAmount)
        })),
        orderDetails: {
          ...payment.orderDetails.toObject(),
          totalAmountWithDelivery: Number(payment.orderDetails.totalAmountWithDelivery)
        }
      }));

      res.json({ payments: formattedPayments });
    } catch (error) {
      console.error('Error fetching submitted payments:', error);
      res.status(500).json({
        error: 'Error fetching submitted payments',
        details: error.message
      });
    }
  }


};

module.exports = receptionController;