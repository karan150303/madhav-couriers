const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const Admin = require('../models/admin');
const { loginValidation } = require('../validation/validation');

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: 'Too many login attempts, please try again later',
  skipSuccessfulRequests: true
});

// Enhanced error handler
const handleAuthError = (res, status, message, error = null) => {
  if (error) console.error('Auth Error:', error);
  return res.status(status).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { error: error?.message })
  });
};

// Admin Login
router.post('/login', authLimiter, async (req, res) => {
  try {
    // Validate request body
    const validation = loginValidation(req.body);
    if (validation.error) {
      return handleAuthError(
        res, 
        400, 
        'Validation failed',
        validation.error
      );
    }

    // Check admin existence
    const admin = await Admin.findOne({ username: req.body.username })
      .select('+password +loginAttempts +lockedUntil')
      .lean();

    // Account lock check
    if (admin?.lockedUntil && admin.lockedUntil > Date.now()) {
      return handleAuthError(
        res,
        403,
        `Account temporarily locked. Try again after ${new Date(admin.lockedUntil).toLocaleTimeString()}`
      );
    }

    // Authentication checks
    if (!admin) {
      return handleAuthError(res, 401, 'Invalid credentials');
    }

    const validPass = await bcrypt.compare(req.body.password, admin.password);
    if (!validPass) {
      // Increment failed attempts
      await Admin.findByIdAndUpdate(admin._id, {
        $inc: { loginAttempts: 1 },
        ...(admin.loginAttempts + 1 >= 5 && { 
          lockedUntil: Date.now() + 30 * 60 * 1000 // Lock for 30 minutes
        })
      });

      return handleAuthError(res, 401, 'Invalid credentials');
    }

    // Reset login attempts on successful login
    await Admin.findByIdAndUpdate(admin._id, {
      loginAttempts: 0,
      lockedUntil: null,
      lastLogin: Date.now()
    });

    // Create JWT token
    const token = jwt.sign(
      { 
        _id: admin._id,
        role: 'admin',
        username: admin.username
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '1h' }
    );

    // Set secure HTTP-only cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600000 // 1 hour
    });

    // Successful response
    res.json({
      success: true,
      token,
      data: {
        id: admin._id,
        username: admin.username,
        role: 'admin'
      },
      expiresIn: 3600 // 1 hour in seconds
    });

  } catch (err) {
    handleAuthError(res, 500, 'Authentication failed', err);
  }
});

// Admin Logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true, message: 'Logged out successfully' });
});

// Token Refresh (Protected)
router.post('/refresh', async (req, res) => {
  try {
    const token = req.cookies.token || req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return handleAuthError(res, 401, 'Authentication required');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: true });
    const newToken = jwt.sign(
      {
        _id: decoded._id,
        role: decoded.role,
        username: decoded.username
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

    res.json({
      success: true,
      token: newToken,
      expiresIn: 3600
    });

  } catch (err) {
    handleAuthError(res, 401, 'Invalid token', err);
  }
});

module.exports = router;
