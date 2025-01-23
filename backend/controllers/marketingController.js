const MarketingActivity = require('../models/MarketingActivity');
const cloudinary = require('../config/cloudinary');
const upload = require('../config/multer');

const marketingController = {
  // Add new marketing activity with image upload
  addActivity: async (req, res) => {
    try {
      const { customerName, discussion, location } = req.body;
      
      // Check if files were uploaded
      const uploadedImages = req.files;
      
      // Validate number of images
      if (uploadedImages && uploadedImages.length > 3) {
        return res.status(400).json({ error: 'Maximum 3 images allowed' });
      }

      // Prepare activity object
      const activity = new MarketingActivity({
        marketingUser: req.user._id,
        customerName,
        discussion,
        location,
        images: []
      });

      // Upload images to Cloudinary if present
      if (uploadedImages && uploadedImages.length > 0) {
        const imageUploadPromises = uploadedImages.map(file => 
          new Promise((resolve, reject) => {
            cloudinary.uploader.upload(file.path, { 
              folder: 'marketing-activities',
              allowed_formats: ['jpg', 'jpeg', 'png']
            }, (error, result) => {
              if (error) reject(error);
              else resolve(result.secure_url);
            });
          })
        );

        // Wait for all image uploads
        activity.images = await Promise.all(imageUploadPromises);
      }

      // Save the activity
      await activity.save();
      
      res.status(201).json({ 
        message: 'Marketing activity logged successfully',
        activity 
      });
    } catch (error) {
      console.error('Error logging marketing activity:', error);
      res.status(500).json({ error: 'Error logging marketing activity' });
    }
  },

  // Existing methods remain the same...
  getMyActivities: async (req, res) => {
    try {
      const activities = await MarketingActivity.find({ 
        marketingUser: req.user._id 
      })
      .sort({ createdAt: -1 });

      res.json({ activities });
    } catch (error) {
      console.error('Error fetching marketing activities:', error);
      res.status(500).json({ error: 'Error fetching marketing activities' });
    }
  },

  // Get activity details
  getActivityById: async (req, res) => {
    try {
      const activity = await MarketingActivity.findById(req.params.activityId)
        .populate('marketingUser', 'name email')
        .populate('reviewedBy', 'name role');

      if (!activity) {
        return res.status(404).json({ error: 'Activity not found' });
      }

      res.json({ activity });
    } catch (error) {
      res.status(500).json({ error: 'Error fetching activity details' });
    }
  }
};



module.exports = marketingController;