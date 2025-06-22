const jwt = require('jsonwebtoken');
const Admin = require('../models/admin');

module.exports = {
  // Authentication middleware
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

      // Token renewal if expiring soon (within 15 minutes)
      if (decoded.exp - Date.now() / 1000 < 900) {
        const newToken = jwt.sign(
          {
            _id: admin._id,
            role: 'admin',
            username: admin.username
          },
          process.env.JWT_SECRET,
          { expiresIn: process.env.JWT_EXPIRE || '1h' }
        );

        res.cookie('token', newToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 3600000
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

  // Role-based access control
  requireRole: (role) => {
    return (req, res, next) => {
      if (req.user?.role !== role) {
        return res.status(403).json({
          success: false,
          code: 'FORBIDDEN',
          message: `Insufficient permissions. ${role} role required`
        });
      }
      next();
    };
  },

  // CSRF protection middleware
  csrfProtection: (req, res, next) => {
    if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
      const csrfToken = req.headers['x-csrf-token'] || req.body._csrf;
      if (!csrfToken || csrfToken !== req.cookies._csrf) {
        return res.status(403).json({
          success: false,
          code: 'CSRF_FAILED',
          message: 'CSRF token validation failed'
        });
      }
    }
    next();
  }
};
