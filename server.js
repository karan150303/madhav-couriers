require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();

// Basic setup
app.use(express.json());
app.use(express.static('public'));
app.use('/admin', express.static('admin'));

// Connect database (using your existing db.js)
require('./api/utils/db');

// Routes (using your existing route files)
app.use('/api/auth', require('./api/routes/authRoutes'));
app.use('/api/shipments', require('./api/routes/shipmentRoutes'));

// Frontend pages
app.get(['/', '/about', '/contact', '/rates'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Admin pages
app.get('/admin/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'login.html'));
});

app.get('/admin/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'dashboard.html'));
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
