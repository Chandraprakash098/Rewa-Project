const cloudinary = require("../config/cloudinary");
const User = require("../models/User");
const Product = require("../models/Product");
const Order = require("../models/Order");
const MarketingActivity = require("../models/MarketingActivity");
const Attendance = require("../models/Attendance");
const UserActivity = require("../models/UserActivity");
const ExcelJS = require("exceljs");
const Stock = require("../models/Stock");
const Banner = require("../models/Banner");
const Payment = require("../models/Payment");

const adminController = {
  getAllStaff: async (req, res) => {
    try {
      const validStaffRoles = [
        "reception",
        "stock",
        "dispatch",
        "marketing",
        "miscellaneous",
      ];

      const staff = await User.find({
        role: { $in: validStaffRoles },
      })
        .select(
          "name email phoneNumber role originalPassword isActive createdAt"
        )
        .sort({ createdAt: -1 });

      const roleSummary = staff.reduce((acc, member) => {
        acc[member.role] = (acc[member.role] || 0) + 1;
        return acc;
      }, {});

      res.json({
        staff: staff.map((member) => ({
          _id: member._id,
          name: member.name,
          email: member.email,
          phoneNumber: member.phoneNumber,
          role: member.role,
          isActive: member.isActive,
          createdAt: member.createdAt,
        })),
        summary: {
          total: staff.length,
          byRole: roleSummary,
        },
      });
    } catch (error) {
      console.error("Error fetching staff members:", error);
      res.status(500).json({ error: "Error fetching staff members" });
    }
  },

  deleteStaff: async (req, res) => {
    try {
      const { staffId } = req.params;

      if (!staffId) {
        return res.status(400).json({ error: "Staff ID is required" });
      }

      const staff = await User.findById(staffId);
      if (!staff) {
        return res.status(404).json({ error: "Staff member not found" });
      }

      const validStaffRoles = [
        "reception",
        "stock",
        "dispatch",
        "marketing",
        "miscellaneous",
      ];
      if (!validStaffRoles.includes(staff.role)) {
        return res.status(400).json({ error: "Invalid staff member" });
      }

      await User.findByIdAndDelete(staffId);

      res.json({
        message: "Staff member deleted successfully",
        deletedStaff: {
          _id: staff._id,
          name: staff.name,
          email: staff.email,
          role: staff.role,
        },
      });
    } catch (error) {
      console.error("Error deleting staff member:", error);

      if (error.name === "CastError") {
        return res.status(400).json({ error: "Invalid staff ID format" });
      }

      res.status(500).json({ error: "Error deleting staff member" });
    }
  },

  getAllUsers: async (req, res) => {
    try {
      const users = await User.find({ role: "user" })
        .select(
          "name email phoneNumber customerDetails.firmName customerDetails.userCode isActive createdAt"
        )
        .sort({ createdAt: -1 });

      res.json({
        users: users.map((user) => ({
          // _id: user._id,
          userCode: user.customerDetails?.userCode,
          name: user.name,
          email: user.email,
          phoneNumber: user.phoneNumber,
          firmName: user.customerDetails?.firmName,
          isActive: user.isActive,
          createdAt: user.createdAt,
        })),
      });
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Error fetching users" });
    }
  },

  getUserActivityHistory: async (req, res) => {
    try {
      const { userId } = req.params;
      const { startDate, endDate } = req.query;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const activityHistory = await UserActivity.findOne({ user: userId });
      if (!activityHistory) {
        return res.status(404).json({ error: "No activity history found" });
      }

      let orderQuery = { user: userId };
      if (startDate && endDate) {
        orderQuery.createdAt = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        };
      }
      const orders = await Order.find(orderQuery)
        .select("createdAt totalAmount orderStatus")
        .sort({ createdAt: -1 });

      const periods = activityHistory.activityPeriods.map((period) => ({
        startDate: period.startDate,
        endDate: period.endDate || new Date(),
        status: period.status,
        duration: Math.ceil(
          (period.endDate || new Date() - period.startDate) /
            (1000 * 60 * 60 * 24)
        ),
      }));

      res.json({
        userId,
        userName: user.name,
        currentStatus: user.isActive ? "active" : "inactive",
        activityPeriods: periods,
        orders: orders.map((order) => ({
          orderId: order._id,
          date: order.createdAt,
          amount: order.totalAmount,
          status: order.orderStatus,
        })),
      });
    } catch (error) {
      console.error("Error fetching user activity:", error);
      res.status(500).json({ error: "Error fetching user activity history" });
    }
  },

  toggleUserStatus: async (req, res) => {
    try {
      const { userCode } = req.params;
      const user = await User.findOne({ "customerDetails.userCode": userCode });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (user.role !== "user") {
        return res
          .status(403)
          .json({ error: "Cannot modify admin user status" });
      }

      const newStatus = !user.isActive;
      user.isActive = newStatus;

      let userActivity = await UserActivity.findOne({ user: user._id });

      if (!userActivity) {
        userActivity = new UserActivity({
          user: user._id,
          activityPeriods: [
            {
              startDate: user.createdAt,
              status: "active",
            },
          ],
        });
      }

      const lastPeriod =
        userActivity.activityPeriods[userActivity.activityPeriods.length - 1];
      if (lastPeriod && !lastPeriod.endDate) {
        lastPeriod.endDate = new Date();
      }

      userActivity.activityPeriods.push({
        startDate: new Date(),
        status: newStatus ? "active" : "inactive",
      });

      await Promise.all([user.save(), userActivity.save()]);

      res.json({
        message: `User ${newStatus ? "activated" : "deactivated"} successfully`,
        userCode: user.customerDetails.userCode,
        isActive: newStatus,
      });
    } catch (error) {
      console.error("Error toggling user status:", error);
      res.status(500).json({ error: "Error updating user status" });
    }
  },

  createProduct: async (req, res) => {
    try {
      const {
        name,
        type,
        category,
        description,
        originalPrice,
        discountedPrice,
        boxes,
        bottlesPerBox,
        validFrom,
        validTo,
      } = req.body;

      const validCategories = Product.getCategoriesByType(type);
      if (!validCategories.includes(category)) {
        return res.status(400).json({
          error: `Invalid category for ${type}. Valid categories are: ${validCategories.join(
            ", "
          )}`,
        });
      }

      if (!boxes || Number(boxes) < 230) {
        return res.status(400).json({
          error: "Minimum 230 boxes are required",
        });
      }

      if (!bottlesPerBox || Number(bottlesPerBox) < 1) {
        return res.status(400).json({
          error: "bottlesPerBox must be at least 1",
        });
      }

      if (discountedPrice) {
        if (!validFrom || !validTo) {
          return res.status(400).json({
            error:
              "validFrom and validTo dates are required when setting a discounted price",
          });
        }

        const fromDate = new Date(validFrom);
        const toDate = new Date(validTo);
        const now = new Date();

        if (fromDate > toDate) {
          return res.status(400).json({
            error: "validTo date must be after validFrom date",
          });
        }
      }

      let imageUrl = null;

      if (req.file) {
        const b64 = req.file.buffer.toString("base64");
        const dataURI = `data:${req.file.mimetype};base64,${b64}`;

        const result = await cloudinary.uploader.upload(dataURI, {
          folder: "products",
          resource_type: "auto",
        });

        imageUrl = result.secure_url;
      }

      const product = new Product({
        name,
        type,
        category,
        description,
        originalPrice: Number(originalPrice),
        discountedPrice: discountedPrice ? Number(discountedPrice) : null,
        boxes: Number(boxes),
        bottlesPerBox: Number(bottlesPerBox),
        image: imageUrl,
        validFrom: validFrom || null,
        validTo: validTo || null,
      });

      await product.save();
      res.status(201).json({ product });
    } catch (error) {
      console.error("Error creating product:", error);
      res
        .status(500)
        .json({ error: error.message || "Error creating product" });
    }
  },

  getCategories: async (req, res) => {
    try {
      const { type } = req.query;
      if (!type) {
        return res.status(400).json({ error: "Type parameter is required" });
      }

      const categories = Product.getCategoriesByType(type);
      res.json({ categories });
    } catch (error) {
      res.status(500).json({ error: "Error fetching categories" });
    }
  },

  getFullStockHistory: async (req, res) => {
    try {
      const { startDate, endDate, productId } = req.query;

      let query = {};

      if (startDate && endDate) {
        query["updateHistory.updatedAt"] = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        };
      }

      if (productId) {
        query.productId = productId;
      }

      const stockHistory = await Stock.find(query)
        .populate("productId", "name description")
        .populate("updatedBy", "name email role")
        .populate("updateHistory.updatedBy", "name email role")
        .sort({ "updateHistory.updatedAt": -1 });

      const formattedHistory = stockHistory.map((stock) => {
        const stockAdditions = stock.updateHistory
          .filter(
            (update) =>
              update.updatedBy?.role === "stock" &&
              update.changeType === "addition" &&
              update.boxes > 0
          )
          .map((update) => ({
            quantity: update.boxes,
            date: update.updatedAt,
            updatedBy: {
              id: update.updatedBy?._id,
              name: update.updatedBy?.name,
              email: update.updatedBy?.email,
            },
          }));

        const totalAddedByStock = stockAdditions.reduce(
          (sum, addition) => sum + (addition.quantity || 0),
          0
        );

        return {
          productId: stock.productId._id,
          productName: stock.productId.name,
          productDescription: stock.productId.description,
          currentQuantity: stock.quantity,
          lastUpdated: stock.lastUpdated,
          lastUpdatedBy: {
            id: stock.updatedBy?._id,
            name: stock.updatedBy?.name,
            email: stock.updatedBy?.email,
            role: stock.updatedBy?.role,
          },
          stockAdditionHistory: stockAdditions,
          totalAddedByStock,
          updateHistory: stock.updateHistory.map((update) => ({
            quantity: update.boxes,
            updatedAt: update.updatedAt,
            updatedBy: {
              id: update.updatedBy?._id,
              name: update.updatedBy?.name,
              email: update.updatedBy?.email,
              role: update.updatedBy?.role,
            },
            changeType: update.changeType,
            notes: update.notes,
          })),
        };
      });

      const summary = {
        totalRecords: stockHistory.length,
        totalUpdates: stockHistory.reduce(
          (sum, stock) => sum + stock.updateHistory.length,
          0
        ),
        productsTracked: new Set(
          stockHistory.map((stock) => stock.productId.toString())
        ).size,
        totalAddedByStock: formattedHistory.reduce(
          (sum, item) => sum + item.totalAddedByStock,
          0
        ),
      };

      res.json({
        success: true,
        history: formattedHistory,
        summary,
      });
    } catch (error) {
      console.error("Error fetching full stock history:", error);
      res.status(500).json({
        success: false,
        error: "Error fetching stock history",
        details: error.message,
      });
    }
  },

  downloadFullStockHistory: async (req, res) => {
    try {
      const { startDate, endDate, productId } = req.query;

      let query = {};

      if (startDate && endDate) {
        query["updateHistory.updatedAt"] = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        };
      }

      if (productId) {
        query.productId = productId;
      }

      const stockHistory = await Stock.find(query)
        .populate("productId", "name description")
        .populate("updatedBy", "name email role")
        .populate("updateHistory.updatedBy", "name email role")
        .sort({ "updateHistory.updatedAt": -1 });

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Stock History");

      // Define column headers
      worksheet.columns = [
        { header: "Product ID", key: "productId", width: 25 },
        { header: "Product Name", key: "productName", width: 20 },
        { header: "Description", key: "productDescription", width: 30 },
        { header: "Current Quantity", key: "currentQuantity", width: 15 },
        { header: "Last Updated", key: "lastUpdated", width: 20 },
        { header: "Last Updated By", key: "lastUpdatedBy", width: 20 },
        { header: "Update Date", key: "updateDate", width: 20 },
        { header: "Update Boxes", key: "updateBoxes", width: 15 },
        { header: "Change Type", key: "changeType", width: 15 },
        { header: "Updated By", key: "updatedBy", width: 20 },
        { header: "Stock Addition", key: "stockAddition", width: 15 },
        { header: "Total Added by Stock", key: "totalAddedByStock", width: 20 },
        { header: "Notes", key: "notes", width: 30 },
      ];

      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).alignment = {
        vertical: "middle",
        horizontal: "center",
      };
      worksheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFDDDDDD" },
      };

      stockHistory.forEach((stock) => {
        const totalAddedByStock = stock.updateHistory
          .filter(
            (update) =>
              update.updatedBy?.role === "stock" &&
              update.changeType === "addition" &&
              update.boxes > 0
          )
          .reduce((sum, update) => sum + (update.boxes || 0), 0);

        stock.updateHistory.forEach((update) => {
          const isStockAddition =
            update.updatedBy?.role === "stock" &&
            update.changeType === "addition" &&
            update.boxes > 0;

          worksheet.addRow({
            productId: stock.productId._id.toString(),
            productName: stock.productId.name,
            productDescription: stock.productId.description,
            currentQuantity: stock.quantity,
            lastUpdated: stock.lastUpdated.toLocaleString(),
            lastUpdatedBy: stock.updatedBy?.name || "N/A",
            updateDate: update.updatedAt.toLocaleString(),
            updateBoxes: update.boxes || "",
            changeType: update.changeType,
            updatedBy: update.updatedBy?.name || "N/A",
            stockAddition: isStockAddition ? update.boxes : "",
            totalAddedByStock: totalAddedByStock || 0,
            notes: update.notes || "N/A",
          });
        });
      });

      const totalStockAddedAcrossAll = stockHistory.reduce((sum, stock) => {
        const stockTotal = stock.updateHistory
          .filter(
            (update) =>
              update.updatedBy?.role === "stock" &&
              update.changeType === "addition" &&
              update.boxes > 0
          )
          .reduce((subSum, update) => subSum + (update.boxes || 0), 0);
        return sum + stockTotal;
      }, 0);

      worksheet.addRow({
        productId: "Summary",
        totalAddedByStock: totalStockAddedAcrossAll,
      });

      const lastRow = worksheet.lastRow;
      lastRow.font = { bold: true };
      lastRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFFDDDD" },
      };

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="Full_Stock_History.xlsx"'
      );

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error("Error generating stock history Excel:", error);
      res
        .status(500)
        .json({ error: "Error generating stock history Excel file" });
    }
  },

  getAllProducts: async (req, res) => {
    try {
      const { type, category } = req.query;
      let query = { isActive: true };

      if (type) {
        query.type = type;
        if (category) {
          const validCategories = Product.getCategoriesByType(type);
          if (!validCategories.includes(category)) {
            return res
              .status(400)
              .json({ error: "Invalid category for the selected type" });
          }
          query.category = category;
        }
      }

      const products = await Product.find(query)
        .populate({
          path: "stockRemarks.updatedBy",
          select: "name",
        })
        .sort({ "stockRemarks.updatedAt": -1 });

      const formattedProducts = products.map((product) => {
        const productObj = product.toObject({ virtuals: true });
        const now = new Date();
        const isOfferValid =
          productObj.discountedPrice &&
          productObj.validFrom &&
          productObj.validTo &&
          now >= productObj.validFrom &&
          now <= productObj.validTo;

        if (!isOfferValid) {
          delete productObj.discountedPrice;
          delete productObj.discountPercentage;
          delete productObj.discountTag;
          delete productObj.offerEndsIn;
        } else {
          productObj.discountPercentage = Math.round(
            ((productObj.originalPrice - productObj.discountedPrice) /
              productObj.originalPrice) *
              100
          );
        }

        if (productObj.stockRemarks && productObj.stockRemarks.length > 0) {
          productObj.stockUpdateInfo = {
            lastUpdate: {
              message: productObj.stockRemarks[0].message,
              updatedBy:
                productObj.stockRemarks[0].updatedBy?.name || "Unknown User",
              updatedAt: productObj.stockRemarks[0].updatedAt,
              boxes: productObj.stockRemarks[0].boxes,
              changeType: productObj.stockRemarks[0].changeType,
            },
            totalUpdates: productObj.stockRemarks.length,
          };
        }

        return productObj;
      });

      res.json({ products: formattedProducts });
    } catch (error) {
      console.error("Error in admin getAllProducts:", error);
      res.status(500).json({ error: "Error fetching products" });
    }
  },

  deleteProduct: async (req, res) => {
    try {
      const product = await Product.findByIdAndDelete(req.params.productId);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json({ message: "Product deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: "Error deleting product" });
    }
  },

  updateProduct: async (req, res) => {
    try {
      const updates = {
        ...req.body,
        originalPrice: req.body.originalPrice
          ? Number(req.body.originalPrice)
          : undefined,
        discountedPrice: req.body.discountedPrice
          ? Number(req.body.discountedPrice)
          : null,
        boxes: req.body.boxes ? Number(req.body.boxes) : undefined,
        bottlesPerBox: req.body.bottlesPerBox
          ? Number(req.body.bottlesPerBox)
          : undefined,
        validFrom: req.body.validFrom || null,
        validTo: req.body.validTo || null,
      };

      if (updates.boxes && updates.boxes < 230) {
        return res.status(400).json({
          error: "Minimum 230 boxes are required",
        });
      }

      if (updates.bottlesPerBox && updates.bottlesPerBox < 1) {
        return res.status(400).json({
          error: "bottlesPerBox must be at least 1",
        });
      }

      const oldProduct = await Product.findById(req.params.productId);
      if (!oldProduct) {
        return res.status(404).json({ error: "Product not found" });
      }

      const priceChanged =
        (updates.originalPrice !== undefined &&
          updates.originalPrice !== oldProduct.originalPrice) ||
        (updates.discountedPrice !== undefined &&
          updates.discountedPrice !== oldProduct.discountedPrice);

      if (priceChanged) {
        const pendingOrders = await Order.find({
          orderStatus: "pending",
          "products.product": req.params.productId,
        });

        for (const order of pendingOrders) {
          for (const item of order.products) {
            if (item.product.toString() === req.params.productId) {
              if (!item.originalPrice) {
                item.originalPrice = item.price;
              }

              const now = new Date();
              const isOfferValid =
                updates.discountedPrice &&
                updates.validFrom &&
                updates.validTo &&
                now >= new Date(updates.validFrom) &&
                now <= new Date(updates.validTo);

              const newPrice = isOfferValid
                ? updates.discountedPrice
                : updates.originalPrice;

              if (item.price !== newPrice) {
                order.priceUpdateHistory.push({
                  product: item.product,
                  oldPrice: item.price,
                  newPrice: newPrice,
                  updatedBy: req.user._id,
                  updatedAt: new Date(),
                });

                item.price = newPrice;
                order.priceUpdated = true;
              }
            }
          }

          order.totalAmount = order.products.reduce(
            (sum, item) => sum + item.price * item.boxes,
            0
          );
          order.totalAmountWithDelivery =
            order.totalAmount + (order.deliveryCharge || 0);
          await order.save();

          const payment = await Payment.findOne({ orderDetails: order._id });
          if (payment) {
            payment.amount = order.totalAmountWithDelivery;
            payment.remainingAmount = payment.amount - payment.paidAmount;
            await payment.save();
          }
        }
      }

      if (req.file) {
        const b64 = Buffer.from(req.file.buffer).toString("base64");
        const dataURI = `data:${req.file.mimetype};base64,${b64}`;

        const result = await cloudinary.uploader.upload(dataURI, {
          folder: "products",
          resource_type: "auto",
        });

        updates.image = result.secure_url;

        if (oldProduct.image) {
          const publicId = oldProduct.image.split("/").pop().split(".")[0];
          await cloudinary.uploader.destroy(`products/${publicId}`);
        }
      }

      const product = await Product.findByIdAndUpdate(
        req.params.productId,
        updates,
        { new: true }
      );

      if (!product) return res.status(404).json({ error: "Product not found" });

      res.json({ product });
    } catch (error) {
      console.error("Error updating product:", error);
      res.status(500).json({ error: "Error updating product" });
    }
  },

  // getPreviewOrders: async (req, res) => {
  //   try {
  //     const orders = await Order.find({
  //       orderStatus: "preview",
  //     })
  //       .populate(
  //         "user",
  //         "name phoneNumber customerDetails.firmName customerDetails.userCode"
  //       )
  //       .populate("products.product")
  //       .populate("statusHistory.updatedBy", "name role")
  //       .sort({ createdAt: -1 });

  //     res.json({ orders });
  //   } catch (error) {
  //     res.status(500).json({ error: "Error fetching preview orders" });
  //   }
  // },


  getPreviewOrders: async (req, res) => {
  try {
    const orders = await Order.find({ orderStatus: "preview" })
      .populate(
        "user",
        "name email phoneNumber customerDetails.firmName customerDetails.userCode"
      )
      .populate("products.product", "name type originalPrice discountedPrice validFrom validTo")
      .populate("statusHistory.updatedBy", "name role")
      .sort({ createdAt: -1 });

    // Format orders to include price update information
    const formattedOrders = await Promise.all(
      orders.map(async (order) => {
        let priceChanged = false;
        const priceUpdateDetails = [];

        // Check each product for price updates
        const updatedProducts = await Promise.all(
          order.products.map(async (item) => {
            const product = item.product; // Populated product
            const now = new Date();
            const isOfferValid =
              product.discountedPrice != null &&
              product.validFrom &&
              product.validTo &&
              now >= new Date(product.validFrom) &&
              now <= new Date(product.validTo);
            const currentPrice = isOfferValid
              ? product.discountedPrice
              : product.originalPrice;

            // Check if the stored price differs from the current price
            if (item.price !== currentPrice) {
              priceChanged = true;
              priceUpdateDetails.push({
                product: item.product._id,
                oldPrice: item.price,
                newPrice: currentPrice,
              });
            }

            return {
              productId: item.product._id,
              name: item.product.name,
              type: item.product.type,
              boxes: item.boxes,
              price: item.price, // Stored price
              currentPrice, // Current price from Product model
              isOfferValid,
            };
          })
        );

        // Recalculate total amount if prices have changed
        const totalAmount = updatedProducts.reduce(
          (sum, item) => sum + item.currentPrice * item.boxes,
          0
        );
        const totalAmountWithDelivery = totalAmount + (order.deliveryCharge || 0);

        return {
          _id: order._id,
          orderId: order.orderId,
          user: order.user
            ? {
                name: order.user.name,
                email: order.user.email,
                phoneNumber: order.user.phoneNumber,
                firmName: order.user.customerDetails?.firmName,
                userCode: order.user.customerDetails?.userCode,
              }
            : null,
          products: updatedProducts,
          totalAmount: order.totalAmount, // Stored total
          currentTotalAmount: totalAmount, // Recalculated total based on current prices
          totalAmountWithDelivery: order.totalAmountWithDelivery,
          currentTotalAmountWithDelivery: totalAmountWithDelivery,
          priceUpdated: order.priceUpdated || priceChanged,
          priceUpdateDetails: priceChanged ? priceUpdateDetails : undefined,
          orderStatus: order.orderStatus,
          paymentStatus: order.paymentStatus,
          paymentMethod: order.paymentMethod,
          shippingAddress: order.shippingAddress,
          firmName: order.firmName,
          gstNumber: order.gstNumber,
          createdAt: order.createdAt,
          statusHistory: order.statusHistory.map((history) => ({
            status: history.status,
            updatedBy: history.updatedBy
              ? { name: history.updatedBy.name, role: history.updatedBy.role }
              : null,
            updatedAt: history.updatedAt,
          })),
        };
      })
    );

    res.json({
      orders: formattedOrders,
      totalOrders: formattedOrders.length,
      summary: {
        totalPriceUpdatedOrders: formattedOrders.filter((order) => order.priceUpdated).length,
      },
    });
  } catch (error) {
    console.error("Error fetching preview orders:", error);
    res.status(500).json({ error: "Error fetching preview orders", details: error.message });
  }
},
  
  processPreviewOrder: async (req, res) => {
    try {
      const { orderId } = req.params;
      console.log("Processing orderId:", orderId);

      const order = await Order.findById(orderId).populate("products.product");
      if (!order) {
        return res.status(400).json({ error: "Order not found" });
      }
      if (order.orderStatus !== "preview") {
        return res.status(400).json({ error: "Invalid preview order status" });
      }

      if (!req.user || !req.user._id) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Check for price updates
      let totalAmount = 0;
      let priceChanged = false;
      const priceUpdateHistory = [];

      for (const item of order.products) {
        const product = await Product.findById(item.product._id);
        if (!product || !product.isActive) {
          return res
            .status(400)
            .json({
              error: `Product ${item.product.name} is inactive or not found`,
            });
        }

        const now = new Date();
        const isOfferValid =
          product.discountedPrice != null &&
          product.validFrom &&
          product.validTo &&
          now >= new Date(product.validFrom) &&
          now <= new Date(product.validTo);
        const currentPrice = isOfferValid
          ? product.discountedPrice
          : product.originalPrice;

        if (currentPrice !== item.price) {
          priceChanged = true;
          priceUpdateHistory.push({
            product: item.product._id,
            oldPrice: item.price,
            newPrice: currentPrice,
            updatedBy: req.user._id,
            updatedAt: new Date(),
          });
          item.price = currentPrice;
        }

        totalAmount += currentPrice * item.boxes;
      }

      if (priceChanged) {
        order.priceUpdated = true;
        order.priceUpdateHistory = priceUpdateHistory;
        order.totalAmount = totalAmount;
        order.totalAmountWithDelivery =
          totalAmount + (order.deliveryCharge || 0);

        const payment = await Payment.findOne({ orderDetails: order._id });
        if (payment) {
          payment.amount = order.totalAmountWithDelivery;
          payment.remainingAmount = payment.amount - payment.paidAmount;
          await payment.save();
        }
      }

      order.userActivityStatus = order.userActivityStatus || "active";
      order._updatedBy = req.user._id;
      order.orderStatus = "processing";

      await order.save();
      console.log("Order updated to processing:", order);

      res.json({
        message: "Order moved to processing",
        order,
        priceUpdated: priceChanged,
        priceUpdateDetails: priceChanged ? priceUpdateHistory : undefined,
      });
    } catch (error) {
      console.error("Error processing order:", error);
      res
        .status(500)
        .json({ error: "Error processing order", details: error.message });
    }
  },

  // getAllOrders: async (req, res) => {
  //   try {
  //     const { type } = req.query;
  //     let query = {};

  //     if (type && ["Bottle", "Raw Material", "all"].includes(type)) {
  //       if (type !== "all") {
  //         query.type = type;
  //       }
  //     }

  //     const orders = await Order.find(query)
  //       .select(
  //         "orderId firmName gstNumber shippingAddress paymentStatus paymentMethod orderStatus createdAt type totalAmount products"
  //       )
  //       .populate(
  //         "user",
  //         "name email phoneNumber customerDetails.firmName customerDetails.userCode"
  //       )
  //       .populate("products.product", "name type")
  //       .sort({ createdAt: -1 });

  //     const groupedOrders = {
  //       all: orders,
  //       Bottle: orders.filter((order) => order.type === "Bottle"),
  //       "Raw Material": orders.filter((order) => order.type === "Raw Material"),
  //     };

  //     const responseOrders = type
  //       ? type === "all"
  //         ? orders
  //         : groupedOrders[type]
  //       : orders;

  //     res.json({
  //       orders: responseOrders,
  //       totalOrders: responseOrders.length,
  //       summary: {
  //         totalBottleOrders: groupedOrders["Bottle"].length,
  //         totalRawMaterialOrders: groupedOrders["Raw Material"].length,
  //         totalOrders: orders.length,
  //       },
  //     });
  //   } catch (error) {
  //     console.error("Error in getAllOrders:", error);
  //     res.status(500).json({ error: "Error fetching orders" });
  //   }
  // },


getAllOrders: async (req, res) => {
  try {
    const { type, priceUpdated } = req.query; 
    let query = {};

    
    if (type && ["Bottle", "Raw Material", "all"].includes(type)) {
      if (type !== "all") {
        query.type = type;
      }
    }

    
    if (priceUpdated !== undefined) {
      query.priceUpdated = priceUpdated === "true";
    }

    const orders = await Order.find(query)
      .select(
        "orderId firmName gstNumber shippingAddress paymentStatus paymentMethod orderStatus createdAt type totalAmount totalAmountWithDelivery priceUpdated priceUpdateHistory products"
      ) 
      .populate(
        "user",
        "name email phoneNumber customerDetails.firmName customerDetails.userCode"
      )
      .populate("products.product", "name type originalPrice discountedPrice validFrom validTo") 
      .populate("priceUpdateHistory.updatedBy", "name role") 
      .sort({ createdAt: -1 });

    const groupedOrders = {
      all: orders,
      Bottle: orders.filter((order) => order.type === "Bottle"),
      "Raw Material": orders.filter((order) => order.type === "Raw Material"),
    };

    const responseOrders = type
      ? type === "all"
        ? orders
        : groupedOrders[type]
      : orders;

    
    const formattedOrders = responseOrders.map((order) => ({
      orderId: order.orderId,
      firmName: order.firmName,
      gstNumber: order.gstNumber,
      shippingAddress: order.shippingAddress,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      orderStatus: order.orderStatus,
      createdAt: order.createdAt,
      type: order.type,
      totalAmount: order.totalAmount,
      totalAmountWithDelivery: order.totalAmountWithDelivery,
      priceUpdated: order.priceUpdated,
      priceUpdateHistory: order.priceUpdateHistory.map((history) => ({
        product: history.product,
        oldPrice: history.oldPrice,
        newPrice: history.newPrice,
        updatedBy: history.updatedBy ? {
          id: history.updatedBy._id,
          name: history.updatedBy.name,
          role: history.updatedBy.role,
        } : null,
        updatedAt: history.updatedAt,
      })),
      products: order.products.map((item) => ({
        productId: item.product._id,
        name: item.product.name,
        type: item.product.type,
        quantity: item.boxes, 
        price: item.price, 
        originalPrice: item.product.originalPrice, 
        discountedPrice: item.product.discountedPrice, 
        isOfferValid: item.product.discountedPrice &&
          item.product.validFrom &&
          item.product.validTo &&
          new Date() >= new Date(item.product.validFrom) &&
          new Date() <= new Date(item.product.validTo),
      })),
      user: order.user ? {
        name: order.user.name,
        email: order.user.email,
        phoneNumber: order.user.phoneNumber,
        firmName: order.user.customerDetails?.firmName,
        userCode: order.user.customerDetails?.userCode,
      } : null,
    }));

    res.json({
      orders: formattedOrders,
      totalOrders: formattedOrders.length,
      summary: {
        totalBottleOrders: groupedOrders["Bottle"].length,
        totalRawMaterialOrders: groupedOrders["Raw Material"].length,
        totalOrders: orders.length,
        totalPriceUpdatedOrders: orders.filter((order) => order.priceUpdated).length,
      },
    });
  } catch (error) {
    console.error("Error in getAllOrders:", error);
    res.status(500).json({ error: "Error fetching orders", details: error.message });
  }
},

  updateOrderStatus: async (req, res) => {
    try {
      const { orderStatus, deliveryNote } = req.body;
      const order = await Order.findById(req.params.orderId);

      if (!order) return res.status(404).json({ error: "Order not found" });

      if (
        ![
          "processing",
          "confirmed",
          "shipped",
          "delivered",
          "cancelled",
        ].includes(orderStatus)
      ) {
        return res.status(400).json({ error: "Invalid order status" });
      }

      order.orderStatus = orderStatus;
      if (deliveryNote) {
        order.deliveryNote = {
          ...deliveryNote,
          createdAt: new Date(),
        };
      }

      await order.save();
      res.json({ order });
    } catch (error) {
      console.error("Error updating order status:", error);
      res.status(500).json({ error: "Error updating order status" });
    }
  },

  downloadOrderHistory: async (req, res) => {
    try {
      const orders = await Order.find({})
        .populate(
          "user",
          "name email phoneNumber customerDetails.firmName customerDetails.userCode"
        )
        .populate("products.product", "name type")
        .sort({ createdAt: -1 });

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Order History");

      worksheet.columns = [
        { header: "Order ID", key: "orderId", width: 20 },
        { header: "Customer Name", key: "userName", width: 20 },
        { header: "Firm Name", key: "firmName", width: 25 },
        { header: "User Code", key: "userCode", width: 15 },
        { header: "Email", key: "email", width: 15 },
        { header: "Phone Number", key: "phoneNumber", width: 15 },
        { header: "Type", key: "type", width: 15 },
        { header: "Products", key: "products", width: 40 },
        { header: "Total Amount", key: "totalAmount", width: 15 },
        { header: "Delivery Charge", key: "deliveryCharge", width: 15 },
        {
          header: "Total with Delivery",
          key: "totalAmountWithDelivery",
          width: 20,
        },
        { header: "Payment Method", key: "paymentMethod", width: 15 },
        { header: "Payment Status", key: "paymentStatus", width: 15 },
        { header: "Order Status", key: "orderStatus", width: 15 },
        { header: "Shipping Address", key: "shippingAddress", width: 30 },
        { header: "GST Number", key: "gstNumber", width: 20 },
        { header: "Created At", key: "createdAt", width: 20 },
        { header: "Updated At", key: "updatedAt", width: 20 },
      ];

      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).alignment = {
        vertical: "middle",
        horizontal: "center",
      };
      worksheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFDDDDDD" },
      };

      orders.forEach((order) => {
        const productsString = order.products
          .map(
            (p) => `${p.product.name} (Qty: ${p.quantity}, Price: ${p.price})`
          )
          .join("; ");

        worksheet.addRow({
          orderId: order.orderId,
          userName: order.user?.name || "N/A",
          firmName:
            order.firmName || order.user?.customerDetails?.firmName || "N/A",
          userCode: order.user?.customerDetails?.userCode || "N/A",
          phoneNumber: order.user?.phoneNumber || "N/A",
          email: order.user?.email || "N/A",
          type: order.type,
          products: productsString,
          totalAmount: order.totalAmount,
          deliveryCharge: order.deliveryCharge,
          totalAmountWithDelivery: order.totalAmountWithDelivery,
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          orderStatus: order.orderStatus,
          shippingAddress: order.shippingAddress,
          gstNumber: order.gstNumber || "N/A",
          createdAt: order.createdAt.toLocaleString(),
          updatedAt: order.updatedAt.toLocaleString(),
        });
      });

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="Order_History.xlsx"'
      );

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error("Error generating order history Excel:", error);
      res
        .status(500)
        .json({ error: "Error generating order history Excel file" });
    }
  },

  getDashboardStats: async (req, res) => {
    try {
      const users = {
        total: await User.countDocuments({ role: "user" }),
        active: await User.countDocuments({ role: "user", isActive: true }),
        inactive: await User.countDocuments({ role: "user", isActive: false }),
      };

      const products = {
        total: await Product.countDocuments(),
        bottles: await Product.countDocuments({ type: "Bottle" }),
        rawMaterials: await Product.countDocuments({ type: "Raw Material" }),
      };

      const orders = {
        pending: await Order.countDocuments({ orderStatus: "pending" }),
        preview: await Order.countDocuments({ orderStatus: "preview" }),
        processing: await Order.countDocuments({ orderStatus: "processing" }),
        confirmed: await Order.countDocuments({ orderStatus: "confirmed" }),
        shipped: await Order.countDocuments({ orderStatus: "shipped" }),
        // delivered: await Order.countDocuments({ orderStatus: 'delivered' }),
        cancelled: await Order.countDocuments({ orderStatus: "cancelled" }),
      };

      const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
      const ordersRequiringAttention = await Order.countDocuments({
        orderStatus: "pending",
        createdAt: { $lte: sixHoursAgo },
      });

      const recentOrderActivity = await Order.find({})
        .sort({ updatedAt: -1 })
        .limit(5)
        .select("orderId orderStatus statusHistory")
        .populate("statusHistory.updatedBy", "name role");

      const stats = {
        users,
        products,
        orders,
      };

      res.json({ stats });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ error: "Error fetching dashboard stats" });
    }
  },

  checkUserStatus: async (req, res, next) => {
    try {
      const user = await User.findById(req.user._id);

      if (!user || !user.isActive) {
        return res.status(403).json({
          error:
            "Your account is currently inactive. Please contact admin for support.",
        });
      }

      next();
    } catch (error) {
      res.status(500).json({ error: "Error checking user status" });
    }
  },

  getAllMarketingActivities: async (req, res) => {
    try {
      const activities = await MarketingActivity.find({})
        .populate("marketingUser", "name email customerDetails.firmName")
        .sort({ createdAt: -1 });

      res.json({ activities });
    } catch (error) {
      console.error("Error fetching marketing activities:", error);
      res.status(500).json({ error: "Error fetching marketing activities" });
    }
  },

  reviewMarketingActivity: async (req, res) => {
    try {
      const activity = await MarketingActivity.findById(req.params.activityId);

      if (!activity) {
        return res.status(404).json({ error: "Activity not found" });
      }

      if (!activity.visitType || !activity.customerMobile) {
        return res.status(400).json({
          error:
            "Cannot review activity: missing required fields (visitType or customerMobile)",
        });
      }

      activity.status = "reviewed";
      activity.reviewedAt = new Date();
      activity.reviewedBy = req.user._id;

      await activity.save({ validateModifiedOnly: true });

      res.json({
        message: "Marketing activity reviewed successfully",
        activity,
      });
    } catch (error) {
      console.error("Error reviewing marketing activity:", error);
      if (error.name === "ValidationError") {
        return res.status(400).json({
          error: "Validation failed",
          details: error.errors,
        });
      }
      res.status(500).json({ error: "Error reviewing marketing activity" });
    }
  },

  downloadAllMarketingActivities: async (req, res) => {
    try {
      const activities = await MarketingActivity.find({})
        .populate("marketingUser", "name email customerDetails.firmName")
        .sort({ createdAt: -1 });

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Marketing Activities");

      worksheet.columns = [
        { header: "Activity ID", key: "_id", width: 25 },
        { header: "Marketing User", key: "marketingUserName", width: 20 },
        { header: "User Email", key: "marketingUserEmail", width: 25 },
        { header: "Firm Name", key: "firmName", width: 25 },
        { header: "Customer Name", key: "customerName", width: 20 },
        { header: "Customer Mobile", key: "customerMobile", width: 15 },
        { header: "Discussion", key: "discussion", width: 40 },
        { header: "Location", key: "location", width: 20 },
        { header: "Visit Type", key: "visitType", width: 15 },
        { header: "Inquiry Type", key: "inquiryType", width: 15 },
        { header: "Remarks", key: "remarks", width: 30 },
        { header: "Images", key: "images", width: 40 },
        { header: "Status", key: "status", width: 15 },
        { header: "Reviewed At", key: "reviewedAt", width: 20 },
        { header: "Reviewed By", key: "reviewedBy", width: 25 },
        { header: "Created At", key: "createdAt", width: 20 },
      ];

      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).alignment = {
        vertical: "middle",
        horizontal: "center",
      };
      worksheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFDDDDDD" }, // Light gray background
      };

      activities.forEach((activity) => {
        worksheet.addRow({
          _id: activity._id.toString(),
          marketingUserName: activity.marketingUser?.name || "N/A",
          marketingUserEmail: activity.marketingUser?.email || "N/A",
          firmName: activity.marketingUser?.customerDetails?.firmName || "N/A",
          customerName: activity.customerName || "N/A",
          customerMobile: activity.customerMobile || "N/A",
          discussion: activity.discussion || "N/A",
          location: activity.location || "N/A",
          visitType: activity.visitType || "N/A",
          inquiryType: activity.inquiryType || "N/A",
          remarks: activity.remarks || "N/A",
          images:
            activity.images?.length > 0 ? activity.images.join("; ") : "None",
          status: activity.status || "pending",
          reviewedAt: activity.reviewedAt
            ? activity.reviewedAt.toLocaleString()
            : "N/A",
          reviewedBy: activity.reviewedBy
            ? activity.reviewedBy.toString()
            : "N/A",
          createdAt: activity.createdAt.toLocaleString(),
        });
      });

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="Marketing_Activities.xlsx"'
      );

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error("Error generating marketing activities Excel:", error);
      res
        .status(500)
        .json({ error: "Error generating marketing activities Excel file" });
    }
  },

  getAllAttendance: async (req, res) => {
    try {
      const { startDate, endDate, panel } = req.query;

      let query = {};

      if (panel) {
        query.panel = panel;
      }

      if (startDate && endDate) {
        query.selectedDate = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        };
      }

      const attendance = await Attendance.find(query)
        .populate({
          path: "user",
          select: "name email customerDetails.firmName panel",
        })
        .sort({ selectedDate: -1 });

      const summary = {
        totalRecords: attendance.length,
        totalPresent: attendance.filter(
          (a) => a.status === "present" || a.status === "checked-in"
        ).length,
        totalAbsent: attendance.filter((a) => a.status === "absent").length,
        totalHours: attendance.reduce(
          (sum, record) => sum + (record.totalHours || 0),
          0
        ),
        byPanel: attendance.reduce((acc, record) => {
          acc[record.panel] = (acc[record.panel] || 0) + 1;
          return acc;
        }, {}),
      };

      res.json({
        attendance,
        summary,
      });
    } catch (error) {
      console.error("Error fetching attendance:", error);
      res
        .status(500)
        .json({ error: "Error fetching attendance", details: error.message });
    }
  },

  getAttendanceSummary: async (req, res) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const summary = {
        todayCheckIns: await Attendance.countDocuments({
          date: { $gte: today },
          status: "checked-in",
        }),
        todayCheckOuts: await Attendance.countDocuments({
          date: { $gte: today },
          status: "checked-out",
        }),
        activeUsers: await Attendance.distinct("user", {
          date: { $gte: today },
          status: "checked-in",
        }),
        panelBreakdown: await Attendance.aggregate([
          {
            $match: {
              date: { $gte: today },
            },
          },
          {
            $group: {
              _id: "$panel",
              count: { $sum: 1 },
            },
          },
        ]),

        todayCheckInImages: await Attendance.find({
          date: { $gte: today },
          checkInImage: { $ne: null },
        })
          .select("user checkInImage date panel")
          .populate("user", "name"),
      };

      res.json({ summary });
    } catch (error) {
      console.error("Error fetching attendance summary:", error);
      res
        .status(500)
        .json({
          error: "Error fetching attendance summary",
          details: error.message,
        });
    }
  },

  getCheckInImages: async (req, res) => {
    try {
      const { startDate, endDate, panel, userId } = req.query;

      let query = {
        checkInImage: { $ne: null },
      };

      if (startDate && endDate) {
        query.date = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        };
      }

      if (panel) {
        query.panel = panel;
      }

      if (userId) {
        query.user = userId;
      }

      const checkInImages = await Attendance.find(query)
        .select("user checkInImage date panel")
        .populate("user", "name email");

      res.json({
        checkInImages,
        total: checkInImages.length,
      });
    } catch (error) {
      console.error("Error fetching check-in images:", error);
      res
        .status(500)
        .json({
          error: "Error fetching check-in images",
          details: error.message,
        });
    }
  },

  getAdminProfile: async (req, res) => {
    try {
      const admin = await User.findById(req.user._id)
        .select("-password -__v")
        .lean();

      if (!admin) {
        return res.status(404).json({ error: "Admin profile not found" });
      }

      if (admin.role !== "admin") {
        return res
          .status(403)
          .json({ error: "Access denied. Not an admin user." });
      }

      res.json({
        profile: {
          _id: admin._id,
          name: admin.name,
          email: admin.email,
          phoneNumber: admin.phoneNumber,
          role: admin.role,
          createdAt: admin.createdAt,
        },
      });
    } catch (error) {
      console.error("Error fetching admin profile:", error);
      res.status(500).json({ error: "Error fetching admin profile" });
    }
  },

  uploadBanner: async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Banner image is required" });
      }

      const bannerCount = await Banner.countDocuments({ isActive: true });
      if (bannerCount >= 3) {
        return res
          .status(400)
          .json({
            error:
              "Maximum 3 banners allowed. Delete or update existing banners.",
          });
      }

      const b64 = req.file.buffer.toString("base64");
      const dataURI = `data:${req.file.mimetype};base64,${b64}`;
      const result = await cloudinary.uploader.upload(dataURI, {
        folder: "banners",
        resource_type: "image",
      });

      const existingOrders = await Banner.find({ isActive: true }).select(
        "order"
      );
      const usedOrders = existingOrders.map((b) => b.order);
      const availableOrder = [1, 2, 3].find((o) => !usedOrders.includes(o));

      const banner = new Banner({
        image: result.secure_url,
        order: availableOrder,
      });

      await banner.save();
      res.status(201).json({
        message: "Banner uploaded successfully",
        banner,
      });
    } catch (error) {
      console.error("Error uploading banner:", error);
      res.status(500).json({ error: "Error uploading banner" });
    }
  },

  updateBanner: async (req, res) => {
    try {
      const { bannerId } = req.params;

      const banner = await Banner.findById(bannerId);
      if (!banner) {
        return res.status(404).json({ error: "Banner not found" });
      }

      const updates = {};
      if (req.body.order) {
        const newOrder = Number(req.body.order);
        if (![1, 2, 3].includes(newOrder)) {
          return res.status(400).json({ error: "Order must be 1, 2, or 3" });
        }

        const conflictingBanner = await Banner.findOne({
          order: newOrder,
          _id: { $ne: bannerId },
          isActive: true,
        });
        if (conflictingBanner) {
          return res
            .status(400)
            .json({
              error: `Order ${newOrder} is already assigned to another banner`,
            });
        }
        updates.order = newOrder;
      }

      if (req.file) {
        const b64 = req.file.buffer.toString("base64");
        const dataURI = `data:${req.file.mimetype};base64,${b64}`;
        const result = await cloudinary.uploader.upload(dataURI, {
          folder: "banners",
          resource_type: "image",
        });
        updates.image = result.secure_url;

        if (banner.image) {
          const publicId = banner.image.split("/").pop().split(".")[0];
          await cloudinary.uploader.destroy(`banners/${publicId}`);
        }
      }

      const updatedBanner = await Banner.findByIdAndUpdate(bannerId, updates, {
        new: true,
      });

      res.json({
        message: "Banner updated successfully",
        banner: updatedBanner,
      });
    } catch (error) {
      console.error("Error updating banner:", error);
      res.status(500).json({ error: "Error updating banner" });
    }
  },

  deleteBanner: async (req, res) => {
    try {
      const { bannerId } = req.params;

      const banner = await Banner.findById(bannerId);
      if (!banner) {
        return res.status(404).json({ error: "Banner not found" });
      }

      if (banner.image) {
        const publicId = banner.image.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(`banners/${publicId}`);
      }

      await Banner.findByIdAndDelete(bannerId);

      res.json({ message: "Banner deleted successfully" });
    } catch (error) {
      console.error("Error deleting banner:", error);
      res.status(500).json({ error: "Error deleting banner" });
    }
  },

  getAllBanners: async (req, res) => {
    try {
      const banners = await Banner.find({ isActive: true }).sort({ order: 1 });
      res.json({ banners });
    } catch (error) {
      console.error("Error fetching banners:", error);
      res.status(500).json({ error: "Error fetching banners" });
    }
  },
};

module.exports = adminController;
