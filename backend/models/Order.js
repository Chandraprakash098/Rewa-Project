const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  products: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity: {
      type: Number,
      required: true
    },
    price: {
      type: Number,
      required: true
    }
  }],
  totalAmount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'cancelled'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['UPI', 'netBanking', 'COD','Debit Card'],
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  deliveryNote: {
    challanNumber: String,
    vehicleNumber: String,
    driverName: String,
    fuelType: String,
    createdAt: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Auto-delete orders older than 35 days
orderSchema.index({ createdAt: 1 }, { expireAfterSeconds: 35 * 24 * 60 * 60 });

module.exports = mongoose.model('Order', orderSchema);