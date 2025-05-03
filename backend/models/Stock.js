const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 0
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    updateHistory: [{
        // quantity: Number,
        boxes: Number,
        updatedAt: Date,
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        changeType: {
            type: String,
            enum: ['addition', 'reduction', 'adjustment'],
            required: true
        },
        notes: String
    }]
});

// Pre-save middleware to update lastUpdated
stockSchema.pre('save', function(next) {
    this.lastUpdated = new Date();
    next();
});

// Method to update stock quantity
stockSchema.methods.updateQuantity = function(newQuantity, userId, changeType, notes) {
    const oldQuantity = this.quantity;
    this.quantity = newQuantity;
    
    this.updateHistory.push({
        quantity: newQuantity,
        updatedAt: new Date(),
        updatedBy: userId,
        changeType: changeType,
        notes: notes
    });
};

const Stock = mongoose.model('Stock', stockSchema);
module.exports = Stock;