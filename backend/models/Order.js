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
//     enum: ['pending', 'preview', 'processing', 'confirmed', 'shipped', 'delivered', 'cancelled'],
//     default: 'pending'
//   },
//   shippingAddress: {
//     type: String,
//     required: true
//   },
//   firmName: {
//     type: String,
//     required: true
//   },
//   gstNumber: String,
//   type: {
//     type: String,
//     required: true,
//     enum: ['Bottle', 'Raw Material'], // Add additional types as needed
//   },
//   statusHistory: [{
//     status: String,
//     updatedBy: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'User'
//     },
//     updatedAt: {
//       type: Date,
//       default: Date.now
//     }
//   }],
//   createdAt: {
//     type: Date,
//     default: Date.now
//   },
//   updatedAt: {
//     type: Date,
//     default: Date.now
//   }
// });

// // Update the updatedAt timestamp and add status history before saving
// orderSchema.pre('save', function(next) {
//   if (this.isModified('orderStatus')) {
//     this.statusHistory.push({
//       status: this.orderStatus,
//       updatedBy: this._updatedBy, // Set by the controller
//       updatedAt: new Date()
//     });
//   }
//   this.updatedAt = new Date();
//   next();
// });

// // Virtual for order ID
// // orderSchema.virtual('orderId').get(function() {
// //   return `ORD-${this.createdAt.getFullYear()}-${this._id.toString().slice(-4).toUpperCase()}`;
// // });

// orderSchema.virtual('orderId').get(function() {
//   const year = this.createdAt ? this.createdAt.getFullYear() : new Date().getFullYear();
//   return `ORD-${year}-${this._id.toString().slice(-4).toUpperCase()}`;
// });

// orderSchema.set('toJSON', { virtuals: true });
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
  deliveryCharge: {
    type: Number,
    default: 0,
    min: 0
  },
  totalAmountWithDelivery: {
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
    enum: ['pending', 'preview', 'processing', 'confirmed', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
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
  type: {
    type: String,
    required: true,
    enum: ['Bottle', 'Raw Material'], // Add additional types as needed
  },
  deliveryChargeAddedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  statusHistory: [{
    status: String,
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }],
 

  userActivityStatus: {
    type: String,
    enum: ['active', 'inactive'],
    required: true
  },
  inactiveDays: {
    type: Number,
    default: 0
  },
  reactivatedWithOrder: {
    type: Boolean,
    default: false
  },
  

  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt timestamp and add status history before saving
orderSchema.pre('save', function(next) {
  if (this.isModified('orderStatus')) {
    this.statusHistory.push({
      status: this.orderStatus,
      updatedBy: this._updatedBy, // Set by the controller
      updatedAt: new Date()
    });
  }
  this.updatedAt = new Date();
  next();
});

orderSchema.virtual('orderId').get(function() {
  const year = this.createdAt ? this.createdAt.getFullYear() : new Date().getFullYear();
  return `ORD-${year}-${this._id.toString().slice(-4).toUpperCase()}`;
});

orderSchema.set('toJSON', { virtuals: true });
orderSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);