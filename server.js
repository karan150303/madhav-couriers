require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

// Initialize app first
const app = express();

// Create server and Socket.io
const server = http.createServer(app);
const io = new Server(server);
app.set('io', io); // Make io accessible in routes

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// Database connection
require('./api/utils/db');

// Routes
app.use('/api/auth', require('./api/routes/authRoutes'));
app.use('/api/shipments', require('./api/routes/shipmentRoutes'));

// Frontend routes
app.get(['/', '/about', '/contact', '/rates'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Admin routes
app.get('/admin/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'login.html'));
});

app.get('/admin/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'dashboard.html'));
});

// Socket.io connection
io.on('connection', (socket) => {
  console.log('New client connected');
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
});
