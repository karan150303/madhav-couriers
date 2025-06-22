require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const morgan = require('morgan');

// Initialize Express app
const app = express();

// ======================
// SECURITY MIDDLEWARE
// ======================
app.use(helmet()); // Security headers
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE']
}));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per windowMs
  message: 'Too many requests from this IP, please try again later'
});

// ======================
// HTTP SERVER & SOCKET.IO
// ======================
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    methods: ['GET', 'POST']
  },
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
    skipMiddlewares: true
  }
});

// Attach io instance to app
app.set('io', io);

// ======================
// APPLICATION MIDDLEWARE
// ======================
app.use(morgan('combined')); // HTTP request logging
app.use(express.json({ limit: '10kb' })); // Body parser
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1d' }));
app.use('/admin', express.static(path.join(__dirname, 'admin'), { maxAge: '1d' });

// ======================
// DATABASE CONNECTION
// ======================
require('./api/utils/db').connect()
  .then(() => console.log('✅ Database connected successfully'))
  .catch(err => {
    console.error('❌ Database connection error:', err);
    process.exit(1);
  });

// ======================
// ROUTES
// ======================
// API Routes (with rate limiting)
app.use('/api/auth', apiLimiter, require('./api/routes/authRoutes'));
app.use('/api/shipments', apiLimiter, require('./api/routes/shipmentRoutes'));

// Frontend Routes
const frontendRoutes = ['/', '/about', '/contact', '/rates'];
frontendRoutes.forEach(route => {
  app.get(route, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });
});

// Admin Panel Routes
app.get('/admin/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'login.html'));
});

app.get('/admin/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'dashboard.html'));
});

// ======================
// SOCKET.IO CONFIGURATION
// ======================
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  // Authentication middleware for Socket.IO
  socket.use((packet, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication error'));
    // Add your JWT verification logic here
    next();
  });

  // Tracking updates
  socket.on('subscribe-to-tracking', (trackingNumber) => {
    if (!isValidTrackingNumber(trackingNumber)) {
      return socket.emit('error', 'Invalid tracking number');
    }
    socket.join(trackingNumber);
    console.log(`📦 Subscribed to tracking room: ${trackingNumber}`);
  });

  socket.on('disconnect', (reason) => {
    console.log(`❌ Client disconnected (${reason}): ${socket.id}`);
  });

  socket.on('error', (err) => {
    console.error(`⚠️ Socket error (${socket.id}):`, err.message);
  });
});

// Helper function for tracking number validation
function isValidTrackingNumber(trackingNumber) {
  return /^[A-Z0-9]{8,20}$/.test(trackingNumber);
}

// ======================
// ERROR HANDLING
// ======================
// 404 Handler
app.use((req, res, next) => {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('⚠️ Server error:', err.stack);
  
  // Differentiate between socket and HTTP errors
  if (req.isSocket) {
    return res.socket.emit('server-error', {
      message: 'Internal server error',
      status: 500
    });
  }

  res.status(500).json({
    status: 'error',
    message: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ======================
// SERVER STARTUP
// ======================
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on http://${HOST}:${PORT}`);
  console.log(`📡 Socket.IO running on ws://${HOST}:${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('⚠️ Unhandled Rejection:', err);
  server.close(() => process.exit(1));
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('💤 Process terminated');
    process.exit(0);
  });
});
