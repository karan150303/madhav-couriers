const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const Admin = require('../models/admin');
const { loginValidation } = require('../validation/validation');

// Rate limiter for login attempts
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: 'Too many login attempts. Please try again later.',
  skipSuccessfulRequests: true
});

// ✅ Admin Login Route
router.post('/admin/login', authLimiter, async (req, res) => {
  try {
    const validation = loginValidation(req.body);
    if (validation.error) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        error: validation.error.details
      });
    }

    const admin = await Admin.findOne({ username: req.body.username })
      .select('+password +loginAttempts +lockedUntil');

    if (!admin) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (admin.lockedUntil && admin.lockedUntil > Date.now()) {
      return res.status(403).json({
        success: false,
        message: `Account locked until ${new Date(admin.lockedUntil).toLocaleTimeString()}`
      });
    }

    const validPass = await bcrypt.compare(req.body.password, admin.password);
    if (!validPass) {
      await Admin.findByIdAndUpdate(admin._id, {
        $inc: { loginAttempts: 1 },
        ...(admin.loginAttempts + 1 >= 5 && {
          lockedUntil: Date.now() + 30 * 60 * 1000
        })
      });
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Reset attempts after successful login
    await Admin.findByIdAndUpdate(admin._id, {
      loginAttempts: 0,
      lockedUntil: null,
      lastLogin: Date.now()
    });

    const token = jwt.sign(
      {
        _id: admin._id,
        role: 'admin'
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // ✅ Set cookie securely with better compatibility
    res.cookie('adminToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax', // was 'Strict', changed for better redirect behavior
      maxAge: 3600000
    });

    console.log('✅ Login successful. Token set in cookie.');

    res.json({
      success: true,
      token,
      redirect: '/admin/dashboard.html'
    });

  } catch (err) {
    console.error('❌ Login error:', err);
    res.status(500).json({
      success: false,
      message: 'Authentication failed'
    });
  }
});

// ✅ Admin Token Verification Route
router.get('/verify', (req, res) => {
  const token = req.cookies?.adminToken;

  if (!token) {
    console.log('🔒 No token in cookie');
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ Token verified:', decoded);
    return res.status(200).json({ success: true, admin: decoded });
  } catch (err) {
    console.log('❌ Invalid token:', err.message);
    res.clearCookie('adminToken');
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
});

module.exports = router;
