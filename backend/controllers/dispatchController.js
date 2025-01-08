const Order = require('../models/Order');
const User = require('../models/User');

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

// Get preview orders (all pending orders)
exports.getPreviewOrders = async (req, res) => {
  try {
    const orders = await Order.find({ status: 'pending' })
      .populate('user', 'name customerDetails.firmName customerDetails.userCode')
      .populate('products.product')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Get pending orders
exports.getPendingOrders = async (req, res) => {
  try {
    const orders = await Order.find({ status: 'pending' })
      .populate('user', 'name customerDetails.firmName customerDetails.userCode')
      .populate('products.product')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

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
exports.getOrderHistory = async (req, res) => {
  try {
    const thirtyFiveDaysAgo = new Date();
    thirtyFiveDaysAgo.setDate(thirtyFiveDaysAgo.getDate() - 35);

    const orders = await Order.find({
      status: 'completed',
      createdAt: { $gte: thirtyFiveDaysAgo }
    })
    .populate('user', 'name customerDetails.firmName customerDetails.userCode')
    .populate('products.product')
    .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
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
