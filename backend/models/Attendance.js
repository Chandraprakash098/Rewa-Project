const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  panel: {
    type: String,
    enum: ['reception', 'marketing', 'stock', 'dispatch'],
    required: true
  },
  checkInTime: {
    type: Date,
    required: true
  },
  checkOutTime: {
    type: Date,
    default: null
  },
  date: {
    type: Date,
    required: true
  },
  totalHours: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['checked-in', 'checked-out'],
    default: 'checked-in'
  }
}, { timestamps: true });

// Add a method to calculate total hours
AttendanceSchema.pre('save', function(next) {
  if (this.checkInTime && this.checkOutTime) {
    const diffMs = this.checkOutTime - this.checkInTime;
    this.totalHours = diffMs / (1000 * 60 * 60); // Convert milliseconds to hours
  }
  next();
});

module.exports = mongoose.model('Attendance', AttendanceSchema);