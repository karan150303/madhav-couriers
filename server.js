require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

// Initialize app first
const app = express();

// Create server and Socket.io with CORS enabled
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allows all origins (adjust in production)
    methods: ["GET", "POST"]
  }
});

// Make io accessible in routes
app.set('io', io);

// Middleware (keep existing)
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// Database connection (keep existing)
require('./api/utils/db');

// Routes (keep existing)
app.use('/api/auth', require('./api/routes/authRoutes'));
app.use('/api/shipments', require('./api/routes/shipmentRoutes'));

// Frontend routes (keep existing)
app.get(['/', '/about', '/contact', '/rates'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Admin routes (keep existing)
app.get('/admin/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'login.html'));
});

app.get('/admin/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'dashboard.html'));
});

// Enhanced Socket.io connection
io.on('connection', (socket) => {
  console.log(`New client connected: ${socket.id}`);
  
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
  
  // Add this to handle initial data requests if needed
  socket.on('request-initial-data', () => {
    // You can implement this if clients need initial data load
  });
});

// Start server (keep existing)
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
});
