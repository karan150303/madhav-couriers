require('dotenv').config();
const express = require('express');
const path = require('path');
const app = express();

// 1. Basic Setup (3 lines)
app.use(express.json());
app.use(express.static('public'));
app.use('/admin', express.static('admin'));

// 2. Database Connection (1 line)
require('./api/utils/db'); // This loads your db.js

// 3. Routes (2 lines)
app.use('/api/auth', require('./api/routes/authRoutes'));
app.use('/api/shipments', require('./api/routes/shipmentRoutes'));

// 4. Page Handlers (6 lines)
app.get(['/', '/about', '/contact', '/rates'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.get('/admin/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'login.html'));
});
app.get('/admin/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'dashboard.html'));
});

// 5. Start Server (3 lines)
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
});
