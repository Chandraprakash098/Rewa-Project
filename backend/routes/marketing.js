
const express = require('express');
const router = express.Router();
const { auth, checkRole } = require('../middleware/auth');
const marketingController = require('../controllers/marketingController');
const upload = require('../config/multer');

// Apply authentication and marketing role check to all routes
router.use(auth, checkRole('marketing'));

// Marketing activity routes with file upload middleware
router.post('/activities', 
  upload.array('images', 3), // Allow up to 3 images with field name 'images'
  marketingController.addActivity
);
router.get('/activities', marketingController.getMyActivities);
router.get('/activities/:activityId', marketingController.getActivityById);


// router.post('/marketing/check-in', marketingController.checkIn);
// router.post('/marketing/check-out',  marketingController.checkOut);
// router.get('/marketing/daily-activities',  marketingController.getDailyActivities);

module.exports = router;
