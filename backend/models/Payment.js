const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  paidAmount: {
    type: Number,
    default: 0,
  },

  paymentHistory: [
    {
      referenceId: {
        type: String,
        required: true,
      },
      screenshotUrl: {
        type: String,
        required: true,
      },
      submittedAmount: {
        type: Number,
        required: true,
        min: 0,
      },
      status: {
        type: String,
        enum: ["submitted", "verified", "rejected"],
        default: "submitted",
      },
      verifiedAmount: {
        type: Number,
        default: 0,
        min: 0,
      },
      verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      verificationNotes: String,
      submissionDate: {
        type: Date,
        default: Date.now,
      },
      verificationDate: Date,
    },
  ],
  status: {
    type: String,
    enum: ["pending", "submitted", "completed", "failed"],
    default: "pending",
  },
  userActivityStatus: {
    type: String,
    enum: ["active", "inactive"],
    required: true,
  },
  orderDetails: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
    required: true,
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  verificationNotes: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
  },
});

paymentSchema.virtual("remainingAmount").get(function () {
  return this.amount - this.paidAmount;
});

paymentSchema.set("toJSON", { virtuals: true });
paymentSchema.set("toObject", { virtuals: true });

paymentSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

paymentSchema.pre("save", async function (next) {
  if (this.orderDetails) {
    const order = await mongoose.model("Order").findById(this.orderDetails);
    if (!order) {
      return next(new Error("Invalid orderDetails reference"));
    }
  }
  next();
});

paymentSchema.index({ orderDetails: 1 });

module.exports = mongoose.model("Payment", paymentSchema);
