const Stock = require("../models/Stock");
const Product = require("../models/Product");
const Attendance = require("../models/Attendance");
const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");

class StockController {
  async getAllProducts(req, res) {
    try {
      const products = await Product.find({ isActive: true }).select(
        "name description price boxes image"
      );

      res.status(200).json({
        success: true,
        data: products,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error fetching products",
        error: error.message,
      });
    }
  }

  async updateQuantity(req, res) {
    try {
      const { productId, boxes, changeType, notes } = req.body;
      const userId = req.user.id;

      if (!productId || !boxes || !changeType) {
        return res.status(400).json({
          success: false,
          message: "productId, boxes, and changeType are required",
        });
      }

      const changeBoxes = parseInt(boxes);
      if (isNaN(changeBoxes) || changeBoxes <= 0) {
        return res.status(400).json({
          success: false,
          message: "Boxes must be a positive number",
        });
      }

      const product = await Product.findById(productId);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      if (product.boxes < 0) {
        product.boxes = 0;
        await product.save();
      }

      let newBoxes = product.boxes;
      if (changeType === "addition") {
        newBoxes += changeBoxes;
      } else if (changeType === "reduction") {
        newBoxes -= changeBoxes;
        if (newBoxes < 0) {
          return res.status(400).json({
            success: false,
            message: "Insufficient stock boxes",
          });
        }
      } else if (changeType === "adjustment") {
        newBoxes = changeBoxes;
      } else {
        return res.status(400).json({
          success: false,
          message: "Invalid changeType",
        });
      }

      const remark = {
        message: `Stock ${changeType}: ${changeBoxes} boxes. ${notes || ""}`,
        updatedBy: userId,
        boxes: changeBoxes,
        changeType: changeType,
      };

      await Product.findByIdAndUpdate(productId, {
        $set: { boxes: newBoxes },
        $push: {
          stockRemarks: {
            $each: [remark],
            $position: 0,
          },
        },
      });

      let stockUpdate = await Stock.findOne({ productId });
      if (!stockUpdate) {
        stockUpdate = new Stock({
          productId,
          quantity: newBoxes,
          updatedBy: userId,
          updateHistory: [],
        });
      }

      stockUpdate.updateQuantity(
        newBoxes,
        userId,
        changeType,
        notes,
        changeBoxes
      );
      await stockUpdate.save();

      res.status(200).json({
        success: true,
        data: {
          product: await Product.findById(productId),
          stockUpdate,
        },
        message: "Stock boxes updated successfully",
      });
    } catch (error) {
      console.error("Error updating stock boxes:", error);
      res.status(500).json({
        success: false,
        message: "Error updating stock boxes",
        error: error.message,
      });
    }
  }

  async getStockHistory(req, res) {
    try {
      const { productId } = req.params;
      const stockHistory = await Stock.findOne({ productId })
        .populate("updateHistory.updatedBy", "name")
        .populate("productId", "name");

      if (!stockHistory) {
        return res.status(404).json({
          success: false,
          message: "No stock history found for this product",
        });
      }

      res.status(200).json({
        success: true,
        data: stockHistory,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error fetching stock history",
        error: error.message,
      });
    }
  }

  async getallStockHistory(req, res) {
    try {
      const stockHistory = await Stock.find()
        .populate("updateHistory.updatedBy", "name")
        .populate("productId", "name");

      if (!stockHistory || stockHistory.length === 0) {
        return res.status(404).json({
          success: false,
          message: "No stock history found",
        });
      }

      res.status(200).json({
        success: true,
        data: stockHistory,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error fetching stock history",
        error: error.message,
      });
    }
  }

  async checkIn(req, res) {
    try {
      const { selectedDate } = req.body;

      if (!req.file) {
        return res
          .status(400)
          .json({ error: "Please upload a check-in image" });
      }

      if (!selectedDate) {
        return res
          .status(400)
          .json({ error: "Please select a date for check-in" });
      }

      const checkInDate = new Date(selectedDate);
      checkInDate.setHours(0, 0, 0, 0);

      const existingAttendance = await Attendance.findOne({
        user: req.user._id,
        panel: "stock",
        selectedDate: checkInDate,
        $or: [{ status: "checked-in" }, { status: "present" }],
      });

      if (existingAttendance) {
        return res
          .status(400)
          .json({ error: "Already checked in for this date" });
      }

      const uploadPromise = new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: "check-in-photos",
            resource_type: "image",
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );

        streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
      });

      const cloudinaryResponse = await uploadPromise;

      const attendance = new Attendance({
        user: req.user._id,
        panel: "stock",
        checkInTime: new Date(),
        selectedDate: checkInDate,
        status: "present",
        checkInImage: cloudinaryResponse.secure_url,
      });

      await attendance.save();

      res.json({ message: "Check-in successful", attendance });
    } catch (error) {
      console.error("Check-in error:", error);
      res
        .status(500)
        .json({ error: "Error during check-in", details: error.message });
    }
  }

  async checkOut(req, res) {
    try {
      const { selectedDate } = req.body;

      if (!selectedDate) {
        return res.status(400).json({
          error: "Please select a date for check-out",
        });
      }

      const checkOutDate = new Date(selectedDate);
      checkOutDate.setHours(0, 0, 0, 0);

      const attendance = await Attendance.findOne({
        user: req.user._id,
        panel: "stock",
        selectedDate: checkOutDate,
        status: "present",
      });

      if (!attendance) {
        return res.status(400).json({
          error: "No active check-in found for selected date",
        });
      }

      attendance.checkOutTime = new Date();
      attendance.status = "checked-out";
      await attendance.save();

      res.json({
        message: "Check-out successful",
        attendance,
      });
    } catch (error) {
      res.status(500).json({
        error: "Error during check-out",
        details: error.message,
      });
    }
  }

  async getDailyStockUpdates(req, res) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const stockUpdates = await Stock.find({
        "updateHistory.updatedAt": { $gte: today },
        "updateHistory.updatedBy": req.user._id,
      }).populate("productId", "name");

      res.json({
        dailyStockUpdates: stockUpdates,
      });
    } catch (error) {
      res.status(500).json({
        error: "Error fetching daily stock updates",
        details: error.message,
      });
    }
  }
}

module.exports = new StockController();
