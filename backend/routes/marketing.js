const express = require('express');
const router = express.Router();
const { auth, checkRole } = require('../middleware/auth');
const marketingController = require('../controllers/marketingController');

// Apply authentication and marketing role check to all routes
router.use(auth, checkRole('marketing'));

// Marketing activity routes
router.post('/activities', marketingController.addActivity);
router.get('/activities', marketingController.getMyActivities);
router.get('/activities/:activityId', marketingController.getActivityById);

module.exports = router;
