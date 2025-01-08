const mongoose = require('mongoose');

const challanSchema = new mongoose.Schema({
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  challanNumber: {
    type: String,
    required: true,
    unique: true
  },
  vehicleNumber: {
    type: String,
    required: true
  },
  driverName: {
    type: String,
    required: true
  },
  fuelType: {
    type: String,
    required: true,
    enum: ['petrol', 'diesel']
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 35 * 24 * 60 * 60 // Automatically delete after 35 days
  }
});

module.exports = mongoose.model('Challan', challanSchema);