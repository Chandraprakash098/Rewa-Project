const Stock = require('../models/Stock');
const Product = require('../models/Product');

class StockController {
    // Get dashboard view of all products with quantities
    async getDashboard(req, res) {
        try {
            const stockItems = await Stock.find()
                .populate('productId', 'name description price image')
                .sort('productId.name');
            
            res.status(200).json({
                success: true,
                data: stockItems
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error fetching stock dashboard',
                error: error.message
            });
        }
    }

    // Update quantity for a specific product
    async updateQuantity(req, res) {
        try {
            const { productId, quantity, changeType, notes } = req.body;
            const userId = req.user.id; // Assuming user info is attached to req by auth middleware

            let stock = await Stock.findOne({ productId });
            
            if (!stock) {
                return res.status(404).json({
                    success: false,
                    message: 'Stock record not found for this product'
                });
            }

            // Update the stock quantity
            stock.updateQuantity(quantity, userId, changeType, notes);
            await stock.save();

            res.status(200).json({
                success: true,
                data: stock,
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

    // Get stock history for a product
    async getStockHistory(req, res) {
        try {
            const { productId } = req.params;
            const stock = await Stock.findOne({ productId })
                .populate('updateHistory.updatedBy', 'name');

            if (!stock) {
                return res.status(404).json({
                    success: false,
                    message: 'Stock history not found for this product'
                });
            }

            res.status(200).json({
                success: true,
                data: stock.updateHistory
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error fetching stock history',
                error: error.message
            });
        }
    }

    // Get low stock alerts
    async getLowStockAlerts(req, res) {
        try {
            const threshold = req.query.threshold || 10; // Default threshold of 10 units
            
            const lowStockItems = await Stock.find({ quantity: { $lte: threshold } })
                .populate('productId', 'name description price');

            res.status(200).json({
                success: true,
                data: lowStockItems
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error fetching low stock alerts',
                error: error.message
            });
        }
    }
}

module.exports = new StockController();