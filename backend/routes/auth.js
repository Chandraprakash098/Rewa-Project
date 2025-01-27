const express = require('express');
const router = express.Router();
const { auth, checkRole } = require('../middleware/auth');
const upload = require('../config/multer');
const authController = require('../controllers/authController');
const adminController = require('../controllers/adminController')

// Customer Registration
router.post('/register/customer', upload.single('photo'), authController.registerCustomer);

// Update Profile Photo
router.put('/profile/photo', auth, upload.single('photo'), authController.updateProfilePhoto);

// First admin registration (only for initial setup)
router.post('/register/first-admin', authController.registerFirstAdmin);

// Staff Registration
router.post('/register/staff', auth, checkRole('admin'), authController.registerStaff);
router.get('/staff', auth, checkRole('admin'), adminController.getAllStaff);

// Login
router.post('/login', authController.login);

// Get User Profile
router.get('/profile', auth, authController.getProfile);

module.exports = router;
