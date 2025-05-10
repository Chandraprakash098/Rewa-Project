const Order = require('../models/Order');
const User = require('../models/User');
const Attendance = require('../models/Attendance')
const cloudinary = require('../config/cloudinary');
const Challan = require('../models/Challan'); 
const generateChallanPDF = require('../utils/pdfgen');
const streamifier = require('streamifier');
const ExcelJS = require('exceljs');
const { isAhmedabadOrGandhinagar, calculateDeliveryCharge } = require('./receptionController'); // Import helper functions

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



exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    
    const validStatuses = ['confirmed', 'shipped', 'cancelled']; // Removed 'delivered'
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status for dispatch' });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(400).json({ error: 'Order not found' });
    }

    order._updatedBy = req.user._id;
    order.orderStatus = status;
    await order.save();

    // If status is 'shipped', we can consider it as final delivery state
    if (status === 'shipped' && order.paymentMethod === 'COD') {
      order.paymentStatus = 'pending'; // Keep payment status pending for COD until explicitly updated
    }
   
    await order.save();
    
    res.json({ message: 'Order status updated successfully', order });
  } catch (error) {
    res.status(500).json({ error: 'Error updating order status' });
  }
};

exports.getProcessingOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      orderStatus: { $in: ['processing', 'confirmed'] }
    })
    .populate('user', 'name phoneNumber email customerDetails.firmName customerDetails.userCode')
    .populate('products.product')
    .sort({ createdAt: -1 });

    // Format the response to ensure numeric values
    const formattedOrders = orders.map(order => ({
      ...order.toObject(),
      totalAmount: Number(order.totalAmount),
      deliveryCharge: Number(order.deliveryCharge || 0),
      totalAmountWithDelivery: Number(order.totalAmountWithDelivery)
    }));

    res.json({ orders: formattedOrders });
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

// exports.generateChallan = async (req, res) => {
//   try {
//     const {
//       userCode,
//       vehicleNo,
//       driverName,
//       mobileNo,
//       items,
//       receiverName
//     } = req.body;

//     // Validate input
//     if (!userCode) {
//       return res.status(400).json({ error: 'User code is required' });
//     }

//     // Validate items
//     if (!Array.isArray(items) || items.length === 0) {
//       return res.status(400).json({ error: 'Invalid or empty items list' });
//     }

//     // Generate invoice number
//     const invoiceNo = await generateInvoiceNumber();

//     // Safely calculate total amount
//     const totalAmount = items.reduce((sum, item) => {
//       // Ensure each item has quantity and rate
//       const quantity = Number(item.quantity) || 0;
//       const rate = Number(item.rate) || 0;
//       return sum + (quantity * rate);
//     }, 0);

//     // Prepare items for schema
//     const formattedItems = items.map(item => ({
//       description: item.productName || item.description || 'Unnamed Item',
//       quantity: Number(item.quantity) || 0,
//       rate: Number(item.rate) || 0,
//       amount: Number(item.quantity || 0) * Number(item.rate || 0)
//     }));

//     // Create new challan
//     const challan = new Challan({
//       userCode,
//       invoiceNo,
//       date: new Date(),
//       vehicleNo,
//       driverName,
//       mobileNo,
//       items: formattedItems,
//       totalAmount,
//       receiverName,
//       dcNo: invoiceNo // Add this to resolve the unique index issue
//     });

//     // Save the challan
//     // await challan.save();

//     const savedChallan = await challan.save();

//     // res.json({
//     //   message: 'Challan generated successfully',
//     //   challan
//     // });

//     res.json({
//       message: 'Challan generated successfully',
//       challan: savedChallan,
//       downloadUrl: `/api/dispatch/challan/${savedChallan._id}/download` // Add download URL
//     });
//   } catch (error) {
//     console.error('Challan generation error:', error);
    
//     // More detailed error handling
//     if (error.code === 11000) {
//       return res.status(400).json({ 
//         error: 'Duplicate challan generated',
//         details: 'A challan with this number already exists'
//       });
//     }

//     res.status(500).json({ 
//       error: 'Error generating challan',
//       details: error.message 
//     });
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
      receiverName,
      deliveryChoice, // New: 'homeDelivery' or 'companyPickup'
      shippingAddress, // New: Contains address, city, state, pinCode
      deliveryCharge: manualDeliveryCharge // New: Optional manual delivery charge
    } = req.body;

    // Validate input
    if (!userCode) {
      return res.status(400).json({ error: 'User code is required' });
    }

    // Validate items
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Invalid or empty items list' });
    }

    // Validate shipping address if provided
    if (shippingAddress && (!shippingAddress.address || !shippingAddress.city || !shippingAddress.state || !shippingAddress.pinCode)) {
      return res.status(400).json({ error: 'Complete shipping address with pin code is required' });
    }

    if (shippingAddress && !/^\d{6}$/.test(shippingAddress.pinCode)) {
      return res.status(400).json({ error: 'Pin code must be 6 digits' });
    }

    // Validate delivery choice
    if (deliveryChoice && !['homeDelivery', 'companyPickup'].includes(deliveryChoice)) {
      return res.status(400).json({ error: 'Invalid delivery choice' });
    }

    // Generate invoice number
    const invoiceNo = await generateInvoiceNumber();

    // Calculate total amount based on boxes and rate
    const totalAmount = items.reduce((sum, item) => {
      const boxes = Number(item.boxes) || 0; // Use 'boxes' instead of 'quantity'
      const rate = Number(item.rate) || 0;
      if (boxes < 230) {
        throw new Error(`Minimum 230 boxes required for item: ${item.productName || item.description}`);
      }
      return sum + (boxes * rate);
    }, 0);

    // Prepare items for schema
    const formattedItems = items.map(item => ({
      description: item.productName || item.description || 'Unnamed Item',
      boxes: Number(item.boxes) || 0, // Use 'boxes' instead of 'quantity'
      rate: Number(item.rate) || 0,
      amount: Number(item.boxes || 0) * Number(item.rate || 0)
    }));

    // Calculate delivery charge
    let deliveryCharge = 0;
    if (manualDeliveryCharge !== undefined) {
      // Use manually provided delivery charge
      deliveryCharge = Number(manualDeliveryCharge);
      if (isNaN(deliveryCharge) || deliveryCharge < 0) {
        return res.status(400).json({ error: 'Invalid delivery charge' });
      }
    } else if (deliveryChoice && shippingAddress) {
      // Automatically calculate delivery charge
      const totalBoxes = formattedItems.reduce((sum, item) => sum + item.boxes, 0);
      deliveryCharge = calculateDeliveryCharge(totalBoxes, deliveryChoice, shippingAddress.pinCode);
    }

    // Calculate total amount with delivery
    const totalAmountWithDelivery = totalAmount + deliveryCharge;

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
      deliveryCharge, // New field
      totalAmountWithDelivery, // New field
      receiverName,
      dcNo: invoiceNo,
      shippingAddress: shippingAddress || undefined, // Include shipping address if provided
      deliveryChoice: deliveryChoice || undefined // Include delivery choice if provided
    });

    // Save the challan
    const savedChallan = await challan.save();

    res.json({
      message: 'Challan generated successfully',
      challan: savedChallan,
      downloadUrl: `/api/dispatch/challan/${savedChallan._id}/download`
    });
  } catch (error) {
    console.error('Challan generation error:', error);
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

// In dispatchController.js
exports.updateCODPaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { paymentStatus, notes } = req.body;

    // Valid COD-specific payment statuses
    const validCODStatuses = [
      'pending',
      'payment_received_by_driver',
      'cash_paid_offline'
    ];

    // Check if the provided status is valid
    if (!validCODStatuses.includes(paymentStatus)) {
      return res.status(400).json({ 
        error: 'Invalid payment status for COD order' 
      });
    }

    // Find the order
    const order = await Order.findById(orderId)
      .populate('user', 'name customerDetails.userCode');

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check if the order uses COD payment method
    if (order.paymentMethod !== 'COD') {
      return res.status(400).json({ 
        error: 'This action is only allowed for COD orders' 
      });
    }

    // Check if the user has dispatch role
    if (req.user.role !== 'dispatch') {
      return res.status(403).json({ 
        error: 'Only dispatch personnel can update COD payment status' 
      });
    }

    // Prevent changing status if payment is already completed or failed
    if (['completed', 'failed'].includes(order.paymentStatus)) {
      return res.status(400).json({ 
        error: 'Cannot modify payment status after completion or failure' 
      });
    }

    // Update the payment status
    order._updatedBy = req.user._id;
    order.paymentStatus = paymentStatus;

    // Add to payment status history
    order.paymentStatusHistory.push({
      status: paymentStatus,
      updatedBy: req.user._id,
      notes: notes || `Updated by ${req.user.name}`
    });

    await order.save();

    res.json({ 
      message: 'COD payment status updated successfully',
      order: {
        orderId: order._id,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        updatedBy: req.user.name,
        updatedAt: new Date()
      }
    });
  } catch (error) {
    console.error('Error updating COD payment status:', error);
    res.status(500).json({ 
      error: 'Error updating COD payment status',
      details: error.message 
    });
  }
}
  exports.getPendingPayments = async (req, res) => {
    try {
      const pendingOrders = await Order.find({
        paymentStatus: 'pending'
      })
        .populate('user', 'name phoneNumber email customerDetails.firmName customerDetails.userCode')
        .populate('products.product', 'name type')
        .sort({ createdAt: -1 });
  
      const formattedOrders = pendingOrders.map(order => ({
        orderId: order.orderId,
        user: {
          name: order.user?.name || 'N/A',
          firmName: order.user?.customerDetails?.firmName || 'N/A',
          userCode: order.user?.customerDetails?.userCode || 'N/A',
          phoneNumber: order.user?.phoneNumber || 'N/A',
          email: order.user?.email || 'N/A'
        },
        products: order.products.map(p => ({
          productName: p.product?.name || 'N/A',
          productType: p.product?.type || 'N/A',
          quantity: Number(p.quantity),
          price: Number(p.price)
        })),
        totalAmount: Number(order.totalAmount),
        deliveryCharge: Number(order.deliveryCharge || 0),
        totalAmountWithDelivery: Number(order.totalAmountWithDelivery),
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        orderStatus: order.orderStatus,
        shippingAddress: order.shippingAddress,
        firmName: order.firmName,
        gstNumber: order.gstNumber || 'N/A',
        createdAt: order.createdAt,
        updatedAt: order.updatedAt
      }));
  
      res.json({
        count: formattedOrders.length,
        pendingPayments: formattedOrders
      });
    } catch (error) {
      console.error('Error fetching pending payments:', error);
      res.status(500).json({
        error: 'Error fetching pending payments',
        details: error.message
      });
    }
};



exports.downloadPendingPaymentsExcel = async (req, res) => {
  try {
    const pendingOrders = await Order.find({
      paymentStatus: 'pending'
    })
      .populate('user', 'name phoneNumber email customerDetails.firmName customerDetails.userCode')
      .populate('products.product', 'name type')
      .sort({ createdAt: -1 });

    const formattedOrders = pendingOrders.map(order => ({
      orderId: order.orderId,
      user: {
        name: order.user?.name || 'N/A',
        firmName: order.user?.customerDetails?.firmName || 'N/A',
        userCode: order.user?.customerDetails?.userCode || 'N/A',
        phoneNumber: order.user?.phoneNumber || 'N/A',
        email: order.user?.email || 'N/A'
      },
      products: order.products.map(p => ({
        productName: p.product?.name || 'N/A',
        productType: p.product?.type || 'N/A',
        quantity: Number(p.quantity),
        price: Number(p.price)
      })),
      totalAmount: Number(order.totalAmount),
      deliveryCharge: Number(order.deliveryCharge || 0),
      totalAmountWithDelivery: Number(order.totalAmountWithDelivery),
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      orderStatus: order.orderStatus,
      shippingAddress: order.shippingAddress,
      firmName: order.firmName,
      gstNumber: order.gstNumber || 'N/A',
      createdAt: order.createdAt,
      updatedAt: order.updatedAt
    }));

    // Create a new Excel workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Pending Payments');

    // Define columns
    worksheet.columns = [
      { header: 'Order ID', key: 'orderId', width: 15 },
      { header: 'Customer Name', key: 'customerName', width: 20 },
      { header: 'Firm Name', key: 'firmName', width: 20 },
      { header: 'User Code', key: 'userCode', width: 15 },
      { header: 'Phone Number', key: 'phoneNumber', width: 15 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'Products', key: 'products', width: 30 },
      { header: 'Total Amount', key: 'totalAmount', width: 15 },
      { header: 'Delivery Charge', key: 'deliveryCharge', width: 15 },
      { header: 'Total with Delivery', key: 'totalAmountWithDelivery', width: 20 },
      { header: 'Payment Method', key: 'paymentMethod', width: 15 },
      { header: 'Payment Status', key: 'paymentStatus', width: 15 },
      { header: 'Order Status', key: 'orderStatus', width: 15 },
      { header: 'Shipping Address', key: 'shippingAddress', width: 30 },
      { header: 'GST Number', key: 'gstNumber', width: 15 },
      { header: 'Created At', key: 'createdAt', width: 20 },
      { header: 'Updated At', key: 'updatedAt', width: 20 }
    ];

    // Add rows
    formattedOrders.forEach(order => {
      worksheet.addRow({
        orderId: order.orderId,
        customerName: order.user.name,
        firmName: order.user.firmName,
        userCode: order.user.userCode,
        phoneNumber: order.user.phoneNumber,
        email: order.user.email,
        products: order.products.map(p => `${p.productName} (${p.quantity})`).join(', '),
        totalAmount: order.totalAmount,
        deliveryCharge: order.deliveryCharge,
        totalAmountWithDelivery: order.totalAmountWithDelivery,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        orderStatus: order.orderStatus,
        shippingAddress: order.shippingAddress,
        gstNumber: order.gstNumber,
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString()
      });
    });

    // Style the header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'D3D3D3' }
    };

    // Set response headers for Excel download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=pending_payments.xlsx');

    // Write the workbook to the response
    await workbook.xlsx.write(res);

    // End the response
    res.end();
  } catch (error) {
    console.error('Error generating Excel file:', error);
    res.status(500).json({
      error: 'Error generating Excel file',
      details: error.message
    });
  }

  };


