

// const mongoose = require('mongoose');

// const challanSchema = new mongoose.Schema({
//   userCode: {
//     type: String,
//     required: true
//   },
//   invoiceNo: {
//     type: String,
//     required: true
//   },
//   dcNo: {
//     type: String,
//     unique: true, // This resolves the unique index issue
//     required: true
//   },
//   date: {
//     type: Date,
//     required: true,
//     default: Date.now
//   },
//   vehicleNo: {
//     type: String,
//     required: true
//   },
//   driverName: {
//     type: String,
//     required: true
//   },
//   mobileNo: {
//     type: String,
//     required: true
//   },
//   items: [{
//     description: String,
//     quantity: Number,
   
//     rate: Number,
//     amount: Number
    
//   }],
//   totalAmount: {
//     type: Number,
//     required: true
//   },
  
//   receiverName: String,
//   signature: String,
//   companyDetails: {
//     name: {
//       type: String,
//       default: 'OPTIMA POLYPLAST LLP'
//     },
//     address: {
//       type: String,
//       default: 'Plot No. 12, 29k, Industrial Road, Near Umiya Battery, Mota Jalundra Industrial Zone, Dehgam, Gandhinagar, Mo. 9274663857'
//     },
//     certifications: {
//       type: [String],
//       default: ['ISO 9001:2015 Certified Company']
//     }
//   },
//   createdAt: {
//     type: Date,
//     default: Date.now,
//     expires: 35 * 24 * 60 * 60 // Automatically delete after 35 days
//   }
// });

// module.exports = mongoose.model('Challan', challanSchema);



const mongoose = require('mongoose');

const challanSchema = new mongoose.Schema({
  userCode: {
    type: String,
    required: true
  },
  invoiceNo: {
    type: String,
    required: true,
    unique: true
  },
  dcNo: {
    type: String,
    required: true,
    unique: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  vehicleNo: String,
  driverName: String,
  mobileNo: String,
  items: [{
    description: String,
    boxes: {
      type: Number,
      required: true,
      min: 230
    },
    rate: {
      type: Number,
      required: true,
      min: 0
    },
    amount: {
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
  receiverName: String,
  shippingAddress: {
    address: String,
    city: String,
    state: String,
    pinCode: String
  },
  deliveryChoice: {
    type: String,
    enum: ['homeDelivery', 'companyPickup']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Challan', challanSchema);