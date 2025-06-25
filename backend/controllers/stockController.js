// const Stock = require('../models/Stock');
// const Product = require('../models/Product');
// const Attendance = require('../models/Attendance')
// const cloudinary = require('../config/cloudinary');
// const streamifier = require('streamifier');

// class StockController {
//     // Get all products with their quantities
//     async getAllProducts(req, res) {
//         try {
//             const products = await Product.find({ isActive: true })
//                 .select('name description price quantity image');
            
//             res.status(200).json({
//                 success: true,
//                 data: products
//             });
//         } catch (error) {
//             res.status(500).json({
//                 success: false,
//                 message: 'Error fetching products',
//                 error: error.message
//             });
//         }
//     }

    

//     async updateQuantity(req, res) {
//         try {
//             const { productId, quantity, changeType, notes } = req.body;
//             const userId = req.user.id;
    
//             const product = await Product.findById(productId);
            
//             if (!product) {
//                 return res.status(404).json({
//                     success: false,
//                     message: 'Product not found'
//                 });
//             }
    
//             // Calculate new quantity based on change type
//             let newQuantity = product.quantity;
//             if (changeType === 'addition') {
//                 newQuantity += parseInt(quantity);
//             } else if (changeType === 'reduction') {
//                 newQuantity -= parseInt(quantity);
//                 if (newQuantity < 0) {
//                     return res.status(400).json({
//                         success: false,
//                         message: 'Insufficient stock quantity'
//                     });
//                 }
//             } else {
//                 newQuantity = parseInt(quantity);
//             }
    
//             // Add remark to product
//             const remark = {
//                 message: `Stock ${changeType}: ${quantity} units. ${notes || ''}`,
//                 updatedBy: userId,
//                 quantity: quantity,
//                 changeType: changeType
//             };
    
//             // Update product
//             await Product.findByIdAndUpdate(productId, {
//                 $set: { quantity: newQuantity },
//                 $push: { 
//                     stockRemarks: {
//                         $each: [remark],
//                         $position: 0  // Add new remarks at the beginning
//                     }
//                 }
//             });
    
//             // Record stock update history (existing code)
//             const stockUpdate = await Stock.findOneAndUpdate(
//                 { productId },
//                 {
//                     $set: { quantity: newQuantity, updatedBy: userId },
//                     $push: {
//                         updateHistory: {
//                             quantity: newQuantity,
//                             updatedAt: new Date(),
//                             updatedBy: userId,
//                             changeType,
//                             notes
//                         }
//                     }
//                 },
//                 { upsert: true, new: true }
//             );
    
//             res.status(200).json({
//                 success: true,
//                 data: {
//                     product,
//                     stockUpdate
//                 },
//                 message: 'Stock quantity updated successfully'
//             });
//         } catch (error) {
//             res.status(500).json({
//                 success: false,
//                 message: 'Error updating stock quantity',
//                 error: error.message
//             });
//         }
//     }
    

//     // Get stock update history for a product
//     async getStockHistory(req, res) {
//         try {
//             const { productId } = req.params;
//             const stockHistory = await Stock.findOne({ productId })
//                 .populate('updateHistory.updatedBy', 'name')
//                 .populate('productId', 'name');

//             if (!stockHistory) {
//                 return res.status(404).json({
//                     success: false,
//                     message: 'No stock history found for this product'
//                 });
//             }

//             res.status(200).json({
//                 success: true,
//                 data: stockHistory
//             });
//         } catch (error) {
//             res.status(500).json({
//                 success: false,
//                 message: 'Error fetching stock history',
//                 error: error.message
//             });
//         }
//     }


//     async getallStockHistory(req, res) {
//       try {
//           const stockHistory = await Stock.find()
//               .populate('updateHistory.updatedBy', 'name')
//               .populate('productId', 'name');
  
//           if (!stockHistory || stockHistory.length === 0) {
//               return res.status(404).json({
//                   success: false,
//                   message: 'No stock history found'
//               });
//           }
  
//           res.status(200).json({
//               success: true,
//               data: stockHistory
//           });
//       } catch (error) {
//           res.status(500).json({
//               success: false,
//               message: 'Error fetching stock history',
//               error: error.message
//           });
//       }
//   }
  




// // async checkIn(req, res){
// //     try {
// //       const { selectedDate } = req.body;

// //       if (!req.file) {
// //         return res.status(400).json({
// //           error: 'Please upload a check-in image'
// //         });
// //       }

// //       if (!selectedDate) {
// //         return res.status(400).json({
// //           error: 'Please select a date for check-in'
// //         });
// //       }

// //       // Convert selectedDate to start of day
// //       const checkInDate = new Date(selectedDate);
// //       checkInDate.setHours(0, 0, 0, 0);

// //       // Check if already checked in for selected date
// //       const existingAttendance = await Attendance.findOne({
// //         user: req.user._id,
// //         panel: 'stock',
// //         selectedDate: checkInDate,
// //         $or: [{ status: 'checked-in' }, { status: 'present' }]
// //       });

// //       if (existingAttendance) {
// //         return res.status(400).json({
// //           error: 'Already checked in for this date'
// //         });
// //       }

// //       // Upload image to Cloudinary
// //       const cloudinaryResponse = await cloudinary.uploader.upload(req.file.path, {
// //         folder: 'check-in-photos',
// //         resource_type: 'image'
// //       });

// //       // Create new attendance record
// //       const attendance = new Attendance({
// //         user: req.user._id,
// //         panel: 'stock',
// //         checkInTime: new Date(),
// //         selectedDate: checkInDate,
// //         status: 'present',
// //         checkInImage: cloudinaryResponse.secure_url
// //       });

// //       await attendance.save();

// //       res.json({
// //         message: 'Check-in successful',
// //         attendance
// //       });
// //     } catch (error) {
// //       console.error('Check-in error:', error);
// //       res.status(500).json({
// //         error: 'Error during check-in',
// //         details: error.message
// //       });
// //     }
// //   }


// async checkIn(req, res) {
//   try {
//       const { selectedDate } = req.body;

//       if (!req.file) {
//           return res.status(400).json({ error: 'Please upload a check-in image' });
//       }

//       if (!selectedDate) {
//           return res.status(400).json({ error: 'Please select a date for check-in' });
//       }

//       // Convert selectedDate to start of day
//       const checkInDate = new Date(selectedDate);
//       checkInDate.setHours(0, 0, 0, 0);

//       // Check if already checked in for selected date
//       const existingAttendance = await Attendance.findOne({
//           user: req.user._id,
//           panel: 'stock',
//           selectedDate: checkInDate,
//           $or: [{ status: 'checked-in' }, { status: 'present' }]
//       });

//       if (existingAttendance) {
//           return res.status(400).json({ error: 'Already checked in for this date' });
//       }

//       // Upload buffer to Cloudinary using stream
//       const uploadPromise = new Promise((resolve, reject) => {
//           const uploadStream = cloudinary.uploader.upload_stream(
//               {
//                   folder: 'check-in-photos',
//                   resource_type: 'image'
//               },
//               (error, result) => {
//                   if (error) reject(error);
//                   else resolve(result);
//               }
//           );
          
//           streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
//       });

//       const cloudinaryResponse = await uploadPromise;

//       // Create new attendance record
//       const attendance = new Attendance({
//           user: req.user._id,
//           panel: 'dispatch',
//           checkInTime: new Date(),
//           selectedDate: checkInDate,
//           status: 'present',
//           checkInImage: cloudinaryResponse.secure_url
//       });

//       await attendance.save();

//       res.json({ message: 'Check-in successful', attendance });
//   } catch (error) {
//       console.error('Check-in error:', error);
//       res.status(500).json({ error: 'Error during check-in', details: error.message });
//   }
// };

//   async checkOut(req, res){
//     try {
//       const { selectedDate } = req.body;

//       if (!selectedDate) {
//         return res.status(400).json({
//           error: 'Please select a date for check-out'
//         });
//       }

//       const checkOutDate = new Date(selectedDate);
//       checkOutDate.setHours(0, 0, 0, 0);

//       const attendance = await Attendance.findOne({
//         user: req.user._id,
//         panel: 'stock',
//         selectedDate: checkOutDate,
//         status: 'present'
//       });

//       if (!attendance) {
//         return res.status(400).json({
//           error: 'No active check-in found for selected date'
//         });
//       }

//       attendance.checkOutTime = new Date();
//       attendance.status = 'checked-out';
//       await attendance.save();

//       res.json({
//         message: 'Check-out successful',
//         attendance
//       });
//     } catch (error) {
//       res.status(500).json({
//         error: 'Error during check-out',
//         details: error.message
//       });
//     }
//   }


// // Get stock update history for the day
// async getDailyStockUpdates(req, res) {
//     try {
//         const today = new Date();
//         today.setHours(0, 0, 0, 0);

//         const stockUpdates = await Stock.find({
//             'updateHistory.updatedAt': { $gte: today },
//             'updateHistory.updatedBy': req.user._id
//         }).populate('productId', 'name');

//         res.json({ 
//             dailyStockUpdates: stockUpdates 
//         });
//     } catch (error) {
//         res.status(500).json({ 
//             error: 'Error fetching daily stock updates', 
//             details: error.message 
//         });
//     }
// }
// }

// module.exports = new StockController();



const Stock = require('../models/Stock');
const Product = require('../models/Product');
const Attendance = require('../models/Attendance');
const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');

class StockController {
    // Get all products with their boxes
    async getAllProducts(req, res) {
        try {
            const products = await Product.find({ isActive: true })
                .select('name description price boxes image');
            
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

    // async updateQuantity(req, res) {
    //     try {
    //         const { productId, boxes, changeType, notes } = req.body;
    //         const userId = req.user.id;
    
    //         const product = await Product.findById(productId);
            
    //         if (!product) {
    //             return res.status(404).json({
    //                 success: false,
    //                 message: 'Product not found'
    //             });
    //         }
    
    //         // Calculate new boxes based on change type
    //         let newBoxes = product.boxes;
    //         if (changeType === 'addition') {
    //             newBoxes += parseInt(boxes);
    //         } else if (changeType === 'reduction') {
    //             newBoxes -= parseInt(boxes);
    //             if (newBoxes < 0) {
    //                 return res.status(400).json({
    //                     success: false,
    //                     message: 'Insufficient stock boxes'
    //                 });
    //             }
    //         } else {
    //             newBoxes = parseInt(boxes);
    //         }
    
    //         // Add remark to product
    //         const remark = {
    //             message: `Stock ${changeType}: ${boxes} boxes. ${notes || ''}`,
    //             updatedBy: userId,
    //             boxes: boxes,
    //             changeType: changeType
    //         };
    
    //         // Update product
    //         await Product.findByIdAndUpdate(productId, {
    //             $set: { boxes: newBoxes },
    //             $push: { 
    //                 stockRemarks: {
    //                     $each: [remark],
    //                     $position: 0  // Add new remarks at the beginning
    //                 }
    //             }
    //         });
    
    //         // Record stock update history
    //         const stockUpdate = await Stock.findOneAndUpdate(
    //             { productId },
    //             {
    //                 $set: { boxes: newBoxes, updatedBy: userId },
    //                 $push: {
    //                     updateHistory: {
    //                         boxes: newBoxes,
    //                         updatedAt: new Date(),
    //                         updatedBy: userId,
    //                         changeType,
    //                         notes
    //                     }
    //                 }
    //             },
    //             { upsert: true, new: true }
    //         );
    
    //         res.status(200).json({
    //             success: true,
    //             data: {
    //                 product,
    //                 stockUpdate
    //             },
    //             message: 'Stock boxes updated successfully'
    //         });
    //     } catch (error) {
    //         res.status(500).json({
    //             success: false,
    //             message: 'Error updating stock boxes',
    //             error: error.message
    //         });
    //     }
    // }


   async updateQuantity(req, res) {
    try {
      const { productId, boxes, changeType, notes } = req.body;
      const userId = req.user.id;

      // Validate input
      if (!productId || !boxes || !changeType) {
        return res.status(400).json({
          success: false,
          message: 'productId, boxes, and changeType are required'
        });
      }

      const changeBoxes = parseInt(boxes);
      if (isNaN(changeBoxes) || changeBoxes <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Boxes must be a positive number'
        });
      }

      const product = await Product.findById(productId);
      
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      // Ensure product.boxes is not negative
      if (product.boxes < 0) {
        product.boxes = 0;
        await product.save();
      }

      // Calculate new boxes based on change type
      let newBoxes = product.boxes;
      if (changeType === 'addition') {
        newBoxes += changeBoxes;
      } else if (changeType === 'reduction') {
        newBoxes -= changeBoxes;
        if (newBoxes < 0) {
          return res.status(400).json({
            success: false,
            message: 'Insufficient stock boxes'
          });
        }
      } else if (changeType === 'adjustment') {
        newBoxes = changeBoxes;
      } else {
        return res.status(400).json({
          success: false,
          message: 'Invalid changeType'
        });
      }

      // Add remark to product
      const remark = {
        message: `Stock ${changeType}: ${changeBoxes} boxes. ${notes || ''}`,
        updatedBy: userId,
        boxes: changeBoxes,
        changeType: changeType
      };

      // Update product
      await Product.findByIdAndUpdate(productId, {
        $set: { boxes: newBoxes },
        $push: { 
          stockRemarks: {
            $each: [remark],
            $position: 0
          }
        }
      });

      // Record stock update history
      let stockUpdate = await Stock.findOne({ productId });
      if (!stockUpdate) {
        stockUpdate = new Stock({
          productId,
          quantity: newBoxes,
          updatedBy: userId,
          updateHistory: []
        });
      }

      // Update stock using the model method
      stockUpdate.updateQuantity(newBoxes, userId, changeType, notes, changeBoxes);
      await stockUpdate.save();

      res.status(200).json({
        success: true,
        data: {
          product: await Product.findById(productId), // Refresh product data
          stockUpdate
        },
        message: 'Stock boxes updated successfully'
      });
    } catch (error) {
      console.error('Error updating stock boxes:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating stock boxes',
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

    async getallStockHistory(req, res) {
        try {
            const stockHistory = await Stock.find()
                .populate('updateHistory.updatedBy', 'name')
                .populate('productId', 'name');
  
            if (!stockHistory || stockHistory.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'No stock history found'
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

    async checkIn(req, res) {
        try {
            const { selectedDate } = req.body;

            if (!req.file) {
                return res.status(400).json({ error: 'Please upload a check-in image' });
            }

            if (!selectedDate) {
                return res.status(400).json({ error: 'Please select a date for check-in' });
            }

            // Convert selectedDate to start of day
            const checkInDate = new Date(selectedDate);
            checkInDate.setHours(0, 0, 0, 0);

            // Check if already checked in for selected date
            const existingAttendance = await Attendance.findOne({
                user: req.user._id,
                panel: 'stock',
                selectedDate: checkInDate,
                $or: [{ status: 'checked-in' }, { status: 'present' }]
            });

            if (existingAttendance) {
                return res.status(400).json({ error: 'Already checked in for this date' });
            }

            // Upload buffer to Cloudinary using stream
            const uploadPromise = new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    {
                        folder: 'check-in-photos',
                        resource_type: 'image'
                    },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result);
                    }
                );
                
                streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
            });

            const cloudinaryResponse = await uploadPromise;

            // Create new attendance record
            const attendance = new Attendance({
                user: req.user._id,
                panel: 'stock', // Corrected to 'stock' instead of 'dispatch'
                checkInTime: new Date(),
                selectedDate: checkInDate,
                status: 'present',
                checkInImage: cloudinaryResponse.secure_url
            });

            await attendance.save();

            res.json({ message: 'Check-in successful', attendance });
        } catch (error) {
            console.error('Check-in error:', error);
            res.status(500).json({ error: 'Error during check-in', details: error.message });
        }
    }

    async checkOut(req, res) {
        try {
            const { selectedDate } = req.body;

            if (!selectedDate) {
                return res.status(400).json({
                    error: 'Please select a date for check-out'
                });
            }

            const checkOutDate = new Date(selectedDate);
            checkOutDate.setHours(0, 0, 0, 0);

            const attendance = await Attendance.findOne({
                user: req.user._id,
                panel: 'stock',
                selectedDate: checkOutDate,
                status: 'present'
            });

            if (!attendance) {
                return res.status(400).json({
                    error: 'No active check-in found for selected date'
                });
            }

            attendance.checkOutTime = new Date();
            attendance.status = 'checked-out';
            await attendance.save();

            res.json({
                message: 'Check-out successful',
                attendance
            });
        } catch (error) {
            res.status(500).json({
                error: 'Error during check-out',
                details: error.message
            });
        }
    }

    async getDailyStockUpdates(req, res) {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const stockUpdates = await Stock.find({
                'updateHistory.updatedAt': { $gte: today },
                'updateHistory.updatedBy': req.user._id
            }).populate('productId', 'name');

            res.json({ 
                dailyStockUpdates: stockUpdates 
            });
        } catch (error) {
            res.status(500).json({ 
                error: 'Error fetching daily stock updates', 
                details: error.message 
            });
        }
    }
}

module.exports = new StockController();