const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../models/admin');
const { loginValidation } = require('../validation/validation');

// Admin Login
router.post('/login', async (req, res) => {
    // Validate data
    const { error } = loginValidation(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    try {
        // Check if admin exists
        const admin = await Admin.findOne({ username: req.body.username });
        if (!admin) return res.status(400).send('Username not found');

        // Check password
        const validPass = await bcrypt.compare(req.body.password, admin.password);
        if (!validPass) return res.status(400).send('Invalid password');

        // Create token
        const token = jwt.sign({ _id: admin._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.send({ 
            token,
            admin: {
                id: admin._id,
                username: admin.username
            }
        });
    } catch (err) {
        res.status(500).send('Server error');
    }
});

module.exports = router;
