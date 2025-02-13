const Order = require('../models/Order');
const User = require('../models/User');
const Attendance = require('../models/Attendance')
const cloudinary = require('../config/cloudinary');
const Challan = require('../models/Challan'); 
const generateChallanPDF = require('../utils/pdfgen');
const streamifier = require('streamifier');

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
      orderStatus: { $in: ['processing', 'confirmed', 'shipped'] } 
    })
    .populate('user', 'name phoneNumber email customerDetails.firmName customerDetails.userCode')
    .populate('products.product')
    .sort({ createdAt: -1 });

    res.json({ orders });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching processing orders' });
  }
};






exports.downloadChallan = async (req, res) => {
  try {
    const { challanId } = req.params;

    const challan = await Challan.findById(challanId);
    if (!challan) {
      return res.status(404).json({ error: 'Challan not found' });
    }

    const pdfBuffer = await generateChallanPDF(challan);

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=challan-${challan.dcNo}.pdf`);
    
    // Send the PDF buffer
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Error downloading challan:', error);
    res.status(500).json({ 
      error: 'Error downloading challan',
      details: error.message 
    });
  }
};

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

    // Validate input
    if (!userCode) {
      return res.status(400).json({ error: 'User code is required' });
    }

    // Validate items
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Invalid or empty items list' });
    }

    // Generate invoice number
    const invoiceNo = await generateInvoiceNumber();

    // Safely calculate total amount
    const totalAmount = items.reduce((sum, item) => {
      // Ensure each item has quantity and rate
      const quantity = Number(item.quantity) || 0;
      const rate = Number(item.rate) || 0;
      return sum + (quantity * rate);
    }, 0);

    // Prepare items for schema
    const formattedItems = items.map(item => ({
      description: item.productName || item.description || 'Unnamed Item',
      quantity: Number(item.quantity) || 0,
      rate: Number(item.rate) || 0,
      amount: Number(item.quantity || 0) * Number(item.rate || 0)
    }));

    // Create new challan
    const challan = new Challan({
      userCode,
      invoiceNo,
      date: new Date(),
      vehicleNo,
      driverName,
      mobileNo,
      items: formattedItems,
      totalAmount,
      receiverName,
      dcNo: invoiceNo // Add this to resolve the unique index issue
    });

    // Save the challan
    // await challan.save();

    const savedChallan = await challan.save();

    // res.json({
    //   message: 'Challan generated successfully',
    //   challan
    // });

    res.json({
      message: 'Challan generated successfully',
      challan: savedChallan,
      downloadUrl: `/api/dispatch/challan/${savedChallan._id}/download` // Add download URL
    });
  } catch (error) {
    console.error('Challan generation error:', error);
    
    // More detailed error handling
    if (error.code === 11000) {
      return res.status(400).json({ 
        error: 'Duplicate challan generated',
        details: 'A challan with this number already exists'
      });
    }

    res.status(500).json({ 
      error: 'Error generating challan',
      details: error.message 
    });
  }
};


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



// exports.checkIn = async (req, res) => {
//   try {
//     const { selectedDate } = req.body;

//     if (!req.file) {
//       return res.status(400).json({
//         error: 'Please upload a check-in image'
//       });
//     }

//     if (!selectedDate) {
//       return res.status(400).json({
//         error: 'Please select a date for check-in'
//       });
//     }

//     // Convert selectedDate to start of day
//     const checkInDate = new Date(selectedDate);
//     checkInDate.setHours(0, 0, 0, 0);

//     // Check if already checked in for selected date
//     const existingAttendance = await Attendance.findOne({
//       user: req.user._id,
//       panel: 'dispatch',
//       selectedDate: checkInDate,
//       $or: [{ status: 'checked-in' }, { status: 'present' }]
//     });

//     if (existingAttendance) {
//       return res.status(400).json({
//         error: 'Already checked in for this date'
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
//       panel: 'dispatch',
//       checkInTime: new Date(),
//       selectedDate: checkInDate,
//       status: 'present',
//       checkInImage: cloudinaryResponse.secure_url
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
// }

exports.checkIn = async (req, res) => {
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
          panel: 'dispatch',
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
};

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


