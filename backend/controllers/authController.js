const jwt = require('jsonwebtoken');
const User = require('../models/User');
const fs = require('fs').promises;
const path = require('path');
const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');
// const passwordCache = new Map();


const generateUserCode = async () => {
  let userCode;
  let isUnique = false;

  while (!isUnique) {
    userCode = `USER-${Math.floor(100000 + Math.random() * 900000)}`; // Example: USER-123456
    const existingUser = await User.findOne({ 'customerDetails.userCode': userCode });
    if (!existingUser) {
      isUnique = true;
    }
  }

  return userCode;
};


const uploadToCloudinary = (buffer) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'profile-photos',
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};

// Updated registerCustomer function
exports.registerCustomer = async (req, res) => {
  try {
    const {
      name,
      firmName,
      phoneNumber,
      email,
      password,
      gstNumber,
      panNumber,
      address,
    } = req.body;

    // Validation checks
    if (!name || !firmName || !phoneNumber || !email || !password || !address) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: {
          name: !name,
          firmName: !firmName,
          phoneNumber: !phoneNumber,
          email: !email,
          password: !password,
          address: !address,
        },
      });
    }

    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Generate userCode
    const userCode = await generateUserCode();

    // Process photo if uploaded
    let photoUrl = null;
    let photoPublicId = null;
    
    if (req.file) {
      try {
        const result = await uploadToCloudinary(req.file.buffer);
        photoUrl = result.secure_url;
        photoPublicId = result.public_id;
      } catch (err) {
        console.error('Cloudinary upload error:', err);
        return res.status(500).json({ error: 'File upload failed' });
      }
    }

    // Create new user
    user = new User({
      name,
      email,
      password,
      phoneNumber,
      role: 'user',
      customerDetails: {
        firmName,
        gstNumber,
        panNumber,
        address,
        photo: photoUrl,
        photoPublicId,
        userCode,
      },
    });

    await user.save();

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    res.status(201).json({
      token,
      userCode: user.customerDetails.userCode,
      role: user.role,
      photo: photoUrl,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Server error',
      details: error.message,
    });
  }
};






// Updated updateProfilePhoto function
exports.updateProfilePhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No photo uploaded' });
    }

    const user = await User.findById(req.user._id);

    // Delete old photo from Cloudinary if exists
    if (user.customerDetails.photoPublicId) {
      await cloudinary.uploader.destroy(user.customerDetails.photoPublicId);
    }

    // Upload new photo to Cloudinary
    const result = await uploadToCloudinary(req.file.buffer);

    user.customerDetails.photo = result.secure_url;
    user.customerDetails.photoPublicId = result.public_id;
    await user.save();

    res.json({ photo: result.secure_url });
  } catch (error) {
    console.error('Profile photo update error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// First Admin Registration
exports.registerFirstAdmin = async (req, res) => {
  try {
    const { name, email, password, phoneNumber } = req.body;

    // Check if any admin exists
    const adminExists = await User.findOne({ role: 'admin' });
    if (adminExists) {
      return res.status(400).json({ error: 'Admin already exists. Use regular staff registration.' });
    }

    // Validation
    if (!name || !email || !password || !phoneNumber) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ error: 'User already exists' });
    }

    user = new User({
      name,
      email,
      password,
      phoneNumber,
      role: 'admin'
    });

    await user.save();

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: '7d'
    });

    res.status(201).json({
      message: 'Admin registered successfully',
      email: user.email,
      role: user.role,
      token
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Staff Registration
exports.registerStaff = async (req, res) => {
  try {
    const { name, email, password, phoneNumber, role } = req.body;

    const validStaffRoles = ['admin', 'reception', 'stock', 'dispatch', 'marketing','miscellaneous'];
    if (!validStaffRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role specified' });
    }

    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ error: 'User already exists' });
    }

    user = new User({
      name,
      email,
      password,
      phoneNumber,
      role
    });

    await user.save();

    // passwordCache.set(user._id.toString(), password);

    res.status(201).json({
      message: 'Staff member registered successfully',
      email: user.email,
      role: user.role
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};




exports.login = async (req, res) => {
  try {
    const { userCode, password } = req.body;

    console.log('Login request received:', { userCode, password });

    let user;

    // If userCode is provided, search by userCode for users
    if (userCode && userCode.startsWith('USER-')) {
      user = await User.findOne({ 'customerDetails.userCode': userCode });
    } else {
      // Otherwise, search by email for non-user roles or users using email
      user = await User.findOne({ email: userCode });
    }

    if (!user) {
      console.log('User not found');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.isActive) {
      console.log('User is inactive');
      return res.status(401).json({ error: 'User is inactive' });
    }

    // Ensure only customers can use userCode to log in
    if (userCode && userCode.startsWith('USER-') && user.role !== 'user') {
      console.log('Invalid userCode usage for non-user role');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log('Password mismatch');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    console.log('Login successful:', { userId: user._id, role: user.role });

    res.json({
      token,
      role: user.role,
      userCode: user.role === 'user' ? user.customerDetails.userCode : null,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};



// Get User Profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};



