// Add at the top
const http = require('http');
const { Server } = require('socket.io');

// Replace app.listen with:
const server = http.createServer(app);
const io = new Server(server);

// Store io instance for routes
app.set('io', io);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
});
require('dotenv').config();
const express = require('express');
const path = require('path');
const app = express();

// Basic setup
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// Database connection
require('./api/utils/db');

// Routes
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
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
});
