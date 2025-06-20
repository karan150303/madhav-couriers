const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../../models/admin'); // Correct path for your structure
const { loginValidation } = require('../../validation/validation');

// Admin login
router.post('/login', async (req, res) => {
    // Validation
    const { error } = loginValidation(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    try {
        // Check if admin exists
        const admin = await Admin.findOne({ username: req.body.username });
        if (!admin) return res.status(400).send('Invalid credentials');

        // Check password
        const validPass = await bcrypt.compare(req.body.password, admin.password);
        if (!validPass) return res.status(400).send('Invalid credentials');

        // Create token
        const token = jwt.sign({ _id: admin._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.header('auth-token', token).send(token);
    } catch (err) {
        res.status(500).send('Server error');
    }
});

module.exports = router;
