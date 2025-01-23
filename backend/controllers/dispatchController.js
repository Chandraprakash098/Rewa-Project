const Order = require('../models/Order');
const User = require('../models/User');
const Attendance = require('../models/Attendance')

// Generate a unique challan number
const generateChallanNumber = async () => {
  const date = new Date();
  const prefix = `CH${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}`;
  const latestOrder = await Order.findOne({ 'deliveryNote.challanNumber': new RegExp(prefix) })
    .sort({ 'deliveryNote.challanNumber': -1 });

  let sequence = '0001';
  if (latestOrder && latestOrder.deliveryNote.challanNumber) {
    const currentSequence = parseInt(latestOrder.deliveryNote.challanNumber.slice(-4));
    sequence = (currentSequence + 1).toString().padStart(4, '0');
  }

  return `${prefix}${sequence}`;
};

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

// // Get preview orders (all pending orders)
// exports.getPreviewOrders = async (req, res) => {
//   try {
//     const orders = await Order.find({ status: 'pending' })
//       .populate('user', 'name customerDetails.firmName customerDetails.userCode')
//       .populate('products.product')
//       .sort({ createdAt: -1 });

//     res.json(orders);
//   } catch (error) {
//     res.status(500).json({ error: 'Server error' });
//   }
// };

// // Get pending orders
// exports.getPendingOrders = async (req, res) => {
//   try {
//     const orders = await Order.find({ status: 'pending' })
//       .populate('user', 'name customerDetails.firmName customerDetails.userCode')
//       .populate('products.product')
//       .sort({ createdAt: -1 });

//     res.json(orders);
//   } catch (error) {
//     res.status(500).json({ error: 'Server error' });
//   }
// };

// Generate delivery challan and complete order
exports.generateChallan = async (req, res) => {
  try {
    const { orderId, vehicleNumber, driverName, fuelType } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const challanNumber = await generateChallanNumber();

    order.deliveryNote = {
      challanNumber,
      vehicleNumber,
      driverName,
      fuelType,
      createdAt: new Date()
    };
    order.status = 'completed';
    await order.save();

    // Populate necessary fields for challan generation
    await order.populate('user', 'name customerDetails.firmName customerDetails.address');
    await order.populate('products.product', 'name');

    res.json({
      message: 'Challan generated successfully',
      order,
      challan: order.deliveryNote
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Get order history (last 35 days)
// exports.getOrderHistory = async (req, res) => {
//   try {
//     const thirtyFiveDaysAgo = new Date();
//     thirtyFiveDaysAgo.setDate(thirtyFiveDaysAgo.getDate() - 35);

//     const orders = await Order.find({
//       status: 'completed',
//       createdAt: { $gte: thirtyFiveDaysAgo }
//     })
//     .populate('user', 'name customerDetails.firmName customerDetails.userCode')
//     .populate('products.product')
//     .sort({ createdAt: -1 });

//     res.json(orders);
//   } catch (error) {
//     res.status(500).json({ error: 'Server error' });
//   }
// };


exports.getOrderHistory = async (req, res) => {
    try {
      // Get orders from last 35 days
      const thirtyFiveDaysAgo = new Date();
      thirtyFiveDaysAgo.setDate(thirtyFiveDaysAgo.getDate() - 35);

      const orders = await Order.find({
        createdAt: { $gte: thirtyFiveDaysAgo }
      })
      .populate('user', 'name customerDetails.firmName customerDetails.userCode')
      .populate('products.product', 'name price')
      .sort({ createdAt: -1 });

      res.json({ orders });
    } catch (error) {
      res.status(500).json({ error: 'Error fetching order history' });
    }
  };


// Get challan by ID
exports.getChallanById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name customerDetails.firmName customerDetails.address customerDetails.userCode')
      .populate('products.product', 'name');

    if (!order || !order.deliveryNote) {
      return res.status(404).json({ error: 'Challan not found' });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }

};

exports.checkIn = async (req, res) => {
  try {
    // Check if user is already checked in today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingAttendance = await Attendance.findOne({
      user: req.user._id,
      panel: 'dispatch',
      date: { $gte: today },
      status: 'checked-in'
    });

    if (existingAttendance) {
      return res.status(400).json({ 
        error: 'You are already checked in today' 
      });
    }

    // Create new attendance record
    const attendance = new Attendance({
      user: req.user._id,
      panel: 'dispatch',
      checkInTime: new Date(),
      date: new Date(),
      status: 'checked-in'
    });

    await attendance.save();

    res.json({ 
      message: 'Check-in successful', 
      attendance 
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Error during check-in', 
      details: error.message 
    });
  }
}

// Check-out functionality
exports.checkOut = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find the active check-in for today
    const attendance = await Attendance.findOne({
      user: req.user._id,
      panel: 'dispatch',
      date: { $gte: today },
      status: 'checked-in'
    });

    if (!attendance) {
      return res.status(400).json({ 
        error: 'No active check-in found' 
      });
    }

    // Update check-out time
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


