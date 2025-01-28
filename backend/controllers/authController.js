const jwt = require('jsonwebtoken');
const User = require('../models/User');
const fs = require('fs').promises;
const path = require('path');


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



// Customer Registration with photo upload
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
      if (req.file) {
        await fs.unlink(req.file.path);
      }
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
      if (req.file) {
        await fs.unlink(req.file.path);
      }
      return res.status(400).json({ error: 'User already exists' });
    }

    // Generate userCode
    const userCode = await generateUserCode();

    // Process photo if uploaded
    let photoUrl = null;
    if (req.file) {
      photoUrl = `/uploads/profile-photos/${req.file.filename}`;
      try {
        await fs.access(path.join(__dirname, '..', 'uploads/profile-photos', req.file.filename));
      } catch (err) {
        console.error('File access error:', err);
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
        userCode,
      },
    });

    try {
      await user.save();
    } catch (err) {
      console.error('Database save error:', err);
      if (req.file) {
        await fs.unlink(req.file.path).catch(console.error);
      }
      return res.status(500).json({
        error: 'Failed to save user',
        details: err.message,
      });
    }

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
    if (req.file) {
      await fs.unlink(req.file.path).catch(console.error);
    }
    res.status(500).json({
      error: 'Server error',
      details: error.message,
    });
  }
};

// Update profile photo
exports.updateProfilePhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No photo uploaded' });
    }

    const user = await User.findById(req.user._id);

    if (user.customerDetails.photo) {
      const oldPhotoPath = path.join(__dirname, '..', user.customerDetails.photo);
      await fs.unlink(oldPhotoPath).catch(console.error);
    }

    const photoUrl = `/uploads/profile-photos/${req.file.filename}`;
    user.customerDetails.photo = photoUrl;
    await user.save();

    res.json({ photo: photoUrl });
  } catch (error) {
    if (req.file) {
      await fs.unlink(req.file.path).catch(console.error);
    }
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
