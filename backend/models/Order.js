


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
//   deliveryCharge: {
//     type: Number,
//     default: 0,
//     min: 0
//   },
//   totalAmountWithDelivery: {
//     type: Number,
//     required: true,
//     min: 0
//   },
//   paymentMethod: {
//     type: String,
//     required: true,
//     enum: ['UPI', 'netBanking', 'COD', 'Debit Card']
//   },
//   // paymentStatus: {
//   //   type: String,
//   //   required: true,
//   //   enum: ['pending', 'completed', 'failed'],
//   //   default: 'pending'
//   // },

//   paymentStatus: {
//     type: String,
//     required: true,
//     enum: [
//       'pending', 
//       'completed', 
//       'failed',
//       'payment_received_by_driver', // New status
//       'cash_paid_offline'           // New status
//     ],
//     default: 'pending'
//   },
//   // Add payment history tracking
//   paymentStatusHistory: [{
//     status: String,
//     updatedBy: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'User'
//     },
//     updatedAt: {
//       type: Date,
//       default: Date.now
//     },
//     notes: String // Optional notes for the status change
//   }],
//   orderStatus: {
//     type: String,
//     required: true,
//     enum: ['pending', 'preview', 'processing', 'confirmed', 'shipped', 'cancelled'],
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

//   //new for recption order
//   createdByReception: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User'
//   },

//   deliveryChargeAddedBy: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User'
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
 

//   userActivityStatus: {
//     type: String,
//     enum: ['active', 'inactive'],
//   },
//   inactiveDays: {
//     type: Number,
//     default: 0
//   },
//   reactivatedWithOrder: {
//     type: Boolean,
//     default: false
//   },


//   createdAt: {
//     type: Date,
//     default: Date.now
//   },
//   updatedAt: {
//     type: Date,
//     default: Date.now
//   },
//   expiresAt: {
//     type: Date,
//     default: function() {
//       const date = new Date(this.createdAt);
//       date.setDate(date.getDate() + 35); // Set expiration to 35 days from createdAt
//       return date;
//     },
//     index: { expires: 0 }
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
//   if (this.isModified('paymentStatus')) {
//     this.paymentStatusHistory.push({
//       status: this.paymentStatus,
//       updatedBy: this._updatedBy,
//       updatedAt: new Date()
//     });
//   }
//   this.updatedAt = new Date();
//   next();
// });

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
    boxes: {
      type: Number,
      required: true,
      min: 230 // Minimum 230 boxes
    },
    price: {
      type: Number,
      required: true,
      min: 0 // Price per box
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
    enum: [
      'pending',
      'completed',
      'failed',
      'payment_received_by_driver',
      'cash_paid_offline'
    ],
    default: 'pending'
  },
  paymentStatusHistory: [{
    status: String,
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    updatedAt: {
      type: Date,
      default: Date.now
    },
    notes: String
  }],
  orderStatus: {
    type: String,
    required: true,
    enum: ['pending', 'preview', 'processing', 'confirmed', 'shipped', 'cancelled'],
    default: 'pending'
  },
  shippingAddress: {
    address: {
      type: String,
      required: false
    },
    city: {
      type: String,
      required: false
    },
    state: {
      type: String,
      required: false
    },
    pinCode: {
      type: String,
      required: false,
      match: [/^\d{6}$/, 'Pin code must be 6 digits']
    }
  },
  deliveryChoice: {
    type: String,
    required: false,
    enum: ['homeDelivery', 'companyPickup']
  },
  firmName: {
    type: String,
    required: true
  },
  gstNumber: String,
  type: {
    type: String,
    required: true,
    enum: ['Bottle', 'Raw Material']
  },
  createdByReception: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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
    enum: ['active', 'inactive']
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
  },
  expiresAt: {
    type: Date,
    default: function() {
      const date = new Date(this.createdAt);
      date.setDate(date.getDate() + 35);
      return date;
    },
    index: { expires: 0 }
  }
});

orderSchema.pre('save', function(next) {
  if (this.isModified('orderStatus')) {
    this.statusHistory.push({
      status: this.orderStatus,
      updatedBy: this._updatedBy,
      updatedAt: new Date()
    });
  }
  if (this.isModified('paymentStatus')) {
    this.paymentStatusHistory.push({
      status: this.paymentStatus,
      updatedBy: this._updatedBy,
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