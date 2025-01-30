const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization').replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({ _id: decoded.userId, isActive: true });

    if (!user) {
      throw new Error();
    }

    req.token = token;
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Please authenticate.' });
  }
};


const checkRole = (...roles) => {
    return (req, res, next) => {
      if (!roles.includes(req.user.role)) {
        return res.status(403).json({ error: 'Access denied' });
      }
      next();
    };
  };

  const authWithReception = async (req, res, next) => {
    try {
      const token = req.header('Authorization').replace('Bearer ', '');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Handle reception access tokens
      if (decoded.isReceptionAccess) {
        const [user, reception] = await Promise.all([
          User.findOne({ _id: decoded.userId, isActive: true }),
          User.findOne({ _id: decoded.receptionId, role: 'reception', isActive: true })
        ]);
  
        if (!user || !reception) {
          throw new Error('Invalid access');
        }
  
        req.user = user;
        req.receptionUser = reception;
        req.isReceptionAccess = true;
      } else {
        // Regular authentication
        const user = await User.findOne({ _id: decoded.userId, isActive: true });
        if (!user) {
          throw new Error();
        }
        req.user = user;
      }
  
      req.token = token;
      next();
    } catch (error) {
      res.status(401).json({ error: 'Please authenticate.' });
    }
  };
  
  module.exports = { auth, checkRole,authWithReception};