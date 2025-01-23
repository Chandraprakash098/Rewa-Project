
const mongoose = require('mongoose');

const marketingActivitySchema = new mongoose.Schema({
  marketingUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  customerName: {
    type: String,
    required: true
  },
  discussion: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  images: [{
    type: String, // Cloudinary URL
    required: false
  }],
  status: {
    type: String,
    enum: ['pending', 'reviewed'],
    default: 'pending'
  },
  reviewedAt: Date,
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('MarketingActivity', marketingActivitySchema);