const mongoose = require("mongoose");

const challanSchema = new mongoose.Schema({
  userCode: {
    type: String,
    required: true,
  },
  invoiceNo: {
    type: String,
    required: true,
    unique: true,
  },
  dcNo: {
    type: String,
    required: true,
    unique: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  vehicleNo: String,
  driverName: String,
  mobileNo: String,
  items: [
    {
      description: String,
      boxes: {
        type: Number,
        required: true,
        min: 230,
      },
      rate: {
        type: Number,
        required: true,
        min: 0,
      },
      amount: {
        type: Number,
        required: true,
        min: 0,
      },
    },
  ],
  totalAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  deliveryCharge: {
    type: Number,
    default: 0,
    min: 0,
  },
  totalAmountWithDelivery: {
    type: Number,
    required: true,
    min: 0,
  },
  receiverName: String,
  shippingAddress: {
    address: String,
    city: String,
    state: String,
    pinCode: String,
  },
  deliveryChoice: {
    type: String,
    enum: ["homeDelivery", "companyPickup"],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Challan", challanSchema);
