const jwt = require('jsonwebtoken');
const crypto = require('crypto'); // Added for token generation
const Admin = require('../models/admin');

module.exports = {
  authenticate: async (req, res, next) => {
    try {
      // Get token from header or cookie
      const token = req.cookies.token || 
                   req.header('Authorization')?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({ 
          success: false,
          code: 'NO_TOKEN',
          message: 'Authentication required' 
        });
      }

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Check if admin exists and is active
      const admin = await Admin.findOne({ 
        _id: decoded._id,
        isActive: true
      }).select('-password');

      if (!admin) {
        return res.status(403).json({ 
          success: false,
          code: 'ACCOUNT_INACTIVE',
          message: 'Admin account not found or inactive' 
        });
      }

      // Check if password was changed after token was issued
      if (admin.passwordChangedAt && decoded.iat * 1000 < admin.passwordChangedAt) {
        return res.status(401).json({
          success: false,
          code: 'PASSWORD_CHANGED',
          message: 'Password was changed. Please log in again'
        });
      }

      // Token renewal if expiring soon (within 15 minutes)
      if (decoded.exp - Date.now() / 1000 < 900) {
        const newToken = admin.generateAuthToken();
        
        res.cookie('token', newToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: parseInt(process.env.JWT_EXPIRE) * 1000 || 3600000
        });

        req.token = newToken;
      }

      // Attach user and token to request
      req.user = admin;
      req.token = token;
      next();

    } catch (err) {
      console.error('Authentication error:', err);

      const response = {
        success: false,
        message: 'Authentication failed'
      };

      if (err.name === 'TokenExpiredError') {
        res.status(401).json({
          ...response,
          code: 'TOKEN_EXPIRED',
          message: 'Session expired. Please log in again'
        });
      } else if (err.name === 'JsonWebTokenError') {
        res.status(401).json({
          ...response,
          code: 'INVALID_TOKEN',
          message: 'Invalid authentication token'
        });
      } else {
        res.status(500).json({
          ...response,
          code: 'AUTH_ERROR',
          message: 'Authentication processing failed'
        });
      }
    }
  },

  requireRole: (role) => {
    return (req, res, next) => {
      if (!req.user?.role || req.user.role !== role) {
        return res.status(403).json({
          success: false,
          code: 'FORBIDDEN',
          message: `Insufficient permissions. ${role} role required`
        });
      }
      next();
    };
  },

  csrfProtection: (req, res, next) => {
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
      const csrfToken = req.headers['x-csrf-token'] || req.body._csrf;
      if (!csrfToken || csrfToken !== req.csrfToken()) {
        return res.status(403).json({
          success: false,
          code: 'CSRF_FAILED',
          message: 'CSRF token validation failed'
        });
      }
    }
    next();
  },

  generateCSRFToken: (req, res, next) => {
    res.locals.csrfToken = req.csrfToken();
    next();
  }
};
