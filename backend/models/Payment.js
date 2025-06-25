// const mongoose = require('mongoose');

// const paymentSchema = new mongoose.Schema({
//   user: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User',
//     required: true
//   },
//   amount: {
//     type: Number,
//     required: true
//   },
//   paymentIntentId: {
//     type: String,
//     required: true
//   },
//   status: {
//     type: String,
//     enum: ['pending', 'completed', 'failed'],
//     default: 'pending'
//   },

//   userActivityStatus: {
//     type: String,
//     enum: ['active', 'inactive'],
//     required: true
//   },
//   orderDetails: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Order'
//   },

//   createdAt: {
//     type: Date,
//     default: Date.now
//   }
// });

// module.exports = mongoose.model('Payment', paymentSchema);


const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  paidAmount: {
    type: Number,
    default: 0
  },
  referenceId: {
    type: String,
    required: function() { return this.status !== 'pending'; }
  },
  screenshotUrl: {
    type: String,
    required: function() { return this.status !== 'pending'; }
  },
  status: {
    type: String,
    enum: ['pending', 'submitted', 'completed', 'failed'],
    default: 'pending'
  },
  userActivityStatus: {
    type: String,
    enum: ['active', 'inactive'],
    required: true
  },
  orderDetails: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verificationNotes: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date
  }
});

paymentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Payment', paymentSchema);