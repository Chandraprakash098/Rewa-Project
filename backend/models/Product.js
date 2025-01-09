// const mongoose = require('mongoose');

// const productSchema = new mongoose.Schema({
//   name: {
//     type: String,
//     required: true
//   },
//   description: String,
//   price: {
//     type: Number,
//     required: true
//   },
//   offerPrice: Number,
//   quantity: {
//     type: Number,
//     required: true
//   },
//   image: String,
//   isOffer: {
//     type: Boolean,
//     default: false
//   },
//   isActive: {
//     type: Boolean,
//     default: true
//   },
//   createdAt: {
//     type: Date,
//     default: Date.now
//   }
// });

// module.exports = mongoose.model('Product', productSchema);




const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: String,
  originalPrice: {
    type: Number,
    required: true
  },
  discountedPrice: {
    type: Number
  },
  quantity: {
    type: Number,
    required: true
  },
  image: String,
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Calculate discount percentage and whether item is on offer
productSchema.virtual('discountPercentage').get(function() {
  if (this.discountedPrice && this.originalPrice) {
    const discount = ((this.originalPrice - this.discountedPrice) / this.originalPrice) * 100;
    return Math.round(discount);
  }
  return 0;
});

productSchema.virtual('isOffer').get(function() {
  return Boolean(this.discountedPrice && this.discountedPrice < this.originalPrice);
});

// Modify toJSON to format the response
productSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    ret.price = ret.discountedPrice || ret.originalPrice;
    
    if (ret.discountedPrice && ret.discountedPrice < ret.originalPrice) {
      ret.discountTag = `${ret.discountPercentage}% OFF`;
    } else {
      delete ret.discountedPrice;
      delete ret.discountPercentage;
      delete ret.discountTag;
    }
    
    return ret;
  }
});

module.exports = mongoose.model('Product', productSchema);
