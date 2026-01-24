const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware to authenticate requests
const authenticateUser = (req, res, next) => {
  const token = req.cookies.auth_token;
  
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { userId, email }
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Optional authentication - sets req.user if token exists, but doesn't require it
const optionalAuth = (req, res, next) => {
  const token = req.cookies.auth_token;
  
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded; // { userId, email }
    } catch (error) {
      // Invalid token, but we don't fail - just continue without user
      req.user = null;
    }
  }
  
  next();
};

module.exports = { authenticateUser, optionalAuth };
