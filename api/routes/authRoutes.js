const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const Admin = require('../models/admin');
const { loginValidation } = require('../validation/validation');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts',
  skipSuccessfulRequests: true
});

// Admin Login - Updated endpoint to match frontend
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

    if (admin?.lockedUntil && admin.lockedUntil > Date.now()) {
      return res.status(403).json({
        success: false,
        message: `Account locked until ${new Date(admin.lockedUntil).toLocaleTimeString()}`
      });
    }

    if (!admin) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials' 
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

      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }

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

    // Set both cookie and return token for flexibility
    res.cookie('adminToken', token, {
       httpOnly: false,
       secure: process.env.NODE_ENV === 'production',
       sameSite: 'strict',
       path: '/', // ✅ REQUIRED FIX
       maxAge: 3600000
    });

    res.json({
      success: true,
      token,
      redirect: '/admin/dashboard.html'
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Authentication failed' 
    });
  }
});

module.exports = router;
