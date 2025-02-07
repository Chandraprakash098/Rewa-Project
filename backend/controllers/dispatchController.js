const Order = require('../models/Order');
const User = require('../models/User');
const Attendance = require('../models/Attendance')
const cloudinary = require('../config/cloudinary');
const Challan = require('../models/Challan'); 


//for Test



const generateInvoiceNumber = async () => {
  const date = new Date();
  const currentYear = date.getFullYear();
  
  const latestChallan = await Challan.findOne()
    .sort({ invoiceNo: -1 });
  
  let sequence = 122234192; // Starting from a base number
  if (latestChallan && latestChallan.invoiceNo) {
    sequence = parseInt(latestChallan.invoiceNo) + 1;
  }
  
  return sequence.toString();
};

// Generate a unique challan number
// const generateChallanNumber = async () => {
//   const date = new Date();
//   const prefix = `CH${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}`;
//   const latestOrder = await Order.findOne({ 'deliveryNote.challanNumber': new RegExp(prefix) })
//     .sort({ 'deliveryNote.challanNumber': -1 });

//   let sequence = '0001';
//   if (latestOrder && latestOrder.deliveryNote.challanNumber) {
//     const currentSequence = parseInt(latestOrder.deliveryNote.challanNumber.slice(-4));
//     sequence = (currentSequence + 1).toString().padStart(4, '0');
//   }

//   return `${prefix}${sequence}`;
// };

// Get current orders (pending and processing)
exports.getCurrentOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      status: { $in: ['pending', 'processing'] }
    })
    .populate('user', 'name customerDetails.firmName customerDetails.userCode')
    .populate('products.product')
    .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};



exports.updateOrderStatus= async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    
    const validStatuses = ['confirmed', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status for dispatch' });
    }

    const order = await Order.findById(orderId);
    // if (!order || order.orderStatus !== 'processing') {
    //   return res.status(400).json({ error: 'Can only update processing orders' });
    // }

    order._updatedBy = req.user._id;
    order.orderStatus = status;
    await order.save();

    res.json({ message: 'Order status updated successfully', order });
  } catch (error) {
    res.status(500).json({ error: 'Error updating order status' });
  }
};

exports.getProcessingOrders= async (req, res) => {
  try {
    const orders = await Order.find({
      orderStatus: 'processing'
    })
    .populate('user', 'name customerDetails.firmName customerDetails.userCode')
    .populate('products.product')
    .sort({ createdAt: -1 });

    res.json({ orders });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching processing orders' });
  }
};



// exports.generateChallan = async (req, res) => {
//   try {
//     const { orderId, vehicleNumber, driverName, fuelType } = req.body;

//     const order = await Order.findById(orderId)
//       .populate('user', 'name customerDetails.firmName customerDetails.address')
//       .populate('products.product', 'name');

//     if (!order) {
//       return res.status(404).json({ error: 'Order not found' });
//     }

//     const challanNumber = await generateChallanNumber();

//     order.deliveryNote = {
//       challanNumber,
//       vehicleNumber,
//       driverName,
//       fuelType,
//       createdAt: new Date()
//     };
//     order.orderStatus = 'shipped';
//     await order.save();

//     res.json({
//       message: 'Challan generated successfully',
//       order,
//       challan: {
//         ...order.deliveryNote,
//         totalAmount: order.totalAmount,
//         deliveryCharge: order.deliveryCharge || 0,
//         totalAmountWithDelivery: order.totalAmountWithDelivery
//       }
//     });
//   } catch (error) {
//     res.status(500).json({ error: 'Server error' });
//   }
// };


exports.generateChallan = async (req, res) => {
  try {
    const {
      userCode,
      vehicleNo,
      driverName,
      mobileNo,
      items,
      receiverName
    } = req.body;

    if (!userCode) {
      return res.status(400).json({ error: 'User code is required' });
    }

    // Generate invoice number
    const invoiceNo = await generateInvoiceNumber();

    // Calculate total amount
    const totalAmount = items.reduce((sum, item) => {
      return sum + (item.quantity * item.rate);
    }, 0);

    // Create new challan
    const challan = new Challan({
      userCode,
      invoiceNo,
      date: new Date(),
      vehicleNo,
      driverName,
      mobileNo,
      items,
      totalAmount,
      receiverName
    });

    await challan.save();

    res.json({
      message: 'Challan generated successfully',
      challan
    });
  } catch (error) {
    console.error('Challan generation error:', error);
    res.status(500).json({ 
      error: 'Error generating challan',
      details: error.message 
    });
  }
};

// exports.getChallanById = async (req, res) => {
//   try {
//     const challan = await Challan.findById(req.params.id);

//     if (!challan) {
//       return res.status(404).json({ error: 'Challan not found' });
//     }

//     res.json(challan);
//   } catch (error) {
//     res.status(500).json({ error: 'Server error' });
//   }
// };


exports.getChallansByUserCode = async (req, res) => {
  try {
    const { userCode } = req.params;

    if (!userCode) {
      return res.status(400).json({ error: 'User code is required' });
    }

    const challans = await Challan.find({ userCode })
      .sort({ createdAt: -1 }); // Sort by latest first

    if (!challans || challans.length === 0) {
      return res.status(404).json({ error: 'No challans found for this user code' });
    }

    res.json({
      count: challans.length,
      challans
    });
  } catch (error) {
    console.error('Error fetching challans:', error);
    res.status(500).json({ 
      error: 'Error fetching challans',
      details: error.message 
    });
  }
};


// exports.getOrderHistory = async (req, res) => {
//     try {
//       // Get orders from last 35 days
//       const thirtyFiveDaysAgo = new Date();
//       thirtyFiveDaysAgo.setDate(thirtyFiveDaysAgo.getDate() - 35);

//       const orders = await Order.find({
//         createdAt: { $gte: thirtyFiveDaysAgo }
//       })
//       .populate('user', 'name customerDetails.firmName customerDetails.userCode')
//       .populate('products.product', 'name price')
//       .sort({ createdAt: -1 });

//       res.json({ orders });
//     } catch (error) {
//       res.status(500).json({ error: 'Error fetching order history' });
//     }
//   };

  exports.getOrderHistory = async (req, res) => {
    try {
      const thirtyFiveDaysAgo = new Date();
      thirtyFiveDaysAgo.setDate(thirtyFiveDaysAgo.getDate() - 35);
  
      const orders = await Order.find({
        createdAt: { $gte: thirtyFiveDaysAgo }
      })
        .select('orderId firmName gstNumber shippingAddress paymentStatus paymentMethod orderStatus createdAt type totalAmount products isMiscellaneous')
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
  };




// exports.getChallanById = async (req, res) => {
//   try {
//     const order = await Order.findById(req.params.id)
//       .populate('user', 'name customerDetails.firmName customerDetails.address customerDetails.userCode')
//       .populate('products.product', 'name');

//     if (!order || !order.deliveryNote) {
//       return res.status(404).json({ error: 'Challan not found' });
//     }

//     res.json({
//       ...order.toObject(),
//       challanDetails: {
//         totalAmount: order.totalAmount,
//         deliveryCharge: order.deliveryCharge || 0,
//         totalAmountWithDelivery: order.totalAmountWithDelivery
//       }
//     });
//   } catch (error) {
//     res.status(500).json({ error: 'Server error' });
//   }
// };






exports.checkIn = async (req, res) => {
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
      panel: 'dispatch',
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
      panel: 'dispatch',
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
}

exports.checkOut = async (req, res) => {
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
      panel: 'dispatch',
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
}


exports.getDailyDispatchOrders = async (req, res) => {
  try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const dispatchOrders = await Order.find({
          createdAt: { $gte: today },
          orderStatus: { $in: ['processing', 'shipped'] }
      }).populate('user', 'name customerDetails.firmName');

      res.json({ 
          dailyDispatchOrders: dispatchOrders 
      });
  } catch (error) {
      res.status(500).json({ 
          error: 'Error fetching daily dispatch orders', 
          details: error.message 
      });
  }
}


