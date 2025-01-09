// const mongoose = require('mongoose');

// const orderSchema = new mongoose.Schema({
//   user: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User',
//     required: true
//   },
//   products: [{
//     product: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'Product',
//       required: true
//     },
//     quantity: {
//       type: Number,
//       required: true
//     },
//     price: {
//       type: Number,
//       required: true
//     }
//   }],
//   totalAmount: {
//     type: Number,
//     required: true
//   },
//   status: {
//     type: String,
//     enum: ['pending', 'processing', 'completed', 'cancelled'],
//     default: 'pending'
//   },
//   paymentMethod: {
//     type: String,
//     enum: ['UPI', 'netBanking', 'COD','Debit Card'],
//     required: true
//   },
//   paymentStatus: {
//     type: String,
//     enum: ['pending', 'completed', 'failed'],
//     default: 'pending'
//   },
//   deliveryNote: {
//     challanNumber: String,
//     vehicleNumber: String,
//     driverName: String,
//     fuelType: String,
//     createdAt: Date
//   },
//   createdAt: {
//     type: Date,
//     default: Date.now
//   }
// });

// // Auto-delete orders older than 35 days
// orderSchema.index({ createdAt: 1 }, { expireAfterSeconds: 35 * 24 * 60 * 60 });

// module.exports = mongoose.model('Order', orderSchema);




// const mongoose = require('mongoose');

// const orderSchema = new mongoose.Schema({
//   user: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User',
//     required: true
//   },
//   products: [{
//     product: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'Product',
//       required: true
//     },
//     quantity: {
//       type: Number,
//       required: true,
//       min: 1
//     },
//     price: {
//       type: Number,
//       required: true,
//       min: 0
//     }
//   }],
//   totalAmount: {
//     type: Number,
//     required: true,
//     min: 0
//   },
//   paymentMethod: {
//     type: String,
//     required: true,
//     enum: ['UPI', 'netBanking', 'COD', 'Debit Card']
//   },
//   paymentStatus: {
//     type: String,
//     required: true,
//     enum: ['pending', 'completed', 'failed'],
//     default: 'pending'
//   },
//   orderStatus: {
//     type: String,
//     required: true,
//     enum: ['processing', 'confirmed', 'shipped', 'delivered', 'cancelled'],
//     default: 'processing'
//   },
//   shippingAddress: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Address',
//     required: true
//   },
//   createdAt: {
//     type: Date,
//     default: Date.now
//   },
//   updatedAt: {
//     type: Date,
//     default: Date.now
//   }
// });

// // Update the updatedAt timestamp before saving
// orderSchema.pre('save', function(next) {
//   this.updatedAt = new Date();
//   next();
// });

// // Virtual for order ID (e.g., ORD-2024-0001)
// orderSchema.virtual('orderId').get(function() {
//   return `ORD-${this.createdAt.getFullYear()}-${this._id.toString().slice(-4).toUpperCase()}`;
// });

// // Include virtuals when converting to JSON
// orderSchema.set('toJSON', { virtuals: true });

// // Add an index for faster queries
// orderSchema.index({ user: 1, createdAt: -1 });

// module.exports = mongoose.model('Order', orderSchema);







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
      required: true,
      min: 1
    },
    price: {
      type: Number,
      required: true,
      min: 0
    }
  }],
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['UPI', 'netBanking', 'COD', 'Debit Card']
  },
  paymentStatus: {
    type: String,
    required: true,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  orderStatus: {
    type: String,
    required: true,
    enum: ['processing', 'confirmed', 'shipped', 'delivered', 'cancelled'],
    default: 'processing'
  },
  shippingAddress: {
    type: String,
    required: true
  },
  firmName: {
    type: String,
    required: true
  },
  gstNumber: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt timestamp before saving
orderSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Virtual for order ID (e.g., ORD-2024-0001)
orderSchema.virtual('orderId').get(function() {
  return `ORD-${this.createdAt.getFullYear()}-${this._id.toString().slice(-4).toUpperCase()}`;
});

// Include virtuals when converting to JSON
orderSchema.set('toJSON', { virtuals: true });

// Add an index for faster queries
orderSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);