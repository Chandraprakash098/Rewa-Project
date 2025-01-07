const Stock = require('../models/Stock');
const Product = require('../models/Product');

class StockController {
    // Get all products with their quantities
    async getAllProducts(req, res) {
        try {
            const products = await Product.find({ isActive: true })
                .select('name description price quantity image');
            
            res.status(200).json({
                success: true,
                data: products
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error fetching products',
                error: error.message
            });
        }
    }

    // Update quantity for a specific product
    async updateQuantity(req, res) {
        try {
            const { productId, quantity, changeType, notes } = req.body;
            const userId = req.user.id;

            const product = await Product.findById(productId);
            
            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found'
                });
            }

            // Calculate new quantity based on change type
            let newQuantity = product.quantity;
            if (changeType === 'addition') {
                newQuantity += parseInt(quantity);
            } else if (changeType === 'reduction') {
                newQuantity -= parseInt(quantity);
                if (newQuantity < 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'Insufficient stock quantity'
                    });
                }
            } else {
                newQuantity = parseInt(quantity); // Direct adjustment
            }

            // Update product quantity
            product.quantity = newQuantity;
            await product.save();

            // Record stock update history
            const stockUpdate = await Stock.findOneAndUpdate(
                { productId },
                {
                    $set: { quantity: newQuantity, updatedBy: userId },
                    $push: {
                        updateHistory: {
                            quantity: newQuantity,
                            updatedAt: new Date(),
                            updatedBy: userId,
                            changeType,
                            notes
                        }
                    }
                },
                { upsert: true, new: true }
            );

            res.status(200).json({
                success: true,
                data: {
                    product,
                    stockUpdate
                },
                message: 'Stock quantity updated successfully'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error updating stock quantity',
                error: error.message
            });
        }
    }

    // Get stock update history for a product
    async getStockHistory(req, res) {
        try {
            const { productId } = req.params;
            const stockHistory = await Stock.findOne({ productId })
                .populate('updateHistory.updatedBy', 'name')
                .populate('productId', 'name');

            if (!stockHistory) {
                return res.status(404).json({
                    success: false,
                    message: 'No stock history found for this product'
                });
            }

            res.status(200).json({
                success: true,
                data: stockHistory
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error fetching stock history',
                error: error.message
            });
        }
    }
}

module.exports = new StockController();