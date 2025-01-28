// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // Common fields for all roles
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  phoneNumber: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'user', 'reception', 'stock', 'dispatch', 'marketing','miscellaneous'],
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: true
  },

  // Fields specific to regular users (customers)
  customerDetails: {
    firmName: {
      type: String,
      required: function() {
        return this.role === 'user';
      }
    },
    gstNumber: String,
    panNumber: String,
    photo: String,
    address: {
      type: String,
      required: function() {
        return this.role === 'user';
      }
    },
    userCode: {
      type: String,
      unique: true,
      sparse: true // Allows null values and only enforces uniqueness for non-null values
    }
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }

  
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  
  // Generate user code only for regular users
  if (this.role === 'user' && !this.customerDetails.userCode) {
    this.customerDetails.userCode = 'OPT' + Math.floor(1000 + Math.random() * 9000);
  }
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);