require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

// Initialize Express app
const app = express();

// Create HTTP server and bind with Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins (adjust for production)
    methods: ["GET", "POST"]
  }
});

// Attach io instance to app so it's available in controllers
app.set('io', io);

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// DB Connection
require('./api/utils/db');

// API Routes
app.use('/api/auth', require('./api/routes/authRoutes'));
app.use('/api/shipments', require('./api/routes/shipmentRoutes'));

// Frontend Routes
app.get(['/', '/about', '/contact', '/rates'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Admin Panel Routes
app.get('/admin/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'login.html'));
});
app.get('/admin/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'dashboard.html'));
});

// 🔴 Socket.IO Connection
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  // Handle tracking room subscriptions
  socket.on('subscribe-to-tracking', (trackingNumber) => {
    socket.join(trackingNumber);
    console.log(`📦 Subscribed to tracking room: ${trackingNumber}`);
  });

  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
});

// Start Server
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
});
