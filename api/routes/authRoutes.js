const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const { loginValidation } = require('../validation');

// Admin Login
router.post('/login', async (req, res) => {
    // Validate request
    const { error } = loginValidation(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    try {
        // Check if admin exists
        const admin = await Admin.findOne({ username: req.body.username });
        if (!admin) return res.status(400).json({ message: 'Invalid credentials' });

        // Check password
        const validPass = await bcrypt.compare(req.body.password, admin.password);
        if (!validPass) return res.status(400).json({ message: 'Invalid credentials' });

        // Create and assign token
        const token = jwt.sign(
            { _id: admin._id, role: 'admin' }, 
            process.env.JWT_SECRET, 
            { expiresIn: '8h' }
        );

        res.json({
            success: true,
            token,
            user: {
                id: admin._id,
                username: admin.username
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ message: 'Server error during authentication' });
    }
});

module.exports = router;
